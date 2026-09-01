import { describe, expect, it } from 'vitest';

import { WorkerCompensationType } from '../constants/enums.js';
import {
  computeSellerCommissionLines,
  estimateRemainingSaleProfit,
  estimateSellerCommission,
  formatBasisPointsAsPercentLabel,
  resolveSaleFeeAliases,
} from './sale-fees.js';

const SALE_DATE = new Date('2026-08-08T12:00:00.000Z');

function grossProfitRule(basisPoints = 1500) {
  return {
    id: 'r-gross',
    type: WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
    value: basisPoints,
    isActive: true,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
  };
}

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
      saleDate: SALE_DATE,
      totalSalePrice: 9_500_000,
      grossProfit: 2_500_000,
    });
    expect(result.amount).toBe(950_000);
    expect(result.rateLabel).toBe('10%');
    expect(result.ruleType).toBe(WorkerCompensationType.PERCENT_OF_SALE);
  });

  it('returns zero and null label when no rule covers the sale date', () => {
    const result = estimateSellerCommission({
      rules: [
        {
          id: 'r1',
          type: WorkerCompensationType.PERCENT_OF_SALE,
          value: 1000,
          isActive: true,
          effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
          effectiveTo: new Date('2025-12-31T00:00:00.000Z'),
        },
      ],
      saleDate: SALE_DATE,
      totalSalePrice: 9_500_000,
      grossProfit: 2_500_000,
    });
    expect(result.amount).toBe(0);
    expect(result.rateLabel).toBeNull();
    expect(result.ruleType).toBeNull();
  });

  it('TEST 1: 9M sale / 6M cost / 15% → 450k from yalpi foyda', () => {
    const result = estimateSellerCommission({
      rules: [grossProfitRule()],
      saleDate: SALE_DATE,
      totalSalePrice: 9_000_000,
      grossProfit: 3_000_000,
    });
    expect(result.amount).toBe(450_000);
    expect(result.rateLabel).toBe('15%');
    expect(result.ruleType).toBe(WorkerCompensationType.PERCENT_OF_GROSS_PROFIT);
  });

  it('TEST 2: 10M sale / 7M cost / 15% → 450k', () => {
    expect(
      estimateSellerCommission({
        rules: [grossProfitRule()],
        saleDate: SALE_DATE,
        totalSalePrice: 10_000_000,
        grossProfit: 3_000_000,
      }).amount,
    ).toBe(450_000);
  });

  it('TEST 3: 10M sale / 9M cost / 15% → 150k', () => {
    expect(
      estimateSellerCommission({
        rules: [grossProfitRule()],
        saleDate: SALE_DATE,
        totalSalePrice: 10_000_000,
        grossProfit: 1_000_000,
      }).amount,
    ).toBe(150_000);
  });

  it('TEST 4: zero gross profit → 0 commission', () => {
    expect(
      estimateSellerCommission({
        rules: [grossProfitRule()],
        saleDate: SALE_DATE,
        totalSalePrice: 10_000_000,
        grossProfit: 0,
      }).amount,
    ).toBe(0);
  });

  it('TEST 5: negative gross profit → 0 commission', () => {
    const result = estimateSellerCommission({
      rules: [grossProfitRule()],
      saleDate: SALE_DATE,
      totalSalePrice: 10_000_000,
      grossProfit: -1_000_000,
    });
    expect(result.amount).toBe(0);
    expect(result.ruleType).toBeNull();
  });

  it('TEST 6: usta/shopir fees do not reduce the seller commission base', () => {
    const lines = computeSellerCommissionLines({
      rules: [grossProfitRule()],
      saleDate: SALE_DATE,
      totalSalePrice: 10_000_000,
      grossProfit: 3_000_000,
    });
    expect(lines[0]?.amount).toBe(450_000);
    expect(lines[0]?.baseAmount).toBe(3_000_000);
    expect(lines[0]?.baseLabel).toBe('Yalpi foyda');

    const remaining = estimateRemainingSaleProfit({
      grossProfit: 3_000_000,
      sellerCommissionEstimate: 450_000,
      assemblerFee: 300_000,
      driverFee: 200_000,
    });
    expect(remaining).toBe(2_050_000);
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
      saleDate: SALE_DATE,
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

  it('9M / 6M / 15% seller + 300k usta + 180k shopir → 2_070_000 remaining', () => {
    expect(
      estimateRemainingSaleProfit({
        grossProfit: 3_000_000,
        sellerCommissionEstimate: 450_000,
        assemblerFee: 300_000,
        driverFee: 180_000,
      }),
    ).toBe(2_070_000);
  });
});
