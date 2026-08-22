import { describe, expect, it } from 'vitest';

import { SalePaymentStatus } from '../constants/enums.js';

import { calculateSaleTotals, deriveSalePaymentStatus } from './sale-totals.js';

const bedroomSet = { quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_000_000 };

describe('calculateSaleTotals — accounting scenarios', () => {
  it('scenario 1: gross profit is sale price minus cost price', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet] });

    expect(totals.totalSalePrice).toBe(9_000_000);
    expect(totals.totalCostPrice).toBe(7_000_000);
    expect(totals.grossProfit).toBe(2_000_000);
  });

  it('scenario 2: a deposit reduces the remaining balance', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet], depositAmount: 2_000_000 });

    expect(totals.depositAmount).toBe(2_000_000);
    expect(totals.paidAmount).toBe(2_000_000);
    expect(totals.remainingAmount).toBe(7_000_000);
    expect(totals.paymentStatus).toBe(SalePaymentStatus.PARTIALLY_PAID);
  });

  it('scenario 3: net profit subtracts bonus, installation and delivery', () => {
    const totals = calculateSaleTotals({
      items: [bedroomSet],
      costs: {
        sellerBonus: 100_000,
        installationCost: 300_000,
        deliveryCost: 150_000,
      },
    });

    expect(totals.grossProfit).toBe(2_000_000);
    expect(totals.additionalCosts).toBe(550_000);
    expect(totals.netProfit).toBe(1_450_000);
  });
});

describe('calculateSaleTotals — line maths', () => {
  it('multiplies each line by its quantity', () => {
    const totals = calculateSaleTotals({
      items: [
        { quantity: 2, unitCostPrice: 1_000_000, unitSalePrice: 1_500_000 },
        { quantity: 3, unitCostPrice: 200_000, unitSalePrice: 350_000 },
      ],
    });

    expect(totals.lines[0]?.lineSaleTotal).toBe(3_000_000);
    expect(totals.lines[1]?.lineCostTotal).toBe(600_000);
    expect(totals.subtotal).toBe(4_050_000);
    expect(totals.totalCostPrice).toBe(2_600_000);
    expect(totals.grossProfit).toBe(1_450_000);
  });

  it('applies a discount to the subtotal', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet], discountAmount: 500_000 });

    expect(totals.subtotal).toBe(9_000_000);
    expect(totals.discountAmount).toBe(500_000);
    expect(totals.totalSalePrice).toBe(8_500_000);
    expect(totals.grossProfit).toBe(1_500_000);
  });

  it('never lets a discount exceed the subtotal', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet], discountAmount: 99_000_000 });

    expect(totals.discountAmount).toBe(9_000_000);
    expect(totals.totalSalePrice).toBe(0);
  });
});

describe('calculateSaleTotals — balances', () => {
  it('reports a full payment as PAID with nothing remaining', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet], depositAmount: 9_000_000 });

    expect(totals.remainingAmount).toBe(0);
    expect(totals.paymentStatus).toBe(SalePaymentStatus.PAID);
  });

  it('reports an untouched sale as UNPAID', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet] });

    expect(totals.paidAmount).toBe(0);
    expect(totals.remainingAmount).toBe(9_000_000);
    expect(totals.paymentStatus).toBe(SalePaymentStatus.UNPAID);
  });

  it('never produces a negative remaining amount, even when overpaid', () => {
    const totals = calculateSaleTotals({
      items: [bedroomSet],
      depositAmount: 2_000_000,
      additionalPaidAmount: 50_000_000,
    });

    expect(totals.paidAmount).toBe(9_000_000);
    expect(totals.remainingAmount).toBe(0);
  });

  it('caps the deposit at the sale total', () => {
    const totals = calculateSaleTotals({ items: [bedroomSet], depositAmount: 20_000_000 });

    expect(totals.depositAmount).toBe(9_000_000);
    expect(totals.remainingAmount).toBe(0);
  });

  it('adds later payments on top of the deposit', () => {
    const totals = calculateSaleTotals({
      items: [bedroomSet],
      depositAmount: 2_000_000,
      additionalPaidAmount: 3_000_000,
    });

    expect(totals.paidAmount).toBe(5_000_000);
    expect(totals.remainingAmount).toBe(4_000_000);
  });
});

describe('calculateSaleTotals — loss making sales', () => {
  it('reports a negative gross profit rather than hiding it at zero', () => {
    const totals = calculateSaleTotals({
      items: [{ quantity: 1, unitCostPrice: 9_000_000, unitSalePrice: 7_000_000 }],
    });

    expect(totals.grossProfit).toBe(-2_000_000);
  });

  it('reports a negative net profit when costs exceed the margin', () => {
    const totals = calculateSaleTotals({
      items: [{ quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 7_200_000 }],
      costs: { sellerBonus: 100_000, installationCost: 300_000 },
    });

    expect(totals.grossProfit).toBe(200_000);
    expect(totals.netProfit).toBe(-200_000);
  });
});

describe('calculateSaleTotals — empty sale', () => {
  it('returns zeroed totals', () => {
    const totals = calculateSaleTotals({ items: [] });

    expect(totals.subtotal).toBe(0);
    expect(totals.totalSalePrice).toBe(0);
    expect(totals.grossProfit).toBe(0);
    expect(totals.remainingAmount).toBe(0);
  });
});

describe('deriveSalePaymentStatus', () => {
  it('maps balances onto statuses', () => {
    expect(deriveSalePaymentStatus(9_000_000, 0)).toBe(SalePaymentStatus.UNPAID);
    expect(deriveSalePaymentStatus(9_000_000, 1)).toBe(SalePaymentStatus.PARTIALLY_PAID);
    expect(deriveSalePaymentStatus(9_000_000, 9_000_000)).toBe(SalePaymentStatus.PAID);
    expect(deriveSalePaymentStatus(9_000_000, 9_500_000)).toBe(SalePaymentStatus.PAID);
  });
});
