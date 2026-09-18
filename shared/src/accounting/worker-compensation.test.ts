import { describe, expect, it } from 'vitest';

import {
  calculateFixedCompensation,
  calculatePercentageCompensation,
  calculateWorkerCompensation,
  compensationDateRangesOverlap,
  findCompensationRuleForTypeOnDate,
  findSellerCompensationRuleForRecalculation,
  findSellerCompensationRuleForSaleDate,
  isCompensationRuleEffectiveOn,
  MAX_COMPENSATION_BASIS_POINTS,
} from './worker-compensation.js';
import { WorkerCompensationType } from '../constants/enums.js';

describe('calculatePercentageCompensation', () => {
  it('computes 10% of sale with integer truncation', () => {
    expect(calculatePercentageCompensation(9_500_000, 1000)).toBe(950_000);
  });

  it('computes 10% of gross profit', () => {
    expect(calculatePercentageCompensation(2_500_000, 1000)).toBe(250_000);
  });

  it('computes 7.5% via basis points', () => {
    expect(calculatePercentageCompensation(10_000_000, 750)).toBe(750_000);
  });

  it('truncates toward zero (floor for positive amounts)', () => {
    // 100 * 333 / 10000 = 3.33 → 3
    expect(calculatePercentageCompensation(100, 333)).toBe(3);
  });

  it('handles large amounts without overflow', () => {
    expect(calculatePercentageCompensation(999_999_999_999, 1000)).toBe(99_999_999_999);
  });

  it('rejects zero and negative basis points', () => {
    expect(() => calculatePercentageCompensation(1_000_000, 0)).toThrow(/basisPoints/);
    expect(() => calculatePercentageCompensation(1_000_000, -100)).toThrow(/basisPoints/);
  });

  it('rejects basis points above 100%', () => {
    expect(() =>
      calculatePercentageCompensation(1_000_000, MAX_COMPENSATION_BASIS_POINTS + 1),
    ).toThrow(/basisPoints/);
  });

  it('rejects negative base amount', () => {
    expect(() => calculatePercentageCompensation(-1, 1000)).toThrow(/baseAmount/);
  });
});

describe('calculateFixedCompensation', () => {
  it('returns the fixed so\'m amount', () => {
    expect(calculateFixedCompensation(50_000)).toBe(50_000);
  });

  it('rejects zero and negative', () => {
    expect(() => calculateFixedCompensation(0)).toThrow(/amount/);
    expect(() => calculateFixedCompensation(-10)).toThrow(/amount/);
  });
});

describe('calculateWorkerCompensation', () => {
  it('dispatches percent and fixed types', () => {
    expect(
      calculateWorkerCompensation({
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        baseAmount: 9_500_000,
      }),
    ).toBe(950_000);

    expect(
      calculateWorkerCompensation({
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 50_000,
      }),
    ).toBe(50_000);
  });
});

describe('compensationDateRangesOverlap', () => {
  const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

  it('detects overlapping inclusive ranges', () => {
    expect(
      compensationDateRangesOverlap(d('2026-01-01'), d('2026-08-31'), d('2026-08-01'), d('2026-12-31')),
    ).toBe(true);
  });

  it('allows adjacent non-overlapping ranges', () => {
    expect(
      compensationDateRangesOverlap(d('2026-01-01'), d('2026-06-30'), d('2026-07-01'), null),
    ).toBe(false);
  });

  it('treats null end as open-ended', () => {
    expect(
      compensationDateRangesOverlap(d('2026-01-01'), null, d('2026-07-01'), d('2026-12-31')),
    ).toBe(true);
  });
});

