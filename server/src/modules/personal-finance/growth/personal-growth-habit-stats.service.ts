import {
  DEFAULT_HABIT_TIMEZONE,
  GrowthHabitProgressPeriod,
  MIN_BROKEN_SAMPLE,
  MIN_WEEKDAY_SAMPLE,
  WorkspaceStatus,
  WorkspaceType,
  addDayKey,
  bestTimeFromHours,
  buildHabitStatistics,
  buildInsights,
  buildRecommendations,
  hourInTimeZone,
  mergeCalendars,
  mergeOverallKpi,
  pairCorrelation,
  resolveProgressRange,
  weekdayCompletion,
  type HabitAnalyticsDto,
  type GrowthHabitProgressPeriod as HabitProgressPeriod,
  type HabitProgressResponse,
  type HabitStatisticsDto,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

import {
  resolveHabitTimezone,
  sliceFromHabit,
  todayKeyFor,
  versionsFromRows,
} from './personal-growth-habits.helpers.js';

type DbClient = Pick<
  PrismaClient,
  | 'workspace'
  | 'growthHabit'
  | 'growthHabitCheckIn'
  | 'growthHabitLog'
  | 'growthHabitConfigVersion'
  | 'personalProfile'
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

async function timezoneOf(workspaceId: string, db: DbClient): Promise<string> {
  const profile = await db.personalProfile?.findUnique?.({
    where: { workspaceId },
    select: { timezone: true },
  });
  return resolveHabitTimezone(profile?.timezone ?? DEFAULT_HABIT_TIMEZONE);
}

export async function getHabitStatistics(
  workspaceId: string,
  habitId: string,
  query: { from?: string; to?: string; period?: HabitProgressPeriod } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<HabitStatisticsDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await timezoneOf(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await db.growthHabit.findFirst({ where: { id: habitId, workspaceId } });
  if (!habit) throw ApiError.notFound('Odat topilmadi');

  const range = resolveProgressRange({
    period: query.period ?? GrowthHabitProgressPeriod.MONTH,
    todayKey,
    from: query.from,
    to: query.to,
  });
  const from = query.from || range.from;
  const to = query.to || range.to;

  const [versions, checkIns] = await Promise.all([
    db.growthHabitConfigVersion.findMany({
      where: { habitId },
      orderBy: { effectiveFrom: 'asc' },
    }),
    db.growthHabitCheckIn.findMany({
      where: { habitId, workspaceId, dayKey: { gte: from, lte: to } },
      select: { dayKey: true, value: true, skipped: true, goalValueSnapshot: true },
    }),
  ]);

  const fallback = sliceFromHabit(habit);
  const built = buildHabitStatistics({
    fallback,
    versions: versionsFromRows(versions, fallback),
    records: checkIns.map((row) => ({
      dayKey: row.dayKey,
      value: row.value,
      skipped: row.skipped,
      goalValue: row.goalValueSnapshot,
    })),
    from,
    to,
    todayKey,
  });

  return {
    habitId: habit.id,
    from,
    to,
    todayKey,
    timezone,
    kpi: built.kpi,
    calendar: built.calendar,
    trend: built.trend,
  };
}

export async function getHabitsProgress(
  workspaceId: string,
  query: {
    period?: HabitProgressPeriod;
    from?: string;
    to?: string;
    includeArchived?: boolean;
  } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<HabitProgressResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await timezoneOf(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const period = query.period ?? GrowthHabitProgressPeriod.MONTH;
  const range = resolveProgressRange({
    period,
    todayKey,
    from: query.from,
    to: query.to,
  });
  const from = period === GrowthHabitProgressPeriod.CUSTOM && query.from ? query.from : range.from;
  const to = period === GrowthHabitProgressPeriod.CUSTOM && query.to ? query.to : range.to;

  const includeArchived = query.includeArchived !== false;
  const habits = await db.growthHabit.findMany({
    where: {
      workspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ids = habits.map((habit) => habit.id);
  const lookbackFrom = range.previousFrom < from ? range.previousFrom : from;

  const [versions, checkIns, logs] = await Promise.all([
    ids.length
      ? db.growthHabitConfigVersion.findMany({
          where: { habitId: { in: ids } },
          orderBy: { effectiveFrom: 'asc' },
        })
      : [],
    ids.length
      ? db.growthHabitCheckIn.findMany({
          where: { workspaceId, habitId: { in: ids }, dayKey: { gte: lookbackFrom, lte: to } },
          select: { habitId: true, dayKey: true, value: true, skipped: true, goalValueSnapshot: true },
        })
      : [],
    ids.length
      ? db.growthHabitLog.findMany({
          where: {
            workspaceId,
            habitId: { in: ids },
            dayKey: { gte: from, lte: to },
          },
          select: { habitId: true, loggedAt: true },
        })
      : [],
  ]);

  const versionsByHabit = new Map<string, typeof versions>();
  for (const row of versions) {
    const list = versionsByHabit.get(row.habitId) ?? [];
    list.push(row);
    versionsByHabit.set(row.habitId, list);
  }
  const checkInsByHabit = new Map<string, typeof checkIns>();
  for (const row of checkIns) {
    const list = checkInsByHabit.get(row.habitId) ?? [];
    list.push(row);
    checkInsByHabit.set(row.habitId, list);
  }

  const currentStats = habits.map((habit) => {
    const fallback = sliceFromHabit(habit);
    const records = (checkInsByHabit.get(habit.id) ?? []).map((row) => ({
      dayKey: row.dayKey,
      value: row.value,
      skipped: row.skipped,
      goalValue: row.goalValueSnapshot,
    }));
    const current = buildHabitStatistics({
      fallback,
      versions: versionsFromRows(versionsByHabit.get(habit.id) ?? [], fallback),
      records,
      from,
      to,
      todayKey,
    });
    const previous = buildHabitStatistics({
      fallback,
      versions: versionsFromRows(versionsByHabit.get(habit.id) ?? [], fallback),
      records,
      from: range.previousFrom,
      to: range.previousTo,
      todayKey: range.previousTo,
    });
    return { habit, current, previous };
  });

  const overall = mergeOverallKpi(currentStats.map((row) => row.current.kpi));
  const previousOverall = mergeOverallKpi(currentStats.map((row) => row.previous.kpi));
  const calendar = mergeCalendars(currentStats.map((row) => row.current.calendar));
  const trendMap = new Map<string, { completion: number; value: number; n: number }>();
  for (const row of currentStats) {
    for (const point of row.current.trend) {
      const bucket = trendMap.get(point.key) ?? { completion: 0, value: 0, n: 0 };
      bucket.completion += point.completion;
      bucket.value += point.value;
      bucket.n += 1;
      trendMap.set(point.key, bucket);
    }
  }
  const trend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, bucket]) => ({
      key,
      label: key,
      completion: bucket.n === 0 ? 0 : bucket.completion / bucket.n,
      value: bucket.value,
    }));

  const hours = logs.map((log) => hourInTimeZone(log.loggedAt, timezone));
  const bestTime = bestTimeFromHours(hours);
  const weekday = weekdayCompletion(calendar).find((row) => row.sampleSize >= MIN_WEEKDAY_SAMPLE) ?? null;

  const broken = currentStats
    .map((row) => {
      const scheduled = row.current.kpi.scheduled;
      const failRate = scheduled === 0 ? 0 : row.current.kpi.failed / scheduled;
      return {
        habitId: row.habit.id,
        title: row.habit.title,
        failRate,
        sampleSize: scheduled,
      };
    })
    .filter((row) => row.sampleSize >= MIN_BROKEN_SAMPLE)
    .sort((a, b) => b.failRate - a.failRate)[0] ?? null;

  const correlations = [];
  for (let i = 0; i < currentStats.length; i += 1) {
    for (let j = i + 1; j < currentStats.length; j += 1) {
      const pair = pairCorrelation({
        habitIdA: currentStats[i]!.habit.id,
        habitIdB: currentStats[j]!.habit.id,
        titleA: currentStats[i]!.habit.title,
        titleB: currentStats[j]!.habit.title,
        calendarA: currentStats[i]!.current.calendar,
        calendarB: currentStats[j]!.current.calendar,
      });
      if (pair) correlations.push(pair);
    }
  }
  correlations.sort((a, b) => b.rate - a.rate);

  const analytics: HabitAnalyticsDto = {
    from,
    to,
    previousFrom: range.previousFrom,
    previousTo: range.previousTo,
    timezone,
    monthOverMonth: {
      currentCompletion: overall.completion,
      previousCompletion: previousOverall.completion,
      delta: overall.completion - previousOverall.completion,
      currentScheduled: overall.scheduled,
      previousScheduled: previousOverall.scheduled,
    },
    mostBroken: broken,
    bestWeekday: weekday,
    bestTime,
    correlations: correlations.slice(0, 8),
    insights: buildInsights({
      currentCompletion: overall.completion,
      previousCompletion: previousOverall.completion,
      currentStreak: overall.currentStreak,
      longestStreak: overall.longestStreak,
      bestWeekday: weekday,
      bestTime,
      mostBroken: broken,
      goalConsistency: overall.consistency,
      currentScheduled: overall.scheduled,
      previousScheduled: previousOverall.scheduled,
    }),
    recommendations: buildRecommendations({
      habits: currentStats.map((row) => ({
        habitId: row.habit.id,
        calendar: row.current.calendar,
        kpi: row.current.kpi,
      })),
    }),
  };

  return {
    period,
    from,
    to,
    todayKey,
    timezone,
    overall,
    calendar,
    trend,
    habits: currentStats.map((row) => ({
      habitId: row.habit.id,
      title: row.habit.title,
      kind: row.habit.kind === 'BAD' ? 'BAD' : 'GOOD',
      icon: row.habit.icon,
      color: row.habit.color,
      targetUnit: row.habit.targetUnit,
      kpi: row.current.kpi,
    })),
    analytics,
  };
}

export { addDayKey };
