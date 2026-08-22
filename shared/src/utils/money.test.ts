import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyNumber,
  isValidMoney,
  parseMoneyInput,
  splitMoneyEvenly,
  subtractMoney,
  sumMoney,
} from './money.js';

describe('formatMoneyNumber', () => {
  it('groups thousands with a non-breaking space', () => {
    expect(formatMoneyNumber(9_500_000)).toBe('9\u00A0500\u00A0000');
    expect(formatMoneyNumber(1_000)).toBe('1\u00A0000');
    expect(formatMoneyNumber(999)).toBe('999');
    expect(formatMoneyNumber(0)).toBe('0');
  });

  it('keeps the sign in front of negative amounts', () => {
    expect(formatMoneyNumber(-1_200_000)).toBe('-1\u00A0200\u00A0000');
  });
});

describe('formatMoney', () => {
  it('appends the currency suffix', () => {
    expect(formatMoney(9_500_000)).toBe("9\u00A0500\u00A0000 so'm");
  });
});

describe('formatMoneyCompact', () => {
  it('abbreviates by magnitude', () => {
    expect(formatMoneyCompact(950)).toBe('950');
    expect(formatMoneyCompact(12_000)).toBe('12 ming');
    expect(formatMoneyCompact(9_500_000)).toBe('9.5 mln');
    expect(formatMoneyCompact(1_200_000_000)).toBe('1.2 mlrd');
  });

  it('drops a trailing .0', () => {
    expect(formatMoneyCompact(9_000_000)).toBe('9 mln');
  });
});

describe('parseMoneyInput', () => {
  it('accepts the separators a cashier is likely to type', () => {
    expect(parseMoneyInput('9 500 000')).toBe(9_500_000);
    expect(parseMoneyInput('9\u00A0500\u00A0000')).toBe(9_500_000);
    expect(parseMoneyInput("9'500'000")).toBe(9_500_000);
    expect(parseMoneyInput('9,500,000')).toBe(9_500_000);
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('   ')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
  });

  it('rounds fractional input to whole so\u2019m', () => {
    expect(parseMoneyInput('1000.4')).toBe(1000);
    expect(parseMoneyInput('1000.6')).toBe(1001);
  });
});

describe('sumMoney / subtractMoney', () => {
  it('adds amounts', () => {
    expect(sumMoney(7_000_000, 100_000, 300_000, 150_000)).toBe(7_550_000);
  });

  it('never returns a negative balance', () => {
    expect(subtractMoney(9_000_000, 2_000_000)).toBe(7_000_000);
    expect(subtractMoney(2_000_000, 9_000_000)).toBe(0);
  });
});

describe('splitMoneyEvenly', () => {
  it('splits a remainder-free total into equal parts', () => {
    expect(splitMoneyEvenly(7_000_000, 7)).toEqual([
      1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000,
    ]);
  });

  it('pushes the rounding remainder onto the final part so the parts sum to the total', () => {
    const parts = splitMoneyEvenly(7_000_000, 3);
    expect(parts).toEqual([2_333_333, 2_333_333, 2_333_334]);
    expect(sumMoney(...parts)).toBe(7_000_000);
  });

  it('returns an empty schedule for a non-positive count', () => {
    expect(splitMoneyEvenly(1_000_000, 0)).toEqual([]);
  });
});

describe('isValidMoney', () => {
  it('rejects anything that is not a non-negative whole number', () => {
    expect(isValidMoney(1_000)).toBe(true);
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidMoney(1.5)).toBe(false);
    expect(isValidMoney(Number.NaN)).toBe(false);
    expect(isValidMoney('1000')).toBe(false);
  });
});
