import { describe, expect, it } from 'vitest';

import { GrowthXpSource } from '../constants/enums.js';
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
  it('maps cumulative XP to levels', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(300);
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(99)).toBe(1);
    expect(levelFromTotalXp(100)).toBe(2);
    expect(levelFromTotalXp(300)).toBe(3);
  });

  it('computes in-level percent', () => {
    const p = computeLevelProgress(150);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(50);
    expect(p.xpForNextLevel).toBe(200);
    expect(p.percent).toBe(25);
  });
});

describe('xp awards', () => {
  it('caps focus XP and ignores zero credit', () => {
    expect(xpForFocusMinutes(0)).toBe(0);
    expect(xpForFocusMinutes(25)).toBe(30);
    expect(xpForFocusMinutes(200)).toBe(60);
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
