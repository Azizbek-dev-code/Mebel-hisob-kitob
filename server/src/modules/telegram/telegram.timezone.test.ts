import { describe, expect, it } from 'vitest';

import { localWallTimeToUtc, zonedDayKey, zonedDayRange } from './telegram.timezone.js';

describe('telegram timezone helpers', () => {
  it('converts Tashkent wall time to UTC', () => {
    const utc = localWallTimeToUtc(
      { year: 2026, month: 9, day: 21, hour: 8, minute: 0 },
      'Asia/Tashkent',
    );
    expect(utc.toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  it('builds an exclusive local day range', () => {
    const range = zonedDayRange('2026-09-21', 'Asia/Tashkent');
    expect(range.start.toISOString()).toBe('2026-09-20T19:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-21T19:00:00.000Z');
    expect(zonedDayKey(range.start, 'Asia/Tashkent')).toBe('2026-09-21');
  });
});
