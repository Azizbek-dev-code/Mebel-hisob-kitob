import { describe, expect, it } from 'vitest';

import { GrowthXpSource } from '../constants/enums.js';
import { formatCountBadge } from './notifications.js';
import {
  clampXpToDailyCap,
  computeLevelProgress,
  levelFromTotalXp,
  nextStreakState,
  xpForFocusMinutes,
  xpToReachLevel,
  XP_DAILY_CAP,
  XP_TODO_COMPLETED,
  XP_FINANCE_DAILY_LOG,
  XP_FINANCE_CONTRIBUTION,
  baseXpForSource,
} from './xp.js';

describe('level curve', () => {
  it('maps cumulative XP to levels with a rising curve', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(86);
    expect(xpToReachLevel(3)).toBe(288);
    expect(xpToReachLevel(10)).toBeGreaterThan(xpToReachLevel(5) * 3);
    expect(xpToReachLevel(21) - xpToReachLevel(20)).toBeGreaterThan(
      xpToReachLevel(11) - xpToReachLevel(10),
    );
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(85)).toBe(1);
    expect(levelFromTotalXp(86)).toBe(2);
    expect(levelFromTotalXp(288)).toBe(3);
  });

  it('computes in-level percent', () => {
    const p = computeLevelProgress(136);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(50);
    expect(p.xpForNextLevel).toBe(202);
    expect(p.percent).toBe(25);
  });

  it('never demotes a stored level when the curve gets steeper', () => {
    const p = computeLevelProgress(300, 8);
    expect(p.level).toBe(8);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.xpForNextLevel).toBeGreaterThan(0);
  });
});

describe('xp awards', () => {
  it('caps focus XP and ignores zero credit', () => {
    expect(xpForFocusMinutes(0)).toBe(0);
    expect(xpForFocusMinutes(25)).toBe(30);
    expect(xpForFocusMinutes(200)).toBe(40);
  });

  it('uses flat sources and daily cap', () => {
    expect(baseXpForSource(GrowthXpSource.TODO_COMPLETED)).toBe(XP_TODO_COMPLETED);
    expect(baseXpForSource(GrowthXpSource.FINANCE_DISCIPLINE)).toBe(XP_FINANCE_DAILY_LOG);
    expect(XP_FINANCE_CONTRIBUTION).toBe(15);
    expect(clampXpToDailyCap(100, XP_DAILY_CAP - 40)).toBe(40);
    expect(clampXpToDailyCap(50, XP_DAILY_CAP)).toBe(0);
  });
});

describe('nextStreakState', () => {
  it('increments on consecutive days', () => {
    const s = nextStreakState({
      todayKey: '2026-09-17',
      lastActivityDayKey: '2026-09-16',
      currentStreak: 5,
      bestStreak: 5,
    });
    expect(s.currentStreak).toBe(6);
    expect(s.bestStreak).toBe(6);
  });

  it('resets gently after a gap', () => {
    const s = nextStreakState({
      todayKey: '2026-09-17',
      lastActivityDayKey: '2026-09-10',
      currentStreak: 12,
      bestStreak: 20,
    });
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(20);
  });

  it('is idempotent same day', () => {
    const s = nextStreakState({
      todayKey: '2026-09-17',
      lastActivityDayKey: '2026-09-17',
      currentStreak: 3,
      bestStreak: 3,
    });
    expect(s.currentStreak).toBe(3);
  });
});

describe('formatCountBadge', () => {
  it('caps unread counts at 99+', () => {
    expect(formatCountBadge(0)).toBe('');
    expect(formatCountBadge(3)).toBe('3');
    expect(formatCountBadge(99)).toBe('99');
    expect(formatCountBadge(100)).toBe('99+');
  });
});
