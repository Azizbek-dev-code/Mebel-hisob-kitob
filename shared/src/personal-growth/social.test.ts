import { describe, expect, it } from 'vitest';

import {
  computeFriendStreakFromDays,
  orderedFriendPair,
  periodStartDayKey,
  shiftDayKey,
} from './social.js';

describe('friend streak + leaderboard helpers', () => {
  it('orders pair canonically', () => {
    expect(orderedFriendPair('b', 'a').pairKey).toBe('a:b');
    expect(orderedFriendPair('a', 'b').identityAId).toBe('a');
  });

  it('computes shared current and best streaks', () => {
    const a = new Set(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']);
    const b = new Set(['2026-09-15', '2026-09-16', '2026-09-17']);
    const result = computeFriendStreakFromDays(a, b, '2026-09-17');
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
    expect(result.lastSharedDayKey).toBe('2026-09-17');
  });

  it('allows yesterday anchor when today is incomplete', () => {
    const a = new Set(['2026-09-15', '2026-09-16']);
    const b = new Set(['2026-09-15', '2026-09-16']);
    const result = computeFriendStreakFromDays(a, b, '2026-09-17');
    expect(result.currentStreak).toBe(2);
    expect(result.lastSharedDayKey).toBe('2026-09-16');
  });

  it('shifts period windows', () => {
    expect(shiftDayKey('2026-09-17', -6)).toBe('2026-09-11');
    expect(periodStartDayKey('WEEKLY', new Date('2026-09-17T12:00:00.000Z'))).toBe(
      '2026-09-11',
    );
  });
});
