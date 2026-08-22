import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercentDelta,
  initialsOf,
  percentChange,
} from './format';

describe('formatDate', () => {
  it('renders day-first dates', () => {
    expect(formatDate('2026-09-08T00:00:00.000Z')).toBe('08.09.2026');
  });

  it('falls back to an em dash for unparseable input', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});

describe('formatMoney', () => {
  it('is re-exported from the shared accounting utilities', () => {
    expect(formatMoney(9_500_000)).toBe("9\u00A0500\u00A0000 so'm");
  });
});

describe('percentChange / formatPercentDelta', () => {
  it('computes growth between two periods', () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(80, 100)).toBeCloseTo(-20);
  });

  it('returns null when the previous period was zero', () => {
    expect(percentChange(500, 0)).toBeNull();
  });

  it('formats deltas with an explicit plus sign', () => {
    expect(formatPercentDelta(18.62)).toBe('+18.6%');
    expect(formatPercentDelta(-2.14)).toBe('-2.1%');
    expect(formatPercentDelta(0)).toBe('0%');
  });
});

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Anvar Aliyev')).toBe('AA');
    expect(initialsOf('  ali  ')).toBe('A');
  });
});
