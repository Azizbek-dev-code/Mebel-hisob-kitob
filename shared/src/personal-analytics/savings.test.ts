import { describe, expect, it } from 'vitest';

import { periodDeltaPercent, savingsRatePercent, utcYearMonth } from './savings.js';

describe('savingsRatePercent', () => {
  it('is the share of income kept after expenses', () => {
    expect(savingsRatePercent(100_000, 40_000)).toBe(60);
  });

  it('can be negative when expenses exceed income', () => {
    expect(savingsRatePercent(50_000, 80_000)).toBe(-60);
  });

  it('is null without income', () => {
    expect(savingsRatePercent(0, 10_000)).toBeNull();
  });
});

describe('utcYearMonth', () => {
  it('formats a UTC month key', () => {
    expect(utcYearMonth(new Date('2026-09-13T12:00:00.000Z'))).toBe('2026-09');
  });
});

describe('periodDeltaPercent', () => {
  it('is the change against the previous period', () => {
    expect(periodDeltaPercent(125_000, 100_000)).toBe(25);
    expect(periodDeltaPercent(80_000, 100_000)).toBe(-20);
  });

  it('is null without a baseline', () => {
    expect(periodDeltaPercent(50_000, 0)).toBeNull();
    expect(periodDeltaPercent(0, 0)).toBeNull();
  });
});
