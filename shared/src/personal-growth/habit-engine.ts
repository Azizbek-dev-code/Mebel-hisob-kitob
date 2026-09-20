import {
  GrowthHabitBadMode,
  GrowthHabitDayStatus,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitProgressPeriod,
  GrowthHabitScheduleKind,
  GrowthHabitTimeOfDay,
  type GrowthHabitDayStatus as DayStatus,
  type GrowthHabitFrequency as HabitFrequency,
} from '../constants/enums.js';
import { DEFAULT_STORE_TIMEZONE } from '../constants/timezones.js';

export const DEFAULT_HABIT_TIMEZONE = DEFAULT_STORE_TIMEZONE;
export const MIN_WEEKDAY_SAMPLE = 4;
export const MIN_TIME_SAMPLE = 5;
export const MIN_BROKEN_SAMPLE = 7;
export const MIN_CORRELATION_SAMPLE = 10;

export type HabitConfigSlice = {
  kind: typeof GrowthHabitKind.GOOD | typeof GrowthHabitKind.BAD;
  badMode: typeof GrowthHabitBadMode.QUIT | typeof GrowthHabitBadMode.LIMIT | null;
  scheduleKind: (typeof GrowthHabitScheduleKind)[keyof typeof GrowthHabitScheduleKind];
  weekdays: readonly number[];
  intervalDays: number | null;
  intervalAnchorDayKey: string | null;
  goalValue: number;
  goalUnit: string;
  goalPeriod: (typeof GrowthHabitGoalPeriod)[keyof typeof GrowthHabitGoalPeriod];
  startDayKey: string | null;
  endDayKey: string | null;
};

export type HabitConfigVersionSlice = {
  effectiveFrom: string;
  effectiveTo: string | null;
  config: HabitConfigSlice;
};

export type HabitDayRecord = {
  dayKey: string;
  value: number;
  skipped?: boolean;
  loggedHours?: number[];
  goalValue?: number | null;
};

export type HabitOccurrence = {
  key: string;
  grain: 'DAY' | 'WEEK' | 'MONTH';
  scheduled: boolean;
  status: DayStatus;
  value: number;
  progress: number;
  goalValue: number;
};

export type HabitStatsKpi = {
  completion: number;
  consistency: number;
  currentStreak: number;
  longestStreak: number;
  completed: number;
  failed: number;
  skipped: number;
  scheduled: number;
  partial: number;
  average: number;
  totalValue: number;
  goalProgress: number;
};

export type HabitCalendarCell = {
  dayKey: string;
  status: DayStatus;
  value: number;
  progress: number;
  scheduled: boolean;
};

export type HabitTrendPoint = {
  key: string;
  label: string;
  completion: number;
  value: number;
};

export type HabitInsight = {
  code: string;
  habitId?: string;
  weekday?: number;
  timeOfDay?: (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay];
  delta?: number;
  sampleSize?: number;
  meta?: Record<string, number | string>;
};

