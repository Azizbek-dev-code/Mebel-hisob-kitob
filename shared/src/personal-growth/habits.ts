import { GrowthHabitFrequency, type GrowthHabitFrequency as HabitFrequency } from '../constants/enums.js';

export const MAX_DAILY_GOALS = 3;
export const MAX_ACTIVE_HABITS = 40;

/** UTC calendar day key YYYY-MM-DD. */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDayKey(dayKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) throw new Error(`Invalid dayKey: ${dayKey}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0));
}

function addUtcDays(dayKey: string, delta: number): string {
  const d = parseDayKey(dayKey);
  d.setUTCDate(d.getUTCDate() + delta);
  return toDayKey(d);
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

/**
 * Whether a habit still needs a check-in for `todayKey` given prior check-in dayKeys.
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
  const interval = Math.max(1, Math.floor(input.intervalDays ?? 1));
  if (done.has(input.todayKey)) return false;
  const sorted = [...input.completedDayKeys].sort();
  const last = sorted[sorted.length - 1];
  if (!last) return true;
  let cursor = last;
  for (let i = 0; i < interval; i += 1) cursor = addUtcDays(cursor, 1);
  return input.todayKey >= cursor;
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

  if (input.frequency === GrowthHabitFrequency.WEEKLY) {
    const weeks = [...new Set(unique.map(toWeekKey))].sort();
    let best = 1;
    let run = 1;
    for (let i = 1; i < weeks.length; i += 1) {
      const prev = weeks[i - 1]!;
      const cur = weeks[i]!;
      // Adjacent week keys by chronological day of week start — approximate via day scan.
      const contiguous = areAdjacentWeeks(prev, cur);
      if (contiguous) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }
    const todayWeek = toWeekKey(input.todayKey);
    const yesterdayWeek = toWeekKey(addUtcDays(input.todayKey, -7));
    let current = 0;
    if (weeks.includes(todayWeek) || weeks.includes(yesterdayWeek)) {
      const anchor = weeks.includes(todayWeek) ? todayWeek : yesterdayWeek;
      current = 1;
      let cursor = anchor;
      while (true) {
        const prev = previousWeekKey(cursor);
        if (!weeks.includes(prev)) break;
        current += 1;
        cursor = prev;
      }
    }
    return { currentStreak: current, bestStreak: Math.max(best, current) };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = unique[i - 1]!;
    const cur = unique[i]!;
    if (addUtcDays(prev, 1) === cur) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  const today = input.todayKey;
  const yesterday = addUtcDays(today, -1);
  if (unique.includes(today) || unique.includes(yesterday)) {
    let cursor = unique.includes(today) ? today : yesterday;
    current = 1;
    while (true) {
      const prev = addUtcDays(cursor, -1);
      if (!unique.includes(prev)) break;
      current += 1;
      cursor = prev;
    }
  }

  return { currentStreak: current, bestStreak: Math.max(best, current) };
}

function areAdjacentWeeks(a: string, b: string): boolean {
  return previousWeekKey(b) === a;
}

function previousWeekKey(weekKey: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return weekKey;
  // Find a Thursday in that ISO week then subtract 7 days.
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return toWeekKey(toDayKey(monday));
}

export function isCheckInComplete(value: number, targetValue: number): boolean {
  return value + 1e-9 >= Math.max(0, targetValue);
}
