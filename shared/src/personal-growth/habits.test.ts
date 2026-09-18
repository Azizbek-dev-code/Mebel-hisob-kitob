import { describe, expect, it } from 'vitest';

import { GrowthHabitFrequency } from '../constants/enums.js';
import {
  computeHabitStreak,
  isHabitDueToday,
  toDayKey,
  toWeekKey,
} from './habits.js';

describe('habit day helpers', () => {
  it('formats UTC day keys', () => {
    expect(toDayKey(new Date('2026-09-17T22:00:00.000Z'))).toBe('2026-09-17');
  });

  it('marks daily habit due until checked in', () => {
    expect(
      isHabitDueToday({
        frequency: GrowthHabitFrequency.DAILY,
        todayKey: '2026-09-17',
        completedDayKeys: ['2026-09-16'],
      }),
    ).toBe(true);
    expect(
      isHabitDueToday({
        frequency: GrowthHabitFrequency.DAILY,
        todayKey: '2026-09-17',
        completedDayKeys: ['2026-09-17'],
      }),
    ).toBe(false);
  });

  it('marks weekly habit due once per ISO week', () => {
    expect(toWeekKey('2026-09-17')).toBe(toWeekKey('2026-09-14'));
    expect(
      isHabitDueToday({
        frequency: GrowthHabitFrequency.WEEKLY,
        todayKey: '2026-09-17',
        completedDayKeys: ['2026-09-15'],
      }),
    ).toBe(false);
    expect(
      isHabitDueToday({
        frequency: GrowthHabitFrequency.WEEKLY,
        todayKey: '2026-09-17',
        completedDayKeys: ['2026-09-07'],
      }),
    ).toBe(true);
  });
});

describe('computeHabitStreak', () => {
  it('counts consecutive daily check-ins ending today', () => {
    const result = computeHabitStreak({
      frequency: GrowthHabitFrequency.DAILY,
      todayKey: '2026-09-17',
      completedDayKeys: ['2026-09-15', '2026-09-16', '2026-09-17'],
    });
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });

  it('keeps streak if yesterday was last check-in', () => {
    const result = computeHabitStreak({
      frequency: GrowthHabitFrequency.DAILY,
      todayKey: '2026-09-17',
      completedDayKeys: ['2026-09-15', '2026-09-16'],
    });
    expect(result.currentStreak).toBe(2);
  });

  it('breaks current streak after a gap', () => {
    const result = computeHabitStreak({
      frequency: GrowthHabitFrequency.DAILY,
      todayKey: '2026-09-17',
      completedDayKeys: ['2026-09-10', '2026-09-11', '2026-09-17'],
    });
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(2);
  });
});