describe('isCompensationRuleEffectiveOn / findCompensationRuleForTypeOnDate', () => {
  const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

  const ruleA = {
    id: 'r1',
    type: WorkerCompensationType.PERCENT_OF_SALE,
    value: 1000,
    effectiveFrom: d('2026-01-01'),
    effectiveTo: d('2026-06-30'),
  };
  const ruleB = {
    id: 'r2',
    type: WorkerCompensationType.PERCENT_OF_SALE,
    value: 1200,
    effectiveFrom: d('2026-07-01'),
    effectiveTo: null,
  };

  it('selects the rule covering the event date', () => {
    expect(findCompensationRuleForTypeOnDate([ruleA, ruleB], WorkerCompensationType.PERCENT_OF_SALE, d('2026-03-15'))?.id).toBe('r1');
    expect(findCompensationRuleForTypeOnDate([ruleA, ruleB], WorkerCompensationType.PERCENT_OF_SALE, d('2026-08-01'))?.id).toBe('r2');
  });

  it('returns null when no rule covers the date', () => {
    expect(
      findCompensationRuleForTypeOnDate([ruleA], WorkerCompensationType.PERCENT_OF_SALE, d('2026-08-01')),
    ).toBeNull();
  });

  it('rejects dates outside effective window', () => {
    expect(isCompensationRuleEffectiveOn(ruleA, d('2025-12-31'))).toBe(false);
    expect(isCompensationRuleEffectiveOn(ruleA, d('2026-06-30'))).toBe(true);
  });

  it('covers morning instants on the start civil day (noon-UTC calendar dates)', () => {
    expect(
      isCompensationRuleEffectiveOn(
        { effectiveFrom: d('2026-08-26'), effectiveTo: null },
        new Date('2026-08-26T04:33:00.000Z'),
      ),
    ).toBe(true);
    expect(
      isCompensationRuleEffectiveOn(
        { effectiveFrom: d('2026-08-26'), effectiveTo: null },
        new Date('2026-08-25T23:59:59.000Z'),
      ),
    ).toBe(false);
  });

  it('includes the whole UTC civil end day, not only up to noon', () => {
    expect(
      isCompensationRuleEffectiveOn(
        { effectiveFrom: d('2026-08-01'), effectiveTo: d('2026-08-26') },
        new Date('2026-08-26T18:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('findSellerCompensationRuleForSaleDate', () => {
  const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

  it('prefers a rule whose window covers the saleDate', () => {
    const historical = {
      id: 'r-old',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 500,
      isActive: true,
      effectiveFrom: d('2026-01-01'),
      effectiveTo: d('2026-06-30'),
    };
    const current = {
      id: 'r-new',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      isActive: true,
      effectiveFrom: d('2026-07-01'),
      effectiveTo: null,
    };
    expect(
      findSellerCompensationRuleForSaleDate(
        [historical, current],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-03-15'),
      )?.id,
    ).toBe('r-old');
  });

  it('backfills open-ended active rate onto saleDate before effectiveFrom', () => {
    const rule = {
      id: 'r-today',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      isActive: true,
      effectiveFrom: d('2026-09-18'),
      effectiveTo: null,
    };
    expect(
      findSellerCompensationRuleForSaleDate(
        [rule],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-08-01'),
      )?.id,
    ).toBe('r-today');
  });

  it('does not extend a closed effectiveTo window into the past gap', () => {
    const closed = {
      id: 'r-closed',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      isActive: true,
      effectiveFrom: d('2026-09-01'),
      effectiveTo: d('2026-09-30'),
    };
    expect(
      findSellerCompensationRuleForSaleDate(
        [closed],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-08-01'),
      ),
    ).toBeNull();
  });

  it('does not backfill inactive open-ended rules', () => {
    const inactive = {
      id: 'r-off',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      isActive: false,
      effectiveFrom: d('2026-09-18'),
      effectiveTo: null,
    };
    expect(
      findSellerCompensationRuleForSaleDate(
        [inactive],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-08-01'),
      ),
    ).toBeNull();
  });
});

describe('findSellerCompensationRuleForRecalculation', () => {
  const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

  it('prefers the current open-ended active rule over a historical covering window', () => {
    const historical = {
      id: 'r-old',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 500,
      isActive: true,
      effectiveFrom: d('2026-01-01'),
      effectiveTo: d('2026-08-31'),
    };
    const current = {
      id: 'r-new',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      isActive: true,
      effectiveFrom: d('2026-09-18'),
      effectiveTo: null,
    };
    expect(
      findSellerCompensationRuleForRecalculation(
        [historical, current],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-08-01'),
        d('2026-09-18'),
      )?.id,
    ).toBe('r-new');
  });

  it('falls back to the saleDate covering rule when no current open rule exists', () => {
    const historical = {
      id: 'r-old',
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 500,
      isActive: true,
      effectiveFrom: d('2026-01-01'),
      effectiveTo: d('2026-08-31'),
    };
    expect(
      findSellerCompensationRuleForRecalculation(
        [historical],
        WorkerCompensationType.PERCENT_OF_SALE,
        d('2026-08-01'),
        d('2026-09-18'),
      )?.id,
    ).toBe('r-old');
  });
});
