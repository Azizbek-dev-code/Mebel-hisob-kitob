import { describe, expect, it } from 'vitest';

import { WorkerCompensationType } from '../constants/enums.js';
import {
  estimateRemainingSaleProfit,
  estimateSellerCommission,
  formatBasisPointsAsPercentLabel,
  resolveSaleFeeAliases,
} from './sale-fees.js';

describe('resolveSaleFeeAliases', () => {
  it('prefers assemblerFee / driverFee over legacy names', () => {
    expect(
      resolveSaleFeeAliases({
        assemblerFee: 300_000,
        driverFee: 150_000,
        installationCost: 1,
        deliveryCost: 2,
      }),
    ).toEqual({ installationCost: 300_000, deliveryCost: 150_000 });
  });

  it('falls back to installationCost / deliveryCost', () => {
    expect(
      resolveSaleFeeAliases({
        installationCost: 80_000,
        deliveryCost: 40_000,
      }),
    ).toEqual({ installationCost: 80_000, deliveryCost: 40_000 });
  });

  it('leaves unset fields undefined', () => {
    expect(resolveSaleFeeAliases({ assemblerFee: 10_000 })).toEqual({
      installationCost: 10_000,
      deliveryCost: undefined,
    });
  });
});

describe('estimateSellerCommission', () => {
  const saleDate = new Date('2026-08-08T12:00:00.000Z');

  it('estimates PERCENT_OF_SALE from an active rule', () => {
    const result = estimateSellerCommission({
      rules: [
        {
          id: 'r1',
          type: WorkerCompensationType.PERCENT_OF_SALE,
          value: 1000,
          isActive: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      ],
      saleDate,
      totalSalePrice: 9_500_000,
      grossProfit: 2_500_000,
    });
    expect(result.amount).toBe(950_000);
    expect(result.rateLabel).toBe('10%');
    expect(result.ruleType).toBe(WorkerCompensationType.PERCENT_OF_SALE);
  });

  it('returns zero and null label when no active rule', () => {
    const result = estimateSellerCommission({
      rules: [
        {
          id: 'r1',
          type: WorkerCompensationType.PERCENT_OF_SALE,
          value: 1000,
          isActive: false,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      ],
      saleDate,
      totalSalePrice: 9_500_000,
      grossProfit: 2_500_000,
    });
    expect(result.amount).toBe(0);
    expect(result.rateLabel).toBeNull();
    expect(result.ruleType).toBeNull();
  });

  it('estimates FIXED_PER_SALE', () => {
    const result = estimateSellerCommission({
      rules: [
        {
          id: 'r2',
          type: WorkerCompensationType.FIXED_PER_SALE,
          value: 200_000,
          isActive: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      ],
      saleDate,
      totalSalePrice: 9_500_000,
      grossProfit: 2_500_000,
    });
    expect(result.amount).toBe(200_000);
    expect(result.rateLabel).toBe("qat'iy");
  });
});

describe('formatBasisPointsAsPercentLabel', () => {
  it('formats whole and fractional percents', () => {
    expect(formatBasisPointsAsPercentLabel(1000)).toBe('10%');
    expect(formatBasisPointsAsPercentLabel(250)).toBe('2.5%');
  });
});

describe('estimateRemainingSaleProfit', () => {
  it('subtracts seller estimate and usta/shopir fees from gross', () => {
    expect(
      estimateRemainingSaleProfit({
        grossProfit: 2_500_000,
        sellerCommissionEstimate: 950_000,
        assemblerFee: 300_000,
        driverFee: 150_000,
      }),
    ).toBe(1_100_000);
  });
});
