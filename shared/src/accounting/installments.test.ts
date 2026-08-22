import { describe, expect, it } from 'vitest';

import { InstallmentStatus } from '../constants/enums.js';
import { sumMoney } from '../utils/money.js';

import {
  addMonthsClamped,
  deriveInstallmentStatus,
  generateInstallmentSchedule,
  installmentRemaining,
} from './installments.js';

describe('addMonthsClamped', () => {
  it('advances by whole months', () => {
    const result = addMonthsClamped(new Date(2026, 7, 8), 1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(8);
  });

  it('rolls the year over in December', () => {
    const result = addMonthsClamped(new Date(2026, 11, 15), 2);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(1);
  });

  it('clamps to the last day of a shorter month instead of overflowing', () => {
    const result = addMonthsClamped(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });
});

describe('generateInstallmentSchedule — scenario 4', () => {
  // Sale 9,000,000 with a 2,000,000 deposit leaves 7,000,000 over 7 months.
  const plan = generateInstallmentSchedule({
    financedAmount: 7_000_000,
    monthCount: 7,
    firstDueDate: new Date(2026, 8, 8),
  });

  it('creates one row per month', () => {
    expect(plan.schedule).toHaveLength(7);
    expect(plan.monthlyAmount).toBe(1_000_000);
  });

  it('charges an equal amount each month', () => {
    expect(plan.schedule.map((row) => row.amount)).toEqual([
      1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000,
    ]);
  });

  it('spaces due dates one month apart starting from the first due date', () => {
    const dates = plan.schedule.map(
      (row) => `${row.dueDate.getDate()}.${row.dueDate.getMonth() + 1}`,
    );
    expect(dates).toEqual(['8.9', '8.10', '8.11', '8.12', '8.1', '8.2', '8.3']);
  });

  it('numbers rows from 1', () => {
    expect(plan.schedule.map((row) => row.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('generateInstallmentSchedule — rounding', () => {
  it('always sums back to the financed amount', () => {
    const plan = generateInstallmentSchedule({
      financedAmount: 7_000_000,
      monthCount: 3,
      firstDueDate: new Date(2026, 8, 8),
    });

    expect(sumMoney(...plan.schedule.map((row) => row.amount))).toBe(7_000_000);
  });

  it('puts the remainder on the final month', () => {
    const plan = generateInstallmentSchedule({
      financedAmount: 7_000_000,
      monthCount: 3,
      firstDueDate: new Date(2026, 8, 8),
    });

    expect(plan.schedule.map((row) => row.amount)).toEqual([2_333_333, 2_333_333, 2_333_334]);
  });
});

describe('generateInstallmentSchedule — degenerate input', () => {
  it('returns an empty schedule for zero months', () => {
    const plan = generateInstallmentSchedule({
      financedAmount: 7_000_000,
      monthCount: 0,
      firstDueDate: new Date(2026, 8, 8),
    });

    expect(plan.schedule).toEqual([]);
    expect(plan.monthlyAmount).toBe(0);
  });

  it('returns an empty schedule when there is nothing to finance', () => {
    const plan = generateInstallmentSchedule({
      financedAmount: 0,
      monthCount: 7,
      firstDueDate: new Date(2026, 8, 8),
    });

    expect(plan.schedule).toEqual([]);
  });
});

describe('deriveInstallmentStatus', () => {
  const dueDate = new Date(2026, 8, 8);
  const beforeDue = new Date(2026, 8, 1);
  const afterDue = new Date(2026, 8, 20);

  it('is PENDING before the due date with nothing paid', () => {
    expect(deriveInstallmentStatus(1_000_000, 0, dueDate, beforeDue)).toBe(
      InstallmentStatus.PENDING,
    );
  });

  it('is PARTIALLY_PAID before the due date with something paid', () => {
    expect(deriveInstallmentStatus(1_000_000, 400_000, dueDate, beforeDue)).toBe(
      InstallmentStatus.PARTIALLY_PAID,
    );
  });

  it('is PAID once the full amount is received, even when late', () => {
    expect(deriveInstallmentStatus(1_000_000, 1_000_000, dueDate, afterDue)).toBe(
      InstallmentStatus.PAID,
    );
  });

  it('is OVERDUE past the due date, including when partly paid', () => {
    expect(deriveInstallmentStatus(1_000_000, 0, dueDate, afterDue)).toBe(
      InstallmentStatus.OVERDUE,
    );
    expect(deriveInstallmentStatus(1_000_000, 400_000, dueDate, afterDue)).toBe(
      InstallmentStatus.OVERDUE,
    );
  });
});

describe('installmentRemaining', () => {
  it('never goes below zero', () => {
    expect(installmentRemaining(1_000_000, 400_000)).toBe(600_000);
    expect(installmentRemaining(1_000_000, 1_500_000)).toBe(0);
  });
});