export type HabitRecommendation = {
  code: string;
  habitId?: string;
  weekday?: number;
  meta?: Record<string, number | string>;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** UTC calendar day key YYYY-MM-DD. Kept for legacy helpers. */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDayKey(dayKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) throw new Error(`Invalid dayKey: ${dayKey}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0));
}

export function isDayKey(value: string): boolean {
  return DAY_RE.test(value);
}

export function addDayKey(dayKey: string, delta: number): string {
  const d = parseDayKey(dayKey);
  d.setUTCDate(d.getUTCDate() + delta);
  return toDayKey(d);
}

export function compareDayKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function toZonedDayKey(date: Date, timeZone: string = DEFAULT_HABIT_TIMEZONE): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (!year || !month || !day) return toDayKey(date);
    return `${year}-${month}-${day}`;
  } catch {
    return toDayKey(date);
  }
}

export function hourInTimeZone(date: Date, timeZone: string = DEFAULT_HABIT_TIMEZONE): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  } catch {
    return date.getUTCHours();
  }
}

export function timeBucketFromHour(
  hour: number,
): (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay] {
  if (hour >= 5 && hour < 12) return GrowthHabitTimeOfDay.MORNING;
  if (hour >= 12 && hour < 17) return GrowthHabitTimeOfDay.AFTERNOON;
  if (hour >= 17 && hour < 21) return GrowthHabitTimeOfDay.EVENING;
  return GrowthHabitTimeOfDay.NIGHT;
}

/** Monday-based ISO week key: YYYY-Www. */
export function toWeekKey(dayKey: string): string {
  const d = parseDayKey(dayKey);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function toMonthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function isoWeekday(dayKey: string): number {
  return parseDayKey(dayKey).getUTCDay() || 7;
}

export function eachDayKey(from: string, to: string): string[] {
  const out: string[] = [];
  if (from > to) return out;
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 800) {
    out.push(cursor);
    cursor = addDayKey(cursor, 1);
    guard += 1;
  }
  return out;
}

export function occurrenceGrain(
  config: HabitConfigSlice,
): 'DAY' | 'WEEK' | 'MONTH' {
  if (
    config.goalPeriod === GrowthHabitGoalPeriod.MONTH ||
    config.scheduleKind === GrowthHabitScheduleKind.MONTHLY
  ) {
    return 'MONTH';
  }
  if (
    config.goalPeriod === GrowthHabitGoalPeriod.WEEK ||
    config.scheduleKind === GrowthHabitScheduleKind.WEEKLY
  ) {
    return 'WEEK';
  }
  return 'DAY';
}

export function frequencyFromSchedule(
  scheduleKind: HabitConfigSlice['scheduleKind'],
): HabitFrequency {
  if (scheduleKind === GrowthHabitScheduleKind.WEEKLY) return GrowthHabitFrequency.WEEKLY;
  if (scheduleKind === GrowthHabitScheduleKind.INTERVAL) return GrowthHabitFrequency.CUSTOM;
  if (scheduleKind === GrowthHabitScheduleKind.MONTHLY) return GrowthHabitFrequency.MONTHLY;
  return GrowthHabitFrequency.DAILY;
}

export function scheduleFromFrequency(
  frequency: HabitFrequency,
  weekdays: readonly number[] | null | undefined,
): HabitConfigSlice['scheduleKind'] {
  if (frequency === GrowthHabitFrequency.WEEKLY) return GrowthHabitScheduleKind.WEEKLY;
  if (frequency === GrowthHabitFrequency.CUSTOM) return GrowthHabitScheduleKind.INTERVAL;
  if (frequency === GrowthHabitFrequency.MONTHLY) return GrowthHabitScheduleKind.MONTHLY;
  if (weekdays && weekdays.length > 0) return GrowthHabitScheduleKind.WEEKDAYS;
  return GrowthHabitScheduleKind.EVERY_DAY;
}

export function configOnDay(
  versions: readonly HabitConfigVersionSlice[],
  dayKey: string,
  fallback: HabitConfigSlice,
): HabitConfigSlice {
  const hit = versions.find(
    (version) =>
      version.effectiveFrom <= dayKey &&
      (version.effectiveTo == null || version.effectiveTo >= dayKey),
  );
  return hit?.config ?? fallback;
}

export function isHabitScheduledOn(config: HabitConfigSlice, dayKey: string): boolean {
  if (config.startDayKey && dayKey < config.startDayKey) return false;
  if (config.endDayKey && dayKey > config.endDayKey) return false;

  switch (config.scheduleKind) {
    case GrowthHabitScheduleKind.EVERY_DAY:
      return true;
    case GrowthHabitScheduleKind.WEEKDAYS: {
      const days = config.weekdays.length ? config.weekdays : [1, 2, 3, 4, 5];
      return days.includes(isoWeekday(dayKey));
    }
    case GrowthHabitScheduleKind.WEEKLY:
    case GrowthHabitScheduleKind.MONTHLY:
      return true;
    case GrowthHabitScheduleKind.INTERVAL: {
      const interval = Math.max(1, Math.floor(config.intervalDays ?? 1));
      const anchor = config.intervalAnchorDayKey ?? config.startDayKey;
      if (!anchor) return true;
      if (dayKey < anchor) return false;
      const start = parseDayKey(anchor).getTime();
      const current = parseDayKey(dayKey).getTime();
      const diffDays = Math.round((current - start) / 86_400_000);
      return diffDays % interval === 0;
    }
    default:
      return true;
  }
}

export function isCheckInComplete(value: number, targetValue: number): boolean {
  return value + 1e-9 >= Math.max(0, targetValue);
}

export function progressRatio(value: number, goalValue: number): number {
  const goal = Math.max(0, goalValue);
  if (goal === 0) return value > 0 ? 0 : 1;
  return Math.max(0, Math.min(1, value / goal));
}

function emptyKpi(): HabitStatsKpi {
  return {
    completion: 0,
    consistency: 0,
    currentStreak: 0,
    longestStreak: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    scheduled: 0,
    partial: 0,
    average: 0,
    totalValue: 0,
    goalProgress: 0,
  };
}

export function evaluateDayStatus(input: {
  config: HabitConfigSlice;
  dayKey: string;
  todayKey: string;
  value: number;
  skipped: boolean;
}): DayStatus {
  if (!isHabitScheduledOn(input.config, input.dayKey)) {
    return GrowthHabitDayStatus.UNSCHEDULED;
  }
  if (input.skipped) return GrowthHabitDayStatus.SKIPPED;

  const grain = occurrenceGrain(input.config);
  if (grain !== 'DAY') {
    if (input.config.kind === GrowthHabitKind.BAD) {
      if (input.config.badMode === GrowthHabitBadMode.QUIT) {
        return input.value > 0 ? GrowthHabitDayStatus.FAILED : GrowthHabitDayStatus.NONE;
      }
      if (input.value > input.config.goalValue + 1e-9) return GrowthHabitDayStatus.FAILED;
      if (input.value > 0) return GrowthHabitDayStatus.COMPLETED;
      return GrowthHabitDayStatus.NONE;
    }
    if (input.value <= 0) return GrowthHabitDayStatus.NONE;
    if (isCheckInComplete(input.value, input.config.goalValue) && input.config.goalPeriod === GrowthHabitGoalPeriod.DAY) {
      return GrowthHabitDayStatus.COMPLETED;
    }
    return GrowthHabitDayStatus.COMPLETED;
  }

  if (input.config.kind === GrowthHabitKind.BAD) {
    if (input.config.badMode === GrowthHabitBadMode.QUIT) {
      return input.value > 0 ? GrowthHabitDayStatus.FAILED : GrowthHabitDayStatus.COMPLETED;
    }
    return input.value > input.config.goalValue + 1e-9
      ? GrowthHabitDayStatus.FAILED
      : GrowthHabitDayStatus.COMPLETED;
  }

  if (isCheckInComplete(input.value, input.config.goalValue)) {
    return GrowthHabitDayStatus.COMPLETED;
  }
  if (input.value > 0) return GrowthHabitDayStatus.PARTIAL;
  if (input.dayKey < input.todayKey) return GrowthHabitDayStatus.FAILED;
  return GrowthHabitDayStatus.NONE;
}

function periodSuccess(config: HabitConfigSlice, totalValue: number, failedByLimit: boolean): boolean {
  if (config.kind === GrowthHabitKind.BAD) {
    if (config.badMode === GrowthHabitBadMode.QUIT) return totalValue <= 0;
    return !failedByLimit && totalValue <= config.goalValue + 1e-9;
  }
  return isCheckInComplete(totalValue, config.goalValue);
}

export function computeStreakFromStatuses(
  statuses: ReadonlyArray<{ key: string; status: DayStatus }>,
  todayKey: string,
  grain: 'DAY' | 'WEEK' | 'MONTH',
): { currentStreak: number; longestStreak: number } {
  const sorted = [...statuses].sort((a, b) => compareDayKey(a.key, b.key));
  let longest = 0;
  let run = 0;
  for (const row of sorted) {
    if (row.status === GrowthHabitDayStatus.SKIPPED || row.status === GrowthHabitDayStatus.UNSCHEDULED) {
      continue;
    }
    if (row.status === GrowthHabitDayStatus.COMPLETED) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (row.status === GrowthHabitDayStatus.NONE && row.key >= todayKey) {
      continue;
    } else {
      run = 0;
    }
  }

  const byKey = new Map(sorted.map((row) => [row.key, row.status]));
  const keys = sorted
    .filter((row) => row.status !== GrowthHabitDayStatus.UNSCHEDULED)
    .map((row) => row.key);

  const todayStatus = byKey.get(todayKey);
  let cursor: string | undefined;
  if (todayStatus === GrowthHabitDayStatus.COMPLETED) {
    cursor = todayKey;
  } else if (
    todayStatus === GrowthHabitDayStatus.NONE ||
    todayStatus === GrowthHabitDayStatus.PARTIAL ||
    todayStatus === GrowthHabitDayStatus.SKIPPED ||
    todayStatus === undefined
  ) {
    cursor = [...keys].reverse().find((key) => key < todayKey);
  } else {
    cursor = undefined;
  }

  let current = 0;
  if (cursor) {
    const reversed = [...keys].filter((key) => key <= cursor!).reverse();
    for (const key of reversed) {
      const status = byKey.get(key);
      if (status === GrowthHabitDayStatus.SKIPPED) continue;
      if (status === GrowthHabitDayStatus.COMPLETED) {
        current += 1;
        continue;
      }
      break;
    }
  }

  return { currentStreak: current, longestStreak: Math.max(longest, current) };
}

function previousGrainKey(key: string, grain: 'DAY' | 'WEEK' | 'MONTH'): string {
  if (grain === 'DAY') return addDayKey(key, -1);
  if (grain === 'MONTH') {
    const [year, month] = key.split('-').map(Number);
    const d = new Date(Date.UTC(year!, (month ?? 1) - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return previousWeekKey(key);
}

function previousWeekKey(weekKey: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return weekKey;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return toWeekKey(toDayKey(monday));
}

export function grainKeyForDay(dayKey: string, grain: 'DAY' | 'WEEK' | 'MONTH'): string {
  if (grain === 'WEEK') return toWeekKey(dayKey);
  if (grain === 'MONTH') return toMonthKey(dayKey);
  return dayKey;
}

export type BuiltHabitStatistics = {
  kpi: HabitStatsKpi;
  calendar: HabitCalendarCell[];
  trend: HabitTrendPoint[];
  occurrences: HabitOccurrence[];
};

export function buildHabitStatistics(input: {
  versions?: readonly HabitConfigVersionSlice[];
  fallback: HabitConfigSlice;
  records: readonly HabitDayRecord[];
  from: string;
  to: string;
  todayKey: string;
}): BuiltHabitStatistics {
  const versions = input.versions ?? [];
  const byDay = new Map(input.records.map((row) => [row.dayKey, row]));
  const calendar: HabitCalendarCell[] = [];

  const grain = occurrenceGrain(configOnDay(versions, input.from, input.fallback));
  const groups = new Map<
    string,
    { value: number; skipped: boolean; failedLimit: boolean; days: string[]; config: HabitConfigSlice }
  >();

  for (const dayKey of eachDayKey(input.from, input.to)) {
    const record = byDay.get(dayKey);
    const base = configOnDay(versions, dayKey, input.fallback);
    const config =
      versions.length === 0 && record?.goalValue != null
        ? { ...base, goalValue: record.goalValue }
        : base;
    const scheduled = isHabitScheduledOn(config, dayKey);
    const value = record?.value ?? 0;
    const skipped = Boolean(record?.skipped);
    const status = evaluateDayStatus({
      config,
      dayKey,
      todayKey: input.todayKey,
      value,
      skipped,
    });
    calendar.push({
      dayKey,
      status,
      value,
      progress: progressRatio(value, occurrenceGrain(config) === 'DAY' ? config.goalValue : 1),
      scheduled,
    });

    if (!scheduled) continue;
    const key = grainKeyForDay(dayKey, occurrenceGrain(config));
    const group = groups.get(key) ?? {
      value: 0,
      skipped: true,
      failedLimit: false,
      days: [],
      config,
    };
    group.value += value;
    group.skipped = group.skipped && skipped;
    group.days.push(dayKey);
    if (
      config.kind === GrowthHabitKind.BAD &&
      config.badMode === GrowthHabitBadMode.LIMIT &&
      value > config.goalValue + 1e-9
    ) {
      group.failedLimit = true;
    }
    groups.set(key, group);
  }

  const occurrences: HabitOccurrence[] = [];
  for (const [key, group] of [...groups.entries()].sort((a, b) => compareDayKey(a[0], b[0]))) {
    const lastDay = group.days[group.days.length - 1]!;
    const grainForGroup = occurrenceGrain(group.config);
    let status: DayStatus;
    if (group.skipped) {
      status = GrowthHabitDayStatus.SKIPPED;
    } else if (grainForGroup === 'DAY') {
      const record = byDay.get(key);
      status = evaluateDayStatus({
        config: group.config,
        dayKey: key,
        todayKey: input.todayKey,
        value: record?.value ?? 0,
        skipped: Boolean(record?.skipped),
      });
    } else {
      const periodEnded = lastDay < input.todayKey;
      const success = periodSuccess(group.config, group.value, group.failedLimit);
      if (success) status = GrowthHabitDayStatus.COMPLETED;
      else if (!periodEnded) {
        status =
          group.value > 0 ? GrowthHabitDayStatus.PARTIAL : GrowthHabitDayStatus.NONE;
      } else if (group.config.kind === GrowthHabitKind.GOOD && group.value > 0) {
        status = GrowthHabitDayStatus.PARTIAL;
      } else {
        status = GrowthHabitDayStatus.FAILED;
      }
    }
    occurrences.push({
      key,
      grain: grainForGroup,
      scheduled: true,
      status,
      value: group.value,
      progress: progressRatio(group.value, group.config.goalValue),
      goalValue: group.config.goalValue,
    });
  }

  const countable = occurrences.filter(
    (row) =>
      row.status !== GrowthHabitDayStatus.UNSCHEDULED &&
      (row.status !== GrowthHabitDayStatus.NONE || row.key < grainKeyForDay(input.todayKey, grain)),
  );
  const ended = countable.filter((row) => row.status !== GrowthHabitDayStatus.NONE);
  const completed = ended.filter((row) => row.status === GrowthHabitDayStatus.COMPLETED).length;
  const failed = ended.filter((row) => row.status === GrowthHabitDayStatus.FAILED).length;
  const skipped = ended.filter((row) => row.status === GrowthHabitDayStatus.SKIPPED).length;
  const partial = ended.filter((row) => row.status === GrowthHabitDayStatus.PARTIAL).length;
  const scheduled = ended.length;
  const denom = Math.max(0, scheduled - skipped);
  const completion = scheduled === 0 ? 0 : completed / scheduled;
  const consistency = denom === 0 ? 0 : completed / denom;
  const totalValue = input.records
    .filter((row) => row.dayKey >= input.from && row.dayKey <= input.to)
    .reduce((sum, row) => sum + row.value, 0);
  const daysWithValue = input.records.filter(
    (row) => row.dayKey >= input.from && row.dayKey <= input.to && row.value > 0,
  ).length;
  const streakTodayKey =
    grain === 'DAY' ? input.todayKey : grainKeyForDay(input.todayKey, grain);
  const streak = computeStreakFromStatuses(
    occurrences.map((row) => ({ key: row.key, status: row.status })),
    streakTodayKey,
    grain,
  );

  const trendMap = new Map<string, { completed: number; scheduled: number; value: number }>();
  for (const cell of calendar) {
    if (cell.dayKey > input.todayKey) continue;
    const key = toWeekKey(cell.dayKey);
    const bucket = trendMap.get(key) ?? { completed: 0, scheduled: 0, value: 0 };
    if (cell.scheduled && cell.status !== GrowthHabitDayStatus.UNSCHEDULED && cell.status !== GrowthHabitDayStatus.NONE) {
      bucket.scheduled += 1;
      if (cell.status === GrowthHabitDayStatus.COMPLETED) bucket.completed += 1;
    }
    bucket.value += cell.value;
    trendMap.set(key, bucket);
  }
  const trend: HabitTrendPoint[] = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, bucket]) => ({
      key,
      label: key,
      completion: bucket.scheduled === 0 ? 0 : bucket.completed / bucket.scheduled,
      value: bucket.value,
    }));

  const goalProgress =
    occurrences.length === 0
      ? 0
      : occurrences.reduce((sum, row) => sum + row.progress, 0) / occurrences.length;

  return {
    kpi: {
      completion,
      consistency,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      completed,
      failed,
      skipped,
      scheduled,
      partial,
      average: daysWithValue === 0 ? 0 : totalValue / daysWithValue,
      totalValue,
      goalProgress,
    },
    calendar,
    trend,
    occurrences,
  };
}

export function resolveProgressRange(input: {
  period: (typeof GrowthHabitProgressPeriod)[keyof typeof GrowthHabitProgressPeriod];
  todayKey: string;
  from?: string;
  to?: string;
}): { from: string; to: string; previousFrom: string; previousTo: string } {
  const today = input.todayKey;
  if (input.period === GrowthHabitProgressPeriod.CUSTOM && input.from && input.to) {
    const from = input.from;
    const to = input.to;
    const span = eachDayKey(from, to).length;
    const previousTo = addDayKey(from, -1);
    const previousFrom = addDayKey(previousTo, -(span - 1));
    return { from, to, previousFrom, previousTo };
  }

  const weekday = isoWeekday(today);
  const weekStart = addDayKey(today, -(weekday - 1));
  const monthStart = `${today.slice(0, 7)}-01`;

  let from = today;
  if (input.period === GrowthHabitProgressPeriod.WEEK) from = weekStart;
  else if (input.period === GrowthHabitProgressPeriod.MONTH) from = monthStart;
  else if (input.period === GrowthHabitProgressPeriod.QUARTER) from = addDayKey(today, -89);
  else if (input.period === GrowthHabitProgressPeriod.HALF) from = addDayKey(today, -181);
  else if (input.period === GrowthHabitProgressPeriod.YEAR) {
    from = `${today.slice(0, 4)}-01-01`;
  }

  const span = eachDayKey(from, today).length;
  const previousTo = addDayKey(from, -1);
  const previousFrom = addDayKey(previousTo, -(span - 1));
  return { from, to: today, previousFrom, previousTo };
}

export function mergeOverallKpi(kpis: readonly HabitStatsKpi[]): HabitStatsKpi {
  if (kpis.length === 0) return emptyKpi();
  const sum = kpis.reduce(
    (acc, row) => ({
      completed: acc.completed + row.completed,
      failed: acc.failed + row.failed,
      skipped: acc.skipped + row.skipped,
      scheduled: acc.scheduled + row.scheduled,
      partial: acc.partial + row.partial,
      totalValue: acc.totalValue + row.totalValue,
      currentStreak: Math.max(acc.currentStreak, row.currentStreak),
      longestStreak: Math.max(acc.longestStreak, row.longestStreak),
      averageAcc: acc.averageAcc + row.average,
      goalAcc: acc.goalAcc + row.goalProgress,
    }),
    {
      completed: 0,
      failed: 0,
      skipped: 0,
      scheduled: 0,
      partial: 0,
      totalValue: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageAcc: 0,
      goalAcc: 0,
    },
  );
  const denom = Math.max(0, sum.scheduled - sum.skipped);
  return {
    completion: sum.scheduled === 0 ? 0 : sum.completed / sum.scheduled,
    consistency: denom === 0 ? 0 : sum.completed / denom,
    currentStreak: sum.currentStreak,
    longestStreak: sum.longestStreak,
    completed: sum.completed,
    failed: sum.failed,
    skipped: sum.skipped,
    scheduled: sum.scheduled,
    partial: sum.partial,
    average: kpis.length === 0 ? 0 : sum.averageAcc / kpis.length,
    totalValue: sum.totalValue,
    goalProgress: kpis.length === 0 ? 0 : sum.goalAcc / kpis.length,
  };
}

export function mergeCalendars(calendars: readonly HabitCalendarCell[][]): HabitCalendarCell[] {
  const map = new Map<string, HabitCalendarCell>();
  for (const calendar of calendars) {
    for (const cell of calendar) {
      const existing = map.get(cell.dayKey);
      if (!existing) {
        map.set(cell.dayKey, { ...cell });
        continue;
      }
      existing.value += cell.value;
      existing.scheduled = existing.scheduled || cell.scheduled;
      if (cell.status === GrowthHabitDayStatus.FAILED || existing.status === GrowthHabitDayStatus.FAILED) {
        existing.status = GrowthHabitDayStatus.FAILED;
      } else if (
        cell.status === GrowthHabitDayStatus.COMPLETED &&
        existing.status === GrowthHabitDayStatus.COMPLETED
      ) {
        existing.status = GrowthHabitDayStatus.COMPLETED;
      } else if (cell.status === GrowthHabitDayStatus.PARTIAL || existing.status === GrowthHabitDayStatus.PARTIAL) {
        existing.status = GrowthHabitDayStatus.PARTIAL;
      } else if (cell.status === GrowthHabitDayStatus.SKIPPED) {
        existing.status = existing.status;
      }
      existing.progress = Math.max(existing.progress, cell.progress);
    }
  }
  return [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function weekdayCompletion(
  calendar: readonly HabitCalendarCell[],
): Array<{ weekday: number; completion: number; sampleSize: number }> {
  const buckets = new Map<number, { completed: number; total: number }>();
  for (const cell of calendar) {
    if (!cell.scheduled) continue;
    if (
      cell.status === GrowthHabitDayStatus.NONE ||
      cell.status === GrowthHabitDayStatus.UNSCHEDULED ||
      cell.status === GrowthHabitDayStatus.SKIPPED
    ) {
      continue;
    }
    const day = isoWeekday(cell.dayKey);
    const bucket = buckets.get(day) ?? { completed: 0, total: 0 };
    bucket.total += 1;
    if (cell.status === GrowthHabitDayStatus.COMPLETED) bucket.completed += 1;
    buckets.set(day, bucket);
  }
  return [...buckets.entries()]
    .map(([weekday, bucket]) => ({
      weekday,
      completion: bucket.total === 0 ? 0 : bucket.completed / bucket.total,
      sampleSize: bucket.total,
    }))
    .sort((a, b) => b.completion - a.completion || b.sampleSize - a.sampleSize);
}

export function bestTimeFromHours(
  hours: readonly number[],
): { bucket: (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay]; count: number } | null {
  if (hours.length < MIN_TIME_SAMPLE) return null;
  const counts = new Map<string, number>();
  for (const hour of hours) {
    const bucket = timeBucketFromHour(hour);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best: { bucket: (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay]; count: number } | null =
    null;
  for (const [bucket, count] of counts) {
    if (!best || count > best.count) {
      best = { bucket: bucket as (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay], count };
    }
  }
  return best;
}

export function pairCorrelation(input: {
  habitIdA: string;
  habitIdB: string;
  titleA: string;
  titleB: string;
  calendarA: readonly HabitCalendarCell[];
  calendarB: readonly HabitCalendarCell[];
}): {
  habitIdA: string;
  habitIdB: string;
  titleA: string;
  titleB: string;
  overlapScheduled: number;
  bothCompleted: number;
  rate: number;
} | null {
  const b = new Map(input.calendarB.map((cell) => [cell.dayKey, cell]));
  let overlap = 0;
  let both = 0;
  for (const cell of input.calendarA) {
    const other = b.get(cell.dayKey);
    if (!other) continue;
    if (!cell.scheduled || !other.scheduled) continue;
    if (
      cell.status === GrowthHabitDayStatus.SKIPPED ||
      other.status === GrowthHabitDayStatus.SKIPPED ||
      cell.status === GrowthHabitDayStatus.NONE ||
      other.status === GrowthHabitDayStatus.NONE
    ) {
      continue;
    }
    overlap += 1;
    if (
      cell.status === GrowthHabitDayStatus.COMPLETED &&
      other.status === GrowthHabitDayStatus.COMPLETED
    ) {
      both += 1;
    }
  }
  if (overlap < MIN_CORRELATION_SAMPLE) return null;
  return {
    habitIdA: input.habitIdA,
    habitIdB: input.habitIdB,
    titleA: input.titleA,
    titleB: input.titleB,
    overlapScheduled: overlap,
    bothCompleted: both,
    rate: overlap === 0 ? 0 : both / overlap,
  };
}

export function buildInsights(input: {
  currentCompletion: number;
  previousCompletion: number;
  currentStreak: number;
  longestStreak: number;
  bestWeekday: { weekday: number; completion: number; sampleSize: number } | null;
  bestTime: { bucket: (typeof GrowthHabitTimeOfDay)[keyof typeof GrowthHabitTimeOfDay]; count: number } | null;
  mostBroken: { habitId: string; failRate: number; sampleSize: number } | null;
  goalConsistency: number;
  currentScheduled?: number;
  previousScheduled?: number;
}): HabitInsight[] {
  const insights: HabitInsight[] = [];
  const delta = input.currentCompletion - input.previousCompletion;
  const currentScheduled = input.currentScheduled ?? 0;
  const previousScheduled = input.previousScheduled ?? 0;
  if (
    currentScheduled >= MIN_WEEKDAY_SAMPLE &&
    previousScheduled >= MIN_WEEKDAY_SAMPLE &&
    Math.abs(delta) >= 0.05
  ) {
    insights.push({
      code: delta > 0 ? 'COMPLETION_UP' : 'COMPLETION_DOWN',
      delta,
    });
  }
  if (input.currentStreak > 0 && input.currentStreak === input.longestStreak && input.longestStreak >= 3) {
    insights.push({ code: 'STREAK_RECORD', meta: { streak: input.currentStreak } });
  }
  if (input.bestWeekday && input.bestWeekday.sampleSize >= MIN_WEEKDAY_SAMPLE) {
    insights.push({
      code: 'BEST_WEEKDAY',
      weekday: input.bestWeekday.weekday,
      sampleSize: input.bestWeekday.sampleSize,
    });
  }
  if (input.bestTime && input.bestTime.count >= MIN_TIME_SAMPLE) {
    insights.push({
      code: 'BEST_TIME',
      timeOfDay: input.bestTime.bucket,
      sampleSize: input.bestTime.count,
    });
  }
  if (input.mostBroken && input.mostBroken.sampleSize >= MIN_BROKEN_SAMPLE) {
    insights.push({
      code: 'HIGH_FAILURE',
      habitId: input.mostBroken.habitId,
      sampleSize: input.mostBroken.sampleSize,
      meta: { failRate: input.mostBroken.failRate },
    });
  }
  if (input.goalConsistency > 0 && currentScheduled >= MIN_WEEKDAY_SAMPLE) {
    insights.push({
      code: 'GOAL_CONSISTENCY',
      meta: { consistency: input.goalConsistency },
    });
  }
  return insights;
}

export function buildRecommendations(input: {
  habits: Array<{
    habitId: string;
    calendar: readonly HabitCalendarCell[];
    kpi: HabitStatsKpi;
  }>;
}): HabitRecommendation[] {
  const recs: HabitRecommendation[] = [];
  for (const habit of input.habits) {
    const weekdays = weekdayCompletion(habit.calendar);
    const enough = weekdays.filter((row) => row.sampleSize >= MIN_WEEKDAY_SAMPLE);
    if (enough.length >= 2) {
      const worst = [...enough].sort((a, b) => a.completion - b.completion)[0];
      const best = enough[0];
      if (worst && best && worst.completion <= 0.4 && best.completion >= 0.6 && worst.weekday !== best.weekday) {
        recs.push({
          code: 'MOVE_WEEKDAY',
          habitId: habit.habitId,
          weekday: worst.weekday,
          meta: { completion: worst.completion, bestWeekday: best.weekday },
        });
      }
    }
    if (habit.kpi.scheduled >= MIN_BROKEN_SAMPLE && habit.kpi.partial / Math.max(1, habit.kpi.scheduled) >= 0.4) {
      recs.push({
        code: 'REVIEW_GOAL',
        habitId: habit.habitId,
        meta: { partial: habit.kpi.partial, scheduled: habit.kpi.scheduled },
      });
    }
    if (
      habit.kpi.scheduled >= MIN_BROKEN_SAMPLE &&
      habit.kpi.failed / Math.max(1, habit.kpi.scheduled - habit.kpi.skipped) >= 0.5
    ) {
      recs.push({
        code: 'HIGH_FAILURE',
        habitId: habit.habitId,
        meta: { failRate: habit.kpi.failed / Math.max(1, habit.kpi.scheduled) },
      });
    }
  }
  return recs.slice(0, 8);
}

export function configNeedsVersion(
  prev: HabitConfigSlice,
  next: HabitConfigSlice,
): boolean {
  return (
    prev.kind !== next.kind ||
    prev.badMode !== next.badMode ||
    prev.scheduleKind !== next.scheduleKind ||
    prev.intervalDays !== next.intervalDays ||
    prev.goalValue !== next.goalValue ||
    prev.goalUnit !== next.goalUnit ||
    prev.goalPeriod !== next.goalPeriod ||
    prev.startDayKey !== next.startDayKey ||
    prev.endDayKey !== next.endDayKey ||
    prev.weekdays.join(',') !== next.weekdays.join(',')
  );
}

export function sliceFromLegacyFrequency(input: {
  frequency: HabitFrequency;
  intervalDays?: number | null;
  targetValue: number;
  targetUnit: string;
  weekdays?: readonly number[];
  startDayKey?: string | null;
}): HabitConfigSlice {
  return {
    kind: GrowthHabitKind.GOOD,
    badMode: null,
    scheduleKind: scheduleFromFrequency(input.frequency, input.weekdays),
    weekdays: input.weekdays ?? [],
    intervalDays: input.intervalDays ?? null,
    intervalAnchorDayKey: input.startDayKey ?? null,
    goalValue: input.targetValue,
    goalUnit: input.targetUnit,
    goalPeriod: GrowthHabitGoalPeriod.DAY,
    startDayKey: input.startDayKey ?? null,
    endDayKey: null,
  };
}

/**
 * Whether a habit still needs a check-in for `todayKey` given prior check-in dayKeys.
 * Legacy helper — new code should use schedule + evaluateDayStatus.
 */
export function isHabitDueToday(input: {
  frequency: HabitFrequency;
  intervalDays?: number | null;
  todayKey: string;
  completedDayKeys: readonly string[];
}): boolean {
  const done = new Set(input.completedDayKeys);
  if (input.frequency === GrowthHabitFrequency.DAILY) {
    return !done.has(input.todayKey);
  }
  if (input.frequency === GrowthHabitFrequency.WEEKLY) {
    const week = toWeekKey(input.todayKey);
    return !input.completedDayKeys.some((key) => toWeekKey(key) === week);
  }
  if (input.frequency === GrowthHabitFrequency.MONTHLY) {
    const month = toMonthKey(input.todayKey);
    return !input.completedDayKeys.some((key) => toMonthKey(key) === month);
  }
  const interval = Math.max(1, Math.floor(input.intervalDays ?? 1));
  if (done.has(input.todayKey)) return false;
  const sorted = [...input.completedDayKeys].sort();
  const last = sorted[sorted.length - 1];
  if (!last) return true;
  let cursor = last;
  for (let i = 0; i < interval; i += 1) cursor = addDayKey(cursor, 1);
  return input.todayKey >= cursor;
}

export function isHabitDueOnConfig(input: {
  config: HabitConfigSlice;
  todayKey: string;
  todayValue: number;
  todaySkipped: boolean;
  periodValue: number;
}): boolean {
  if (!isHabitScheduledOn(input.config, input.todayKey)) return false;
  if (input.todaySkipped) return false;
  const grain = occurrenceGrain(input.config);
  if (grain === 'DAY') {
    return evaluateDayStatus({
      config: input.config,
      dayKey: input.todayKey,
      todayKey: input.todayKey,
      value: input.todayValue,
      skipped: input.todaySkipped,
    }) !== GrowthHabitDayStatus.COMPLETED;
  }
  if (input.config.kind === GrowthHabitKind.BAD) {
    if (input.config.badMode === GrowthHabitBadMode.QUIT) return false;
    return input.periodValue > input.config.goalValue + 1e-9
      ? false
      : !isCheckInComplete(input.periodValue, 0) && input.periodValue <= input.config.goalValue;
  }
  return !isCheckInComplete(input.periodValue, input.config.goalValue);
}

export type HabitStreakResult = {
  currentStreak: number;
  bestStreak: number;
};

/**
 * Compute streaks from completed day keys.
 * Daily/custom: consecutive calendar days ending today or yesterday.
 * Weekly: consecutive ISO weeks with ≥1 check-in.
 */
export function computeHabitStreak(input: {
  frequency: HabitFrequency;
  completedDayKeys: readonly string[];
  todayKey: string;
}): HabitStreakResult {
  const unique = [...new Set(input.completedDayKeys)].sort();
  if (unique.length === 0) return { currentStreak: 0, bestStreak: 0 };

  if (
    input.frequency === GrowthHabitFrequency.WEEKLY ||
    input.frequency === GrowthHabitFrequency.MONTHLY
  ) {
    const grain = input.frequency === GrowthHabitFrequency.MONTHLY ? 'MONTH' : 'WEEK';
    const keys = [...new Set(unique.map((key) => grainKeyForDay(key, grain)))].sort();
    const statuses = keys.map((key) => ({
      key,
      status: GrowthHabitDayStatus.COMPLETED as DayStatus,
    }));
    const result = computeStreakFromStatuses(
      statuses,
      grainKeyForDay(input.todayKey, grain),
      grain,
    );
    let best = 1;
    let run = 1;
    for (let i = 1; i < keys.length; i += 1) {
      const prev = keys[i - 1]!;
      const cur = keys[i]!;
      const adjacent =
        grain === 'WEEK' ? previousWeekKey(cur) === prev : previousGrainKey(cur, 'MONTH') === prev;
      if (adjacent) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }
    return {
      currentStreak: result.currentStreak,
      bestStreak: Math.max(best, result.currentStreak),
    };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = unique[i - 1]!;
    const cur = unique[i]!;
    if (addDayKey(prev, 1) === cur) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  const today = input.todayKey;
  const yesterday = addDayKey(today, -1);
  if (unique.includes(today) || unique.includes(yesterday)) {
    let cursor = unique.includes(today) ? today : yesterday;
    current = 1;
    while (true) {
      const prev = addDayKey(cursor, -1);
      if (!unique.includes(prev)) break;
      current += 1;
      cursor = prev;
    }
  }

  return { currentStreak: current, bestStreak: Math.max(best, current) };
}

export { previousWeekKey };
