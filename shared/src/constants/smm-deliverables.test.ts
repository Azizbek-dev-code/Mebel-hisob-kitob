import { describe, expect, it } from 'vitest';

import {
  computeDeliverableTotalsFromFrequency,
  contractRemainingDays,
  inclusiveDaySpan,
} from './smm.js';

describe('computeDeliverableTotalsFromFrequency', () => {
  it('expands weekly frequency across a month', () => {
    const start = new Date('2026-09-01T00:00:00.000Z');
    const end = new Date('2026-09-30T00:00:00.000Z');
    expect(inclusiveDaySpan(start, end)).toBe(30);
    expect(
      computeDeliverableTotalsFromFrequency(
        { REELS: { count: 3, unit: 'week' }, POST: { count: 2, unit: 'week' } },
        start,
        end,
      ),
    ).toEqual({ REELS: 15, POST: 10 });
  });

  it('expands daily and monthly units', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T00:00:00.000Z');
    expect(
      computeDeliverableTotalsFromFrequency(
        {
          STORY: { count: 1, unit: 'day' },
          VIDEO: { count: 2, unit: 'month' },
        },
        start,
        end,
      ),
    ).toEqual({ STORY: 31, VIDEO: 4 });
  });

  it('returns empty for missing frequency or inverted range', () => {
    const start = new Date('2026-09-10T00:00:00.000Z');
    const end = new Date('2026-09-01T00:00:00.000Z');
    expect(computeDeliverableTotalsFromFrequency(null, start, end)).toEqual({});
    expect(
      computeDeliverableTotalsFromFrequency({ REELS: { count: 1, unit: 'week' } }, start, end),
    ).toEqual({});
  });
});

describe('contractRemainingDays', () => {
  it('counts whole remaining calendar days', () => {
    const now = new Date('2026-09-29T15:00:00.000Z');
    expect(contractRemainingDays(new Date('2026-10-05T00:00:00.000Z'), now)).toBe(6);
    expect(contractRemainingDays(new Date('2026-09-20T00:00:00.000Z'), now)).toBe(-9);
    expect(contractRemainingDays(null, now)).toBeNull();
  });
});
