import {
  GrowthFocusKind,
  GrowthFocusStatus,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  evaluateFocusCredit,
  type CompleteGrowthFocusRequest,
  type GrowthFocusSessionDto,
  type GrowthFocusStatsDto,
  type StartGrowthFocusRequest,
} from '@furniture-erp/shared';
import type { GrowthFocusSession, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { focusXpAmount, tryAwardXp } from './personal-growth-xp.service.js';

type DbClient = Pick<
  PrismaClient,
  'workspace' | 'growthFocusSession' | 'growthTodo'
>;

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

type SessionRow = GrowthFocusSession & { todo?: { id: string; title: string } | null };

function toDto(row: SessionRow): GrowthFocusSessionDto {
  return {
    id: row.id,
    kind: row.kind as GrowthFocusKind,
    status: row.status as GrowthFocusStatus,
    plannedMinutes: row.plannedMinutes,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    durationSeconds: row.durationSeconds,
    creditedMinutes: row.creditedMinutes,
    discardReason: row.discardReason,
    todoId: row.todoId,
    todoTitle: row.todo?.title ?? null,
    linkedGoalId: row.linkedGoalId,
    createdAt: row.createdAt.toISOString(),
  };
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

async function sumCreditedMinutes(
  workspaceId: string,
  from: Date,
  to: Date,
  db: DbClient,
): Promise<number> {
  const rows = await db.growthFocusSession.findMany({
    where: {
      workspaceId,
      kind: GrowthFocusKind.FOCUS,
      status: { in: [GrowthFocusStatus.COMPLETED, GrowthFocusStatus.INTERRUPTED] },
      startedAt: { gte: from, lte: to },
      creditedMinutes: { gt: 0 },
    },
    select: { creditedMinutes: true },
  });
  return rows.reduce((sum, row) => sum + row.creditedMinutes, 0);
}

export async function getActiveFocusSession(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthFocusSessionDto | null> {
  await assertPersonalWorkspace(workspaceId, db);
  const row = await db.growthFocusSession.findFirst({
    where: { workspaceId, identityId, status: GrowthFocusStatus.RUNNING },
    include: { todo: { select: { id: true, title: true } } },
    orderBy: { startedAt: 'desc' },
  });
  return row ? toDto(row) : null;
}

export async function getFocusStats(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFocusStatsDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const [todayMinutes, weekMinutes, monthMinutes, todaySessions, activeSession] =
    await Promise.all([
      sumCreditedMinutes(workspaceId, todayStart, todayEnd, db),
      sumCreditedMinutes(workspaceId, weekStart(now), todayEnd, db),
      sumCreditedMinutes(workspaceId, monthStart(now), todayEnd, db),
      db.growthFocusSession.count({
        where: {
          workspaceId,
          kind: GrowthFocusKind.FOCUS,
          status: { in: [GrowthFocusStatus.COMPLETED, GrowthFocusStatus.INTERRUPTED] },
          startedAt: { gte: todayStart, lte: todayEnd },
          creditedMinutes: { gt: 0 },
        },
      }),
      getActiveFocusSession(workspaceId, identityId, db),
    ]);

  return {
    todayMinutes,
    weekMinutes,
    monthMinutes,
    todaySessions,
    activeSession,
  };
}

export async function startFocusSession(
  workspaceId: string,
  identityId: string,
  body: StartGrowthFocusRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFocusSessionDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const plannedMinutes = Math.floor(body.plannedMinutes);
  if (!Number.isFinite(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 90) {
    throw ApiError.badRequest('Fokus 1–90 daqiqa oralig‘ida bo‘lsin');
  }

  const existing = await db.growthFocusSession.findFirst({
    where: { workspaceId, identityId, status: GrowthFocusStatus.RUNNING },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict('Avvalgi fokus sessiyani tugating');
  }

  let todoId: string | null = body.todoId ?? null;
  if (todoId) {
    const todo = await db.growthTodo.findFirst({
      where: { id: todoId, workspaceId },
      select: { id: true },
    });
    if (!todo) throw ApiError.badRequest('Vazifa topilmadi');
  }

  const row = await db.growthFocusSession.create({
    data: {
      workspaceId,
      identityId,
      todoId,
      linkedGoalId: body.linkedGoalId ?? null,
      kind: body.kind ?? GrowthFocusKind.FOCUS,
      status: GrowthFocusStatus.RUNNING,
      plannedMinutes,
      startedAt: now,
    },
    include: { todo: { select: { id: true, title: true } } },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_FOCUS_STARTED',
    entityType: 'GROWTH_FOCUS_SESSION',
    entityId: row.id,
    summary: `Focus session started (${plannedMinutes}m)`,
    metadata: { workspaceId, identityId, todoId, kind: row.kind },
  });

  return toDto(row);
}

export async function completeFocusSession(
  workspaceId: string,
  identityId: string,
  sessionId: string,
  body: CompleteGrowthFocusRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFocusSessionDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const existing = await db.growthFocusSession.findFirst({
    where: { id: sessionId, workspaceId, identityId },
    include: { todo: { select: { id: true, title: true } } },
  });
  if (!existing) throw ApiError.notFound('Fokus sessiyasi topilmadi');
  if (existing.status !== GrowthFocusStatus.RUNNING) {
    throw ApiError.badRequest('Sessiya allaqachon yakunlangan');
  }

  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const alreadyCreditedTodayMinutes = await sumCreditedMinutes(
    workspaceId,
    todayStart,
    todayEnd,
    db,
  );

  const credit = evaluateFocusCredit({
    plannedMinutes: existing.plannedMinutes,
    startedAt: existing.startedAt,
    endedAt: now,
    interrupted: Boolean(body.interrupted),
    alreadyCreditedTodayMinutes,
    clientReportedSeconds: body.clientReportedSeconds,
    isBreak: existing.kind === GrowthFocusKind.BREAK,
  });

  const row = await db.growthFocusSession.update({
    where: { id: existing.id },
    data: {
      status: credit.status,
      endedAt: now,
      durationSeconds: credit.durationSeconds,
      creditedMinutes: credit.creditedMinutes,
      clientReportedSeconds:
        body.clientReportedSeconds === undefined ? null : body.clientReportedSeconds,
      discardReason: credit.discardReason,
    },
    include: { todo: { select: { id: true, title: true } } },
  });

  if (
    credit.creditedMinutes > 0 &&
    existing.todoId &&
    existing.kind === GrowthFocusKind.FOCUS
  ) {
    await db.growthTodo.updateMany({
      where: { id: existing.todoId, workspaceId },
      data: { actualMinutes: { increment: credit.creditedMinutes } },
    });
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_FOCUS_COMPLETED',
    entityType: 'GROWTH_FOCUS_SESSION',
    entityId: row.id,
    summary: `Focus session ${credit.status.toLowerCase()} (+${credit.creditedMinutes}m)`,
    metadata: {
      workspaceId,
      identityId,
      creditedMinutes: credit.creditedMinutes,
      discardReason: credit.discardReason,
    },
  });

  if (
    credit.creditedMinutes > 0 &&
    existing.kind === GrowthFocusKind.FOCUS &&
    credit.status !== GrowthFocusStatus.DISCARDED
  ) {
    await tryAwardXp({
      workspaceId,
      identityId,
      source: GrowthXpSource.FOCUS_COMPLETED,
      sourceEntityId: row.id,
      amount: focusXpAmount(credit.creditedMinutes),
      summary: `Focus +${credit.creditedMinutes}m`,
    });
  }

  return toDto(row);
}
