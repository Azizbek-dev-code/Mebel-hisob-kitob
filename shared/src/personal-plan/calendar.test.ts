import { describe, expect, it } from 'vitest';

import { calendarDayKey, computeRemindAt, planRangeForPreset } from './calendar.js';

describe('personal-plan calendar helpers', () => {
  it('computes remindAt from startsAt and offset', () => {
    const starts = new Date('2026-09-17T14:00:00.000Z');
    expect(computeRemindAt(starts, 30)?.toISOString()).toBe('2026-09-17T13:30:00.000Z');
    expect(computeRemindAt(starts, null)).toBeNull();
  });

  it('builds today and month ranges', () => {
    const now = new Date('2026-09-17T12:00:00.000Z');
    const today = planRangeForPreset('TODAY', now);
    expect(today.date).toBe('2026-09-17');
    expect(calendarDayKey(today.from)).toBe('2026-09-17');

    const month = planRangeForPreset('THIS_MONTH', now);
    expect(calendarDayKey(month.from)).toBe('2026-09-01');
    expect(calendarDayKey(month.to)).toBe('2026-09-30');
  });
});
