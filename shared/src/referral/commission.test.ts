import { describe, expect, it } from 'vitest';

import { computeReferralCommission } from './commission.js';

describe('computeReferralCommission', () => {
  it('takes 10% of a 100000 payment as 10000', () => {
    expect(computeReferralCommission(100_000, 10)).toBe(10_000);
  });

  it('floors fractional so\'m and ignores invalid inputs', () => {
    expect(computeReferralCommission(99, 10)).toBe(9);
    expect(computeReferralCommission(100_000, 0)).toBe(0);
    expect(computeReferralCommission(-1, 10)).toBe(0);
    expect(computeReferralCommission(100.5, 10)).toBe(0);
  });
});
