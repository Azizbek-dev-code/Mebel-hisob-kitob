import {
  ExpenseStatus,
  GrowthFocusKind,
  GrowthTodoStatus,
  PersonalEntryType,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  XP_FINANCE_REVIEW,
  currentWeekStart,
  currentYearMonth,
  isValidDayKey,
  isValidYearMonth,
  levelFromTotalXp,
  monthEndDayKey,
  monthStartDayKey,
  parseDayKey,
  weekEndDayKey,
  weekStartDayKey,
  type GrowthMonthlyReportDto,
  type GrowthPeriodMetricsDto,
  type GrowthWeeklyReviewDto,
  type UpsertGrowthMonthlyReportRequest,
  type UpsertGrowthWeeklyReviewRequest,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryAwardXp } from './personal-growth-xp.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  growthWeeklyReview: PrismaClient['growthWeeklyReview'];
  growthMonthlyReport: PrismaClient['growthMonthlyReport'];
  growthFocusSession: PrismaClient['growthFocusSession'];
  growthLearningSession: PrismaClient['growthLearningSession'];
  growthTodo: PrismaClient['growthTodo'];
  growthHabitCheckIn: PrismaClient['growthHabitCheckIn'];
  growthDailyGoal: PrismaClient['growthDailyGoal'];
  growthXpEvent: PrismaClient['growthXpEvent'];
  growthProgress: PrismaClient['growthProgress'];
  personalEntry: PrismaClient['personalEntry'];
};

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

function rangeBounds(startDayKey: string, endDayKey: string): { start: Date; end: Date } {
  return {
    start: parseDayKey(startDayKey),
    end: new Date(`${endDayKey}T23:59:59.999Z`),
  };
}

function clipText(value: string | null | undefined, max = 1000): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

