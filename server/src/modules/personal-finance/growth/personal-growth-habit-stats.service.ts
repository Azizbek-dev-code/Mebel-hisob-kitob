import {
  DEFAULT_HABIT_TIMEZONE,
  GrowthFocusKind,
  GrowthFocusStatus,
  GrowthHabitProgressPeriod,
  MIN_BROKEN_SAMPLE,
  MIN_WEEKDAY_SAMPLE,
  WorkspaceStatus,
  WorkspaceType,
  addDayKey,
  bestTimeFromHours,
  buildAttentionHabits,
  buildHabitStatistics,
  buildInsights,
  buildPerformanceBreakdown,
  buildRecommendations,
  buildWeeklyRhythm,
  focusZonesFromHours,
  hourInTimeZone,
  mergeCalendars,
  mergeOverallKpi,
  pairCorrelation,
  parseDayKey,
  resolveProgressRange,
  summarizeAreaStats,
  summarizeDayPerformance,
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
  | 'growthFocusSession'
  | 'personalProfile'
>;

function rangeBounds(fromDayKey: string, toDayKey: string): { start: Date; end: Date } {
  const start = parseDayKey(fromDayKey);
  const end = new Date(parseDayKey(addDayKey(toDayKey, 1)).getTime() - 1);
  return { start, end };
}

async function sumHabitFocusMinutes(
  workspaceId: string,
  habitId: string,
  fromDayKey: string,
  toDayKey: string,
  db: DbClient,
): Promise<number> {
  const { start, end } = rangeBounds(fromDayKey, toDayKey);
  const rows = await db.growthFocusSession.findMany({
    where: {
      workspaceId,
      habitId,
      kind: GrowthFocusKind.FOCUS,
      status: { in: [GrowthFocusStatus.COMPLETED, GrowthFocusStatus.INTERRUPTED] },
      creditedMinutes: { gt: 0 },
      startedAt: { gte: start, lte: end },
    },
    select: { creditedMinutes: true },
  });
  return rows.reduce((sum, row) => sum + row.creditedMinutes, 0);
}

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

  const [versions, checkIns, focusMinutes] = await Promise.all([
    db.growthHabitConfigVersion.findMany({
      where: { habitId },
      orderBy: { effectiveFrom: 'asc' },
    }),
    db.growthHabitCheckIn.findMany({
      where: { habitId, workspaceId, dayKey: { gte: from, lte: to } },
      select: { dayKey: true, value: true, skipped: true, goalValueSnapshot: true },
    }),
    sumHabitFocusMinutes(workspaceId, habitId, from, to, db),
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
    focusMinutes,
  };
}

export async function getHabitsProgress(
  workspaceId: string,
  query: {
    period?: HabitProgressPeriod;
    from?: string;
    to?: string;
    includeArchived?: boolean;
    /** Filter analytics to habits in this category (`other` = null/empty). */
    category?: string;
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
  const allHabits = await db.growthHabit.findMany({
    where: {
      workspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const availableCategories = [
    ...new Set(
      allHabits.map((habit) => {
        const value = (habit.category ?? '').trim();
        return value || 'other';
      }),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const categoryFilter = query.category?.trim();
  const habits = categoryFilter
    ? allHabits.filter((habit) => {
        const value = (habit.category ?? '').trim() || 'other';
        return value === categoryFilter;
      })
    : allHabits;
  const ids = habits.map((habit) => habit.id);
  const lookbackFrom = range.previousFrom < from ? range.previousFrom : from;

  const { start: rangeStart, end: rangeEnd } = rangeBounds(from, to);
  const [versions, checkIns, logs, focusSessions] = await Promise.all([
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
    ids.length
      ? db.growthFocusSession.findMany({
          where: {
            workspaceId,
            habitId: { in: ids },
            kind: GrowthFocusKind.FOCUS,
            status: { in: [GrowthFocusStatus.COMPLETED, GrowthFocusStatus.INTERRUPTED] },
            creditedMinutes: { gt: 0 },
            startedAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { habitId: true, startedAt: true, creditedMinutes: true },
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
  const habitCalendars = currentStats.map((row) => row.current.calendar);
  const calendar = mergeCalendars(habitCalendars);
  const dayPerformance = summarizeDayPerformance(habitCalendars);
  const performanceBreakdown = buildPerformanceBreakdown(dayPerformance);
  const weeklyRhythm = buildWeeklyRhythm(habitCalendars);
  const habitRows = currentStats.map((row) => ({
    habitId: row.habit.id,
    title: row.habit.title,
    kind: (row.habit.kind === 'BAD' ? 'BAD' : 'GOOD') as 'BAD' | 'GOOD',
    icon: row.habit.icon,
    color: row.habit.color,
    category: row.habit.category ?? null,
    targetUnit: row.habit.targetUnit,
    kpi: row.current.kpi,
  }));
  const areas = summarizeAreaStats(
    habitRows.map((row) => ({ category: row.category, kpi: row.kpi })),
  );
  const attentionHabits = buildAttentionHabits(habitRows);
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

  const hours = [
    ...logs.map((log) => hourInTimeZone(log.loggedAt, timezone)),
    ...focusSessions.map((session) => hourInTimeZone(session.startedAt, timezone)),
  ];
  const bestTime = bestTimeFromHours(hours);
  const focusZones = focusZonesFromHours(hours);
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
    dayPerformance,
    performanceBreakdown,
    weeklyRhythm,
    areas,
    attentionHabits,
    focusZones,
    availableCategories,
    trend,
    habits: habitRows,
    analytics,
  };
}

export { addDayKey };
