import {
  GrowthFocusStatus,
  GrowthLearningCategory,
  GrowthLearningGoalStatus,
  GrowthXpSource,
  MAX_MILESTONES_PER_GOAL,
  WorkspaceStatus,
  WorkspaceType,
  computeLearningProgress,
  evaluateLearningCredit,
  type CreateGrowthLearningGoalRequest,
  type CreateGrowthLearningMilestoneRequest,
  type GrowthLearningGoalDto,
  type GrowthLearningListResponse,
  type GrowthLearningMilestoneDto,
  type GrowthLearningSessionDto,
  type GrowthLearningStatsResponse,
  type LogGrowthLearningSessionRequest,
  type UpdateGrowthLearningGoalRequest,
} from '@furniture-erp/shared';
import type {
  GrowthLearningGoal,
  GrowthLearningMilestone,
  GrowthLearningSession,
  PrismaClient,
} from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { learningXpAmount, tryAwardXp } from './personal-growth-xp.service.js';
import { assertGrowthQuota } from './personal-growth-premium.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  growthLearningGoal: {
    findMany: PrismaClient['growthLearningGoal']['findMany'];
    findFirst: PrismaClient['growthLearningGoal']['findFirst'];
    findFirstOrThrow: PrismaClient['growthLearningGoal']['findFirstOrThrow'];
    count: PrismaClient['growthLearningGoal']['count'];
    create: PrismaClient['growthLearningGoal']['create'];
    update: PrismaClient['growthLearningGoal']['update'];
  };
  growthLearningMilestone: PrismaClient['growthLearningMilestone'];
  growthLearningSession: PrismaClient['growthLearningSession'];
};

type GoalRow = GrowthLearningGoal & { milestones?: GrowthLearningMilestone[] };

