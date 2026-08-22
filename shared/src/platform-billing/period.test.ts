import { describe, expect, it } from 'vitest';

import { addMonthsClamped } from '../accounting/installments.js';
import {
  calendarDaysBetween,
  computePlatformNetProfit,
  isDueDateOverdue,
  isPastGracePeriod,
  monthKey,
} from './period.js';

describe('platform billing dates', () => {
  it('marks overdue the calendar day after due date', () => {
    const due = new Date('2026-09-22T12:00:00+05:00');
    expect(isDueDateOverdue(due, new Date('2026-09-22T18:00:00+05:00'))).toBe(false);
    expect(isDueDateOverdue(due, new Date('2026-09-23T00:30:00+05:00'))).toBe(true);
  });

  it('blocks after grace days: 22.09 + 3 => 26.09', () => {
    const due = new Date('2026-09-22T12:00:00+05:00');
    expect(isPastGracePeriod(due, 3, new Date('2026-09-25T12:00:00+05:00'))).toBe(false);
    expect(isPastGracePeriod(due, 3, new Date('2026-09-26T12:00:00+05:00'))).toBe(true);
    expect(calendarDaysBetween(due, new Date('2026-09-26T12:00:00+05:00'))).toBe(4);
  });

  it('computes P&L as revenue minus expenses', () => {
    expect(computePlatformNetProfit(2_400_000, 400_000)).toBe(2_000_000);
    expect(computePlatformNetProfit(100, 250)).toBe(-150);
  });

  it('keys months in Tashkent', () => {
    expect(monthKey(new Date('2026-09-01T00:00:00+05:00'))).toBe('2026-09');
  });

  it('clamps month rollover', () => {
    expect(addMonthsClamped(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
  });
});
