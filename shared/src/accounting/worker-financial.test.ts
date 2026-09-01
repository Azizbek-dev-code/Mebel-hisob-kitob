import { describe, expect, it } from 'vitest';

import { WorkerFinancialTransactionType } from '../constants/enums.js';
import {
  computeWorkerEarnedTotal,
  computeWorkerNetFinancialPosition,
  computeWorkerPaidTotal,
  getWorkerTransactionEffect,
  isWorkerAdvance,
  isWorkerAdjustment,
  isWorkerDebt,
  isWorkerEarning,
  isWorkerPayment,
  isWorkerReversal,
  signedWorkerTransactionAmount,
} from './worker-financial.js';

describe('worker-financial accounting helpers', () => {
  it('classifies BONUS and COMMISSION as earnings credits', () => {
    expect(isWorkerEarning(WorkerFinancialTransactionType.BONUS)).toBe(true);
    expect(isWorkerEarning(WorkerFinancialTransactionType.COMMISSION)).toBe(true);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.BONUS).netSign).toBe(1);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.COMMISSION).netSign).toBe(1);
  });

  it('classifies PAYMENT as already paid', () => {
    expect(isWorkerPayment(WorkerFinancialTransactionType.PAYMENT)).toBe(true);
    expect(isWorkerEarning(WorkerFinancialTransactionType.PAYMENT)).toBe(false);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.PAYMENT).netSign).toBe(-1);
  });

  it('classifies DEBT as worker debt', () => {
    expect(isWorkerDebt(WorkerFinancialTransactionType.DEBT)).toBe(true);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.DEBT).netSign).toBe(-1);
  });

  it('classifies ADVANCE as an advance debit', () => {
    expect(isWorkerAdvance(WorkerFinancialTransactionType.ADVANCE)).toBe(true);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.ADVANCE).netSign).toBe(-1);
  });

  it('classifies ADJUSTMENT as a positive manual correction', () => {
    expect(isWorkerAdjustment(WorkerFinancialTransactionType.ADJUSTMENT)).toBe(true);
    expect(getWorkerTransactionEffect(WorkerFinancialTransactionType.ADJUSTMENT).netSign).toBe(1);
  });

  it('signs amounts according to type effect', () => {
    expect(signedWorkerTransactionAmount(WorkerFinancialTransactionType.BONUS, 100_000)).toBe(
      100_000,
    );
    expect(signedWorkerTransactionAmount(WorkerFinancialTransactionType.ADVANCE, 40_000)).toBe(
      -40_000,
    );
    expect(signedWorkerTransactionAmount(WorkerFinancialTransactionType.DEBT, 10_000)).toBe(
      -10_000,
    );
    expect(signedWorkerTransactionAmount(WorkerFinancialTransactionType.PAYMENT, 25_000)).toBe(
      -25_000,
    );
  });

  it('computes netFinancialPosition without calling it salary/payroll', () => {
    const net = computeWorkerNetFinancialPosition({
      totalBonuses: 500_000,
      totalCommissions: 200_000,
      totalAdvances: 100_000,
      totalDebt: 50_000,
      totalPayments: 150_000,
      totalAdjustments: 25_000,
    });
    // 500k + 200k + 25k − 100k − 50k − 150k = 425_000
    expect(net).toBe(425_000);
  });

  it('covers every creatable type with a deterministic effect', () => {
    for (const type of Object.values(WorkerFinancialTransactionType)) {
      if (type === WorkerFinancialTransactionType.REVERSAL) continue;
      const effect = getWorkerTransactionEffect(type);
      expect(effect.type).toBe(type);
      expect(effect.netSign === 1 || effect.netSign === -1).toBe(true);
    }
  });

  it('REVERSAL offsets BONUS / COMMISSION / ADJUSTMENT to net zero', () => {
    for (const type of [
      WorkerFinancialTransactionType.BONUS,
      WorkerFinancialTransactionType.COMMISSION,
      WorkerFinancialTransactionType.ADJUSTMENT,
    ] as const) {
      expect(
        signedWorkerTransactionAmount(type, 500_000) +
          signedWorkerTransactionAmount(
            WorkerFinancialTransactionType.REVERSAL,
            500_000,
            type,
          ),
      ).toBe(0);
    }
  });

  it('REVERSAL offsets ADVANCE / DEBT / PAYMENT to net zero', () => {
    for (const type of [
      WorkerFinancialTransactionType.ADVANCE,
      WorkerFinancialTransactionType.DEBT,
      WorkerFinancialTransactionType.PAYMENT,
    ] as const) {
      expect(
        signedWorkerTransactionAmount(type, 300_000) +
          signedWorkerTransactionAmount(
            WorkerFinancialTransactionType.REVERSAL,
            300_000,
            type,
          ),
      ).toBe(0);
    }
  });

  it('includes reversal offsets in computeWorkerNetFinancialPosition', () => {
    expect(
      computeWorkerNetFinancialPosition({
        totalBonuses: 500_000,
        totalCommissions: 0,
        totalAdvances: 0,
        totalDebt: 0,
        totalPayments: 0,
        totalAdjustments: 0,
        reversalsByOriginalType: { BONUS: 500_000 },
      }),
    ).toBe(0);

    expect(
      computeWorkerNetFinancialPosition({
        totalBonuses: 0,
        totalCommissions: 0,
        totalAdvances: 300_000,
        totalDebt: 0,
        totalPayments: 0,
        totalAdjustments: 0,
        reversalsByOriginalType: { ADVANCE: 300_000 },
      }),
    ).toBe(0);
  });

  it('nets earned after commission reversal (cancel flow)', () => {
    expect(
      computeWorkerEarnedTotal({
        totalBonuses: 0,
        totalCommissions: 650_000,
        totalAdvances: 0,
        totalDebt: 0,
        totalPayments: 0,
        totalAdjustments: 0,
        reversalsByOriginalType: { COMMISSION: 650_000 },
      }),
    ).toBe(0);

    expect(
      computeWorkerPaidTotal({
        totalBonuses: 0,
        totalCommissions: 0,
        totalAdvances: 0,
        totalDebt: 0,
        totalPayments: 600_000,
        totalAdjustments: 0,
        reversalsByOriginalType: { PAYMENT: 100_000 },
      }),
    ).toBe(500_000);
  });

  it('identifies REVERSAL kind', () => {
    expect(isWorkerReversal(WorkerFinancialTransactionType.REVERSAL)).toBe(true);
    expect(
      getWorkerTransactionEffect(
        WorkerFinancialTransactionType.REVERSAL,
        WorkerFinancialTransactionType.BONUS,
      ).kind,
    ).toBe('reversal');
  });
});
