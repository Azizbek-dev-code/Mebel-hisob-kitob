import { GrowthXpSource, type GrowthXpSource as XpSource } from '../constants/enums.js';

/** Flat awards (anti-grind: not inflated). */
export const XP_TODO_COMPLETED = 15;
export const XP_HABIT_CHECK_IN = 20;
export const XP_DAILY_GOAL_DONE = 25;
export const XP_MILESTONE_REACHED = 50;
/** First personal ledger log of the UTC day (any income/expense). */
export const XP_FINANCE_DAILY_LOG = 10;
/** Flat XP per saving contribution — never ∝ amount. */
export const XP_FINANCE_CONTRIBUTION = 15;

/** Per credited focus/study minute (+ base), hard-capped per event. */
export const XP_FOCUS_BASE = 5;
export const XP_FOCUS_PER_MINUTE = 1;
export const XP_FOCUS_EVENT_CAP = 60;
export const XP_LEARNING_BASE = 5;
export const XP_LEARNING_PER_MINUTE = 1;
export const XP_LEARNING_EVENT_CAP = 80;

/** Daily ceiling across all sources — stops timer/spam farming. */
export const XP_DAILY_CAP = 800;

export type LevelProgress = {
  level: number;
  totalXp: number;
  /** XP already earned inside the current level band. */
  xpIntoLevel: number;
  /** XP needed to reach the next level from the start of this level. */
  xpForNextLevel: number;
  /** 0–100 progress within the current level. */
  percent: number;
};

/**
 * Cumulative XP required to *reach* a level (level 1 = 0).
 * Curve: 50 * n * (n - 1) → L2=100, L3=300, L4=600, L5=1000…
 */
export function xpToReachLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 50 * n * (n - 1);
}

export function levelFromTotalXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) {
    level += 1;
    if (level > 10_000) break;
  }
  return level;
}

export function computeLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelFromTotalXp(xp);
  const floor = xpToReachLevel(level);
  const ceiling = xpToReachLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = xp - floor;
  return {
    level,
    totalXp: xp,
    xpIntoLevel: into,
    xpForNextLevel: span,
    percent: Math.min(100, Math.round((into / span) * 100)),
  };
}

export function xpForFocusMinutes(creditedMinutes: number): number {
  if (creditedMinutes <= 0) return 0;
  return Math.min(
    XP_FOCUS_EVENT_CAP,
    XP_FOCUS_BASE + creditedMinutes * XP_FOCUS_PER_MINUTE,
  );
}

export function xpForLearningMinutes(creditedMinutes: number): number {
  if (creditedMinutes <= 0) return 0;
  return Math.min(
    XP_LEARNING_EVENT_CAP,
    XP_LEARNING_BASE + creditedMinutes * XP_LEARNING_PER_MINUTE,
  );
}

export function baseXpForSource(source: XpSource): number {
  switch (source) {
    case GrowthXpSource.TODO_COMPLETED:
      return XP_TODO_COMPLETED;
    case GrowthXpSource.HABIT_CHECK_IN:
      return XP_HABIT_CHECK_IN;
    case GrowthXpSource.DAILY_GOAL_DONE:
      return XP_DAILY_GOAL_DONE;
    case GrowthXpSource.MILESTONE_REACHED:
      return XP_MILESTONE_REACHED;
    case GrowthXpSource.FINANCE_DISCIPLINE:
      return XP_FINANCE_DAILY_LOG;
    default:
      return 0;
  }
}

export type StreakUpdate = {
  currentStreak: number;
  bestStreak: number;
  lastActivityDayKey: string;
};

/** Gentle streak: gap resets to 1 — no “everything is over” messaging here. */
export function nextStreakState(input: {
  todayKey: string;
  lastActivityDayKey: string | null | undefined;
  currentStreak: number;
  bestStreak: number;
}): StreakUpdate {
  const { todayKey } = input;
  const last = input.lastActivityDayKey ?? null;
  if (last === todayKey) {
    return {
      currentStreak: Math.max(1, input.currentStreak),
      bestStreak: Math.max(input.bestStreak, Math.max(1, input.currentStreak)),
      lastActivityDayKey: todayKey,
    };
  }

  const yesterday = shiftDayKey(todayKey, -1);
  let current = 1;
  if (last === yesterday) {
    current = Math.max(1, input.currentStreak) + 1;
  }

  return {
    currentStreak: current,
    bestStreak: Math.max(input.bestStreak, current),
    lastActivityDayKey: todayKey,
  };
}

function shiftDayKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Apply daily remaining cap to a proposed award. */
export function clampXpToDailyCap(proposed: number, alreadyToday: number): number {
  const remaining = Math.max(0, XP_DAILY_CAP - Math.max(0, alreadyToday));
  return Math.max(0, Math.min(Math.floor(proposed), remaining));
}