async function computePeriodMetrics(
  workspaceId: string,
  identityId: string,
  startDayKey: string,
  endDayKey: string,
  db: DbClient,
): Promise<GrowthPeriodMetricsDto> {
  const { start, end } = rangeBounds(startDayKey, endDayKey);

  const [
    focusRows,
    learningRows,
    tasksCompleted,
    habitCheckIns,
    dailyGoalsDone,
    xpAgg,
    xpBefore,
    progress,
    incomeAgg,
    expenseAgg,
  ] = await Promise.all([
    db.growthFocusSession.findMany({
      where: {
        workspaceId,
        identityId,
        kind: GrowthFocusKind.FOCUS,
        creditedMinutes: { gt: 0 },
        startedAt: { gte: start, lte: end },
      },
      select: { creditedMinutes: true },
    }),
    db.growthLearningSession.findMany({
      where: {
        workspaceId,
        identityId,
        creditedMinutes: { gt: 0 },
        startedAt: { gte: start, lte: end },
      },
      select: { creditedMinutes: true },
    }),
    db.growthTodo.count({
      where: {
        workspaceId,
        status: GrowthTodoStatus.DONE,
        completedAt: { gte: start, lte: end },
      },
    }),
    db.growthHabitCheckIn.count({
      where: {
        workspaceId,
        dayKey: { gte: startDayKey, lte: endDayKey },
      },
    }),
    db.growthDailyGoal.count({
      where: {
        workspaceId,
        isDone: true,
        dayKey: { gte: startDayKey, lte: endDayKey },
      },
    }),
    db.growthXpEvent.aggregate({
      where: {
        workspaceId,
        identityId,
        dayKey: { gte: startDayKey, lte: endDayKey },
      },
      _sum: { amount: true },
    }),
    db.growthXpEvent.aggregate({
      where: {
        workspaceId,
        identityId,
        dayKey: { lt: startDayKey },
      },
      _sum: { amount: true },
    }),
    db.growthProgress.findUnique({
      where: { workspaceId },
      select: { currentStreak: true, bestStreak: true, totalXp: true, level: true },
    }),
    db.personalEntry.aggregate({
      where: {
        workspaceId,
        type: PersonalEntryType.INCOME,
        status: ExpenseStatus.ACTIVE,
        occurredAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    db.personalEntry.aggregate({
      where: {
        workspaceId,
        type: PersonalEntryType.EXPENSE,
        status: ExpenseStatus.ACTIVE,
        occurredAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const focusMinutes = focusRows.reduce((s, r) => s + r.creditedMinutes, 0);
  const studyMinutes = learningRows.reduce((s, r) => s + r.creditedMinutes, 0);
  const xpEarned = xpAgg._sum.amount ?? 0;
  const xpBeforeTotal = xpBefore._sum.amount ?? 0;
  const levelStart = levelFromTotalXp(xpBeforeTotal);
  const levelEnd = levelFromTotalXp(xpBeforeTotal + xpEarned);
  const incomeSom = Number(incomeAgg._sum.amount ?? 0n);
  const expenseSom = Number(expenseAgg._sum.amount ?? 0n);

  return {
    studyMinutes,
    focusMinutes,
    tasksCompleted,
    habitCheckIns,
    dailyGoalsDone,
    xpEarned,
    currentStreak: progress?.currentStreak ?? 0,
    bestStreak: progress?.bestStreak ?? 0,
    levelStart,
    levelEnd,
    finance: {
      incomeSom,
      expenseSom,
      netSom: incomeSom - expenseSom,
    },
  };
}

export async function getWeeklyReview(
  workspaceId: string,
  identityId: string,
  weekStart?: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthWeeklyReviewDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const raw = weekStart?.trim() || currentWeekStart(now);
  if (!isValidDayKey(raw)) throw ApiError.badRequest('weekStart noto‘g‘ri');
  const startKey = weekStartDayKey(raw);
  const endKey = weekEndDayKey(startKey);

  const [metrics, row] = await Promise.all([
    computePeriodMetrics(workspaceId, identityId, startKey, endKey, db),
    db.growthWeeklyReview.findUnique({
      where: {
        workspaceId_weekStartDayKey: { workspaceId, weekStartDayKey: startKey },
      },
    }),
  ]);

  return {
    weekStartDayKey: startKey,
    weekEndDayKey: endKey,
    metrics,
    reflection: {
      wentWell: row?.wentWell ?? null,
      wasHard: row?.wasHard ?? null,
      nextWeekChange: row?.nextWeekChange ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    },
  };
}

export async function upsertWeeklyReview(
  workspaceId: string,
  identityId: string,
  body: UpsertGrowthWeeklyReviewRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthWeeklyReviewDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const raw = body.weekStartDayKey?.trim() || currentWeekStart(now);
  if (!isValidDayKey(raw)) throw ApiError.badRequest('weekStart noto‘g‘ri');
  const startKey = weekStartDayKey(raw);

  await db.growthWeeklyReview.upsert({
    where: {
      workspaceId_weekStartDayKey: { workspaceId, weekStartDayKey: startKey },
    },
    create: {
      workspaceId,
      identityId,
      weekStartDayKey: startKey,
      wentWell: clipText(body.wentWell),
      wasHard: clipText(body.wasHard),
      nextWeekChange: clipText(body.nextWeekChange),
    },
    update: {
      ...(body.wentWell !== undefined ? { wentWell: clipText(body.wentWell) } : {}),
      ...(body.wasHard !== undefined ? { wasHard: clipText(body.wasHard) } : {}),
      ...(body.nextWeekChange !== undefined
        ? { nextWeekChange: clipText(body.nextWeekChange) }
        : {}),
    },
  });

  await tryAwardXp({
    workspaceId,
    identityId,
    source: GrowthXpSource.FINANCE_DISCIPLINE,
    sourceEntityId: `finance-review-week:${startKey}`,
    amount: XP_FINANCE_REVIEW,
    summary: 'Weekly review',
  });

  return getWeeklyReview(workspaceId, identityId, startKey, db, now);
}

export async function getMonthlyReport(
  workspaceId: string,
  identityId: string,
  yearMonth?: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthMonthlyReportDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const ym = yearMonth?.trim() || currentYearMonth(now);
  if (!isValidYearMonth(ym)) throw ApiError.badRequest('yearMonth noto‘g‘ri');
  const startKey = monthStartDayKey(ym);
  const endKey = monthEndDayKey(ym);

  const [metrics, row] = await Promise.all([
    computePeriodMetrics(workspaceId, identityId, startKey, endKey, db),
    db.growthMonthlyReport.findUnique({
      where: { workspaceId_yearMonth: { workspaceId, yearMonth: ym } },
    }),
  ]);

  return {
    yearMonth: ym,
    startDayKey: startKey,
    endDayKey: endKey,
    metrics,
    reflection: {
      highlight: row?.highlight ?? null,
      lesson: row?.lesson ?? null,
      nextMonthIntent: row?.nextMonthIntent ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    },
  };
}

export async function upsertMonthlyReport(
  workspaceId: string,
  identityId: string,
  body: UpsertGrowthMonthlyReportRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthMonthlyReportDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const ym = body.yearMonth?.trim() || currentYearMonth(now);
  if (!isValidYearMonth(ym)) throw ApiError.badRequest('yearMonth noto‘g‘ri');

  await db.growthMonthlyReport.upsert({
    where: { workspaceId_yearMonth: { workspaceId, yearMonth: ym } },
    create: {
      workspaceId,
      identityId,
      yearMonth: ym,
      highlight: clipText(body.highlight),
      lesson: clipText(body.lesson),
      nextMonthIntent: clipText(body.nextMonthIntent),
    },
    update: {
      ...(body.highlight !== undefined ? { highlight: clipText(body.highlight) } : {}),
      ...(body.lesson !== undefined ? { lesson: clipText(body.lesson) } : {}),
      ...(body.nextMonthIntent !== undefined
        ? { nextMonthIntent: clipText(body.nextMonthIntent) }
        : {}),
    },
  });

  await tryAwardXp({
    workspaceId,
    identityId,
    source: GrowthXpSource.FINANCE_DISCIPLINE,
    sourceEntityId: `finance-review-month:${ym}`,
    amount: XP_FINANCE_REVIEW,
    summary: 'Monthly review',
  });

  return getMonthlyReport(workspaceId, identityId, ym, db, now);
}
