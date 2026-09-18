import { friendshipPairKey } from './friends.js';
import { toDayKey } from './habits.js';

/** Look-back window when recomputing shared friend streaks. */
export const FRIEND_STREAK_LOOKBACK_DAYS = 60;

export const GrowthLeaderboardPeriod = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const;
export type GrowthLeaderboardPeriod =
  (typeof GrowthLeaderboardPeriod)[keyof typeof GrowthLeaderboardPeriod];

export const GROWTH_LEADERBOARD_PERIODS = Object.values(GrowthLeaderboardPeriod);

export const GrowthLeaderboardMetric = {
  XP: 'XP',
  FOCUS_MINUTES: 'FOCUS_MINUTES',
  TASKS_COMPLETED: 'TASKS_COMPLETED',
  LEVEL: 'LEVEL',
} as const;
export type GrowthLeaderboardMetric =
  (typeof GrowthLeaderboardMetric)[keyof typeof GrowthLeaderboardMetric];

export const GROWTH_LEADERBOARD_METRICS = Object.values(GrowthLeaderboardMetric);

export function shiftDayKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function periodStartDayKey(
  period: GrowthLeaderboardPeriod,
  now = new Date(),
): string {
  const today = toDayKey(now);
  if (period === GrowthLeaderboardPeriod.WEEKLY) {
    return shiftDayKey(today, -6);
  }
  return shiftDayKey(today, -29);
}

/**
 * Shared days = intersection of both activity day sets.
 * Current streak walks back from today (or yesterday if today missing for either).
 */
export function computeFriendStreakFromDays(
  aDays: ReadonlySet<string>,
  bDays: ReadonlySet<string>,
  todayKey: string,
): { currentStreak: number; bestStreak: number; lastSharedDayKey: string | null } {
  const shared: string[] = [];
  for (const day of aDays) {
    if (bDays.has(day)) shared.push(day);
  }
  shared.sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of shared) {
    if (prev && shiftDayKey(prev, 1) === day) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = day;
  }

  const yesterday = shiftDayKey(todayKey, -1);
  let anchor: string | null = null;
  if (aDays.has(todayKey) && bDays.has(todayKey)) anchor = todayKey;
  else if (aDays.has(yesterday) && bDays.has(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (aDays.has(cursor) && bDays.has(cursor)) {
      current += 1;
      cursor = shiftDayKey(cursor, -1);
    }
  }

  return {
    currentStreak: current,
    bestStreak: Math.max(best, current),
    lastSharedDayKey: anchor,
  };
}

export function orderedFriendPair(
  a: string,
  b: string,
): { identityAId: string; identityBId: string; pairKey: string } {
  const pairKey = friendshipPairKey(a, b);
  const [identityAId, identityBId] = pairKey.split(':') as [string, string];
  return { identityAId, identityBId, pairKey };
}
