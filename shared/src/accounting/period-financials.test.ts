import { describe, expect, it } from 'vitest';

import {
  moneyChangePercent,
  moneySharePercent,
  periodNetProfit,
} from './period-financials.js';

describe('period-financials', () => {
  it('computes net profit as gross profit minus operating expenses', () => {
    expect(periodNetProfit(2_500_000, 2_100_000)).toBe(400_000);
  });

  it('returns null change percent when previous is zero', () => {
    expect(moneyChangePercent(100, 0)).toBeNull();
    expect(moneyChangePercent(0, 0)).toBeNull();
  });

  it('computes change percent from integer totals', () => {
    expect(moneyChangePercent(150, 100)).toBe(50);
    expect(moneyChangePercent(50, 100)).toBe(-50);
  });

  it('computes category share without floating money amounts', () => {
    expect(moneySharePercent(850_000, 2_100_000)).toBe(40.5);
    expect(moneySharePercent(100, 0)).toBeNull();
  });

  it('matches the Step 3 sanity formula', () => {
    const revenue = 9_500_000;
    const cogs = 7_000_000;
    const operatingExpenses = 2_100_000;
    const grossProfit = revenue - cogs;
    expect(grossProfit).toBe(2_500_000);
    expect(periodNetProfit(grossProfit, operatingExpenses)).toBe(400_000);
  });
});
