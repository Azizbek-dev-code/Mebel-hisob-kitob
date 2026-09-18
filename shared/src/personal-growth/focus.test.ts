import { describe, expect, it } from 'vitest';

import {
  FOCUS_DAILY_CREDIT_CAP_MINUTES,
  evaluateFocusCredit,
  formatFocusMinutes,
} from './focus.js';

describe('evaluateFocusCredit', () => {
  const startedAt = new Date('2026-09-17T10:00:00.000Z');

  it('credits a normal 25-minute completed session', () => {
    const endedAt = new Date('2026-09-17T10:25:05.000Z');
    const result = evaluateFocusCredit({
      plannedMinutes: 25,
      startedAt,
      endedAt,
      interrupted: false,
      alreadyCreditedTodayMinutes: 0,
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.creditedMinutes).toBe(25);
  });

  it('does not credit a 10-hour idle timer as 10 hours', () => {
    const endedAt = new Date('2026-09-17T20:00:00.000Z');
    const result = evaluateFocusCredit({
      plannedMinutes: 25,
      startedAt,
      endedAt,
      interrupted: false,
      alreadyCreditedTodayMinutes: 0,
      clientReportedSeconds: 10 * 60 * 60,
    });
    expect(result.creditedMinutes).toBe(25);
    expect(result.discardReason).toBe('CAPPED_IDLE_TIMER');
  });

  it('discards tiny accidental sessions', () => {
    const endedAt = new Date('2026-09-17T10:00:20.000Z');
    const result = evaluateFocusCredit({
      plannedMinutes: 25,
      startedAt,
      endedAt,
      interrupted: false,
      alreadyCreditedTodayMinutes: 0,
    });
    expect(result.status).toBe('DISCARDED');
    expect(result.creditedMinutes).toBe(0);
  });

  it('enforces the daily credit cap', () => {
    const endedAt = new Date('2026-09-17T10:30:00.000Z');
    const result = evaluateFocusCredit({
      plannedMinutes: 50,
      startedAt,
      endedAt,
      interrupted: false,
      alreadyCreditedTodayMinutes: FOCUS_DAILY_CREDIT_CAP_MINUTES - 10,
    });
    expect(result.creditedMinutes).toBe(10);
  });

  it('formats hours for home chips', () => {
    expect(formatFocusMinutes(140)).toBe('2h 20m');
  });
});
