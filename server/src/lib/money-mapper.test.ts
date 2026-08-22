import { describe, expect, it } from 'vitest';

import { fromDbMoney, fromDbMoneySum, toDbMoney } from './money-mapper.js';

describe('toDbMoney', () => {
  it('converts whole so\u2019m to bigint', () => {
    expect(toDbMoney(9_500_000)).toBe(9_500_000n);
    expect(toDbMoney(0)).toBe(0n);
  });

  it('rejects fractional amounts rather than silently truncating', () => {
    expect(() => toDbMoney(1000.5)).toThrow(TypeError);
  });

  it('rejects values that would overflow the accepted range', () => {
    expect(() => toDbMoney(1e15)).toThrow(RangeError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => toDbMoney(Number.NaN)).toThrow(TypeError);
    expect(() => toDbMoney(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('fromDbMoney', () => {
  it('converts bigint back to number losslessly', () => {
    expect(fromDbMoney(9_500_000n)).toBe(9_500_000);
  });

  it('treats a missing column as zero', () => {
    expect(fromDbMoney(null)).toBe(0);
    expect(fromDbMoney(undefined)).toBe(0);
  });

  it('refuses to lose precision above Number.MAX_SAFE_INTEGER', () => {
    expect(() => fromDbMoney(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
  });

  it('round-trips through the database representation', () => {
    const amounts = [0, 1, 999, 9_500_000, 1_200_000_000];
    amounts.forEach((amount) => {
      expect(fromDbMoney(toDbMoney(amount))).toBe(amount);
    });
  });
});

describe('fromDbMoneySum', () => {
  it('turns an empty aggregate into zero', () => {
    expect(fromDbMoneySum(null)).toBe(0);
    expect(fromDbMoneySum(7_000_000n)).toBe(7_000_000);
  });
});
