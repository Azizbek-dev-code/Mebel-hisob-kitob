import { describe, expect, it } from 'vitest';

import {
  currentWeekStart,
  monthEndDayKey,
  monthStartDayKey,
  weekEndDayKey,
  weekStartDayKey,
} from './reviews.js';

describe('review period helpers', () => {
  it('resolves Monday-based week bounds', () => {
    // 2026-09-17 is Thursday → week starts 2026-09-14
    expect(weekStartDayKey('2026-09-17')).toBe('2026-09-14');
    expect(weekEndDayKey('2026-09-14')).toBe('2026-09-20');
  });

  it('resolves month bounds', () => {
    expect(monthStartDayKey('2026-09')).toBe('2026-09-01');
    expect(monthEndDayKey('2026-09')).toBe('2026-09-30');
  });

  it('current week start is a Monday key', () => {
    const start = currentWeekStart(new Date('2026-09-17T12:00:00.000Z'));
    expect(start).toBe('2026-09-14');
  });
});