async function assertPersonalWorkspace(workspaceId: string, db: DbClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

function toMilestoneDto(row: GrowthLearningMilestone): GrowthLearningMilestoneDto {
  return {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    targetValue: row.targetValue,
    isReached: row.isReached,
    reachedAt: row.reachedAt ? row.reachedAt.toISOString() : null,
    sortOrder: row.sortOrder,
  };
}

function toGoalDto(row: GoalRow): GrowthLearningGoalDto {
  const milestones = (row.milestones ?? []).map(toMilestoneDto);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as GrowthLearningCategory,
    status: row.status as GrowthLearningGoalStatus,
    targetValue: row.targetValue,
    targetUnit: row.targetUnit,
    currentValue: row.currentValue,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    totalStudyMinutes: row.totalStudyMinutes,
    progressPercent: computeLearningProgress({
      targetValue: row.targetValue,
      currentValue: row.currentValue,
      totalStudyMinutes: row.totalStudyMinutes,
      targetUnit: row.targetUnit,
    }),
    sortOrder: row.sortOrder,
    milestones,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSessionDto(
  row: GrowthLearningSession & { goal?: { id: string; title: string } | null },
): GrowthLearningSessionDto {
  return {
    id: row.id,
    goalId: row.goalId,
    goalTitle: row.goal?.title ?? null,
    status: row.status as GrowthFocusStatus,
    plannedMinutes: row.plannedMinutes,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    durationSeconds: row.durationSeconds,
    creditedMinutes: row.creditedMinutes,
    note: row.note,
    discardReason: row.discardReason,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseOptionalInstant(value: string | null | undefined, field: string): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`${field} noto‘g‘ri`);
  return date;
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  return { start, end };
}

function weekStart(now: Date): Date {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const dow = day.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  day.setUTCDate(day.getUTCDate() + mondayOffset);
  return day;
}

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

async function sumStudyMinutes(
  workspaceId: string,
  from: Date,
  to: Date,
  db: DbClient,
): Promise<number> {
  const rows = await db.growthLearningSession.findMany({
    where: {
      workspaceId,
      status: GrowthFocusStatus.COMPLETED,
      startedAt: { gte: from, lte: to },
      creditedMinutes: { gt: 0 },
    },
    select: { creditedMinutes: true },
  });
  return rows.reduce((sum, row) => sum + row.creditedMinutes, 0);
}

async function syncMilestones(
  goal: GrowthLearningGoal,
  db: DbClient,
  now: Date,
  identityId?: string,
): Promise<void> {
  const milestones = await db.growthLearningMilestone.findMany({
    where: { goalId: goal.id, isReached: false },
  });
  const studyHours = goal.totalStudyMinutes / 60;
  const unit = goal.targetUnit.toLowerCase();
  for (const milestone of milestones) {
    const reached =
      unit === 'hours' || unit === 'hour' || unit === 'soat'
        ? studyHours + 1e-9 >= milestone.targetValue
        : unit === 'minutes' || unit === 'minute' || unit === 'daq'
          ? goal.totalStudyMinutes + 1e-9 >= milestone.targetValue
          : goal.currentValue + 1e-9 >= milestone.targetValue;
    if (reached) {
      await db.growthLearningMilestone.update({
        where: { id: milestone.id },
        data: { isReached: true, reachedAt: now },
      });
      if (identityId) {
        await tryAwardXp({
          workspaceId: goal.workspaceId,
          identityId,
          source: GrowthXpSource.MILESTONE_REACHED,
          sourceEntityId: milestone.id,
          summary: `Milestone: ${milestone.title}`,
        });
      }
    }
  }
}

export async function listLearningGoals(
  workspaceId: string,
  opts: { includeArchived?: boolean } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthLearningListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const { start } = dayBounds(now);
  const weekFrom = weekStart(now);

  const items = await db.growthLearningGoal.findMany({
    where: {
      workspaceId,
      ...(opts.includeArchived
        ? {}
        : { status: { not: GrowthLearningGoalStatus.ARCHIVED } }),
    },
    include: { milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const [todayStudyMinutes, weekStudyMinutes] = await Promise.all([
    sumStudyMinutes(workspaceId, start, now, db),
    sumStudyMinutes(workspaceId, weekFrom, now, db),
  ]);

  const dtos = items.map(toGoalDto);
  return {
    items: dtos,
    activeCount: dtos.filter((g) => g.status === GrowthLearningGoalStatus.ACTIVE).length,
    todayStudyMinutes,
    weekStudyMinutes,
  };
}

export async function getLearningStats(
  workspaceId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthLearningStatsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const { start } = dayBounds(now);
  const [todayMinutes, weekMinutes, monthMinutes, activeGoals, completedGoals] =
    await Promise.all([
      sumStudyMinutes(workspaceId, start, now, db),
      sumStudyMinutes(workspaceId, weekStart(now), now, db),
      sumStudyMinutes(workspaceId, monthStart(now), now, db),
      db.growthLearningGoal.count({
        where: { workspaceId, status: GrowthLearningGoalStatus.ACTIVE },
      }),
      db.growthLearningGoal.count({
        where: { workspaceId, status: GrowthLearningGoalStatus.COMPLETED },
      }),
    ]);
  return { todayMinutes, weekMinutes, monthMinutes, activeGoals, completedGoals };
}

export async function createLearningGoal(
  workspaceId: string,
  identityId: string,
  body: CreateGrowthLearningGoalRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthLearningGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const activeCount = await db.growthLearningGoal.count({
    where: {
      workspaceId,
      status: {
        in: [GrowthLearningGoalStatus.ACTIVE, GrowthLearningGoalStatus.PAUSED],
      },
    },
  });
  await assertGrowthQuota(workspaceId, identityId, 'activeLearningGoals', activeCount);

  if (!(body.targetValue > 0) || body.targetValue > 1_000_000) {
    throw ApiError.badRequest('targetValue noto‘g‘ri');
  }

  const milestones = (body.milestones ?? []).slice(0, MAX_MILESTONES_PER_GOAL);
  const row = await db.growthLearningGoal.create({
    data: {
      workspaceId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category ?? GrowthLearningCategory.CUSTOM,
      targetValue: body.targetValue,
      targetUnit: (body.targetUnit?.trim() || 'score').slice(0, 40),
      currentValue: body.currentValue ?? 0,
      deadline: parseOptionalInstant(body.deadline, 'deadline'),
      milestones: {
        create: milestones.map((m, index) => ({
          workspaceId,
          title: m.title.trim(),
          targetValue: m.targetValue,
          sortOrder: index,
        })),
      },
    },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_LEARNING_GOAL_CREATED',
    entityType: 'GROWTH_LEARNING_GOAL',
    entityId: row.id,
    summary: `Learning goal created: ${row.title}`,
    metadata: { workspaceId, category: row.category },
  });

  return toGoalDto(row);
}

export async function updateLearningGoal(
  workspaceId: string,
  goalId: string,
  body: UpdateGrowthLearningGoalRequest,
  identityId?: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthLearningGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.growthLearningGoal.findFirst({
    where: { id: goalId, workspaceId },
  });
  if (!existing) throw ApiError.notFound('O‘qish maqsadi topilmadi');

  const updated = await db.growthLearningGoal.update({
    where: { id: goalId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.targetValue !== undefined ? { targetValue: body.targetValue } : {}),
      ...(body.targetUnit !== undefined
        ? { targetUnit: body.targetUnit.trim().slice(0, 40) || 'score' }
        : {}),
      ...(body.currentValue !== undefined ? { currentValue: body.currentValue } : {}),
      ...(body.deadline !== undefined
        ? { deadline: parseOptionalInstant(body.deadline, 'deadline') }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  if (body.currentValue !== undefined) {
    await syncMilestones(updated, db, now, identityId);
  }

  const fresh = await db.growthLearningGoal.findFirstOrThrow({
    where: { id: goalId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_LEARNING_GOAL_UPDATED',
    entityType: 'GROWTH_LEARNING_GOAL',
    entityId: goalId,
    summary: `Learning goal updated: ${fresh.title}`,
    metadata: { workspaceId },
  });

  return toGoalDto(fresh);
}

export async function addLearningMilestone(
  workspaceId: string,
  goalId: string,
  body: CreateGrowthLearningMilestoneRequest,
  identityId?: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthLearningGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const goal = await db.growthLearningGoal.findFirst({
    where: { id: goalId, workspaceId },
    include: { milestones: true },
  });
  if (!goal) throw ApiError.notFound('O‘qish maqsadi topilmadi');
  if (goal.milestones.length >= MAX_MILESTONES_PER_GOAL) {
    throw ApiError.badRequest(`Milestone ${MAX_MILESTONES_PER_GOAL} tadan oshmasin`);
  }

  await db.growthLearningMilestone.create({
    data: {
      workspaceId,
      goalId,
      title: body.title.trim(),
      targetValue: body.targetValue,
      sortOrder: goal.milestones.length,
    },
  });
  await syncMilestones(goal, db, now, identityId);

  const fresh = await db.growthLearningGoal.findFirstOrThrow({
    where: { id: goalId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });
  return toGoalDto(fresh);
}

export async function logLearningSession(
  workspaceId: string,
  identityId: string,
  body: LogGrowthLearningSessionRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<{ session: GrowthLearningSessionDto; goal: GrowthLearningGoalDto | null }> {
  await assertPersonalWorkspace(workspaceId, db);

  let goal: GrowthLearningGoal | null = null;
  if (body.goalId) {
    goal = await db.growthLearningGoal.findFirst({
      where: { id: body.goalId, workspaceId },
    });
    if (!goal) throw ApiError.notFound('O‘qish maqsadi topilmadi');
    if (
      goal.status === GrowthLearningGoalStatus.ARCHIVED ||
      goal.status === GrowthLearningGoalStatus.COMPLETED
    ) {
      throw ApiError.badRequest('Yopilgan maqsadga dars yozib bo‘lmaydi');
    }
  }

  const minutes = Math.floor(body.minutes);
  if (!(minutes >= 1) || minutes > 240) {
    throw ApiError.badRequest('Daqiqalar 1–240 oralig‘ida bo‘lsin');
  }

  const endedAt = now;
  const startedAt =
    parseOptionalInstant(body.startedAt, 'startedAt') ??
    new Date(endedAt.getTime() - minutes * 60_000);

  const { start } = dayBounds(now);
  const alreadyToday = await sumStudyMinutes(workspaceId, start, now, db);
  const credit = evaluateLearningCredit({
    startedAt,
    endedAt,
    plannedMinutes: minutes,
    claimedMinutes: minutes,
    alreadyCreditedTodayMinutes: alreadyToday,
  });

  const row = await db.growthLearningSession.create({
    data: {
      workspaceId,
      identityId,
      goalId: goal?.id ?? null,
      status:
        credit.status === 'COMPLETED'
          ? GrowthFocusStatus.COMPLETED
          : GrowthFocusStatus.DISCARDED,
      plannedMinutes: minutes,
      startedAt,
      endedAt,
      durationSeconds: credit.durationSeconds,
      creditedMinutes: credit.creditedMinutes,
      note: body.note?.trim() || null,
      discardReason: credit.discardReason,
    },
    include: { goal: { select: { id: true, title: true } } },
  });

  let goalDto: GrowthLearningGoalDto | null = null;
  if (goal && credit.creditedMinutes > 0) {
    const updated = await db.growthLearningGoal.update({
      where: { id: goal.id },
      data: { totalStudyMinutes: { increment: credit.creditedMinutes } },
    });
    await syncMilestones(updated, db, now, identityId);
    const fresh = await db.growthLearningGoal.findFirstOrThrow({
      where: { id: goal.id },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    });
    goalDto = toGoalDto(fresh);
  } else if (goal) {
    const fresh = await db.growthLearningGoal.findFirst({
      where: { id: goal.id },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    });
    goalDto = fresh ? toGoalDto(fresh) : null;
  }

  if (credit.creditedMinutes > 0) {
    await tryAwardXp({
      workspaceId,
      identityId,
      source: GrowthXpSource.LEARNING_SESSION,
      sourceEntityId: row.id,
      amount: learningXpAmount(credit.creditedMinutes),
      summary: `Study +${credit.creditedMinutes}m`,
    });
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_LEARNING_SESSION_LOGGED',
    entityType: 'GROWTH_LEARNING_SESSION',
    entityId: row.id,
    summary: `Learning session +${credit.creditedMinutes}m`,
    metadata: {
      workspaceId,
      identityId,
      goalId: goal?.id ?? null,
      discardReason: credit.discardReason,
    },
  });

  return { session: toSessionDto(row), goal: goalDto };
}
