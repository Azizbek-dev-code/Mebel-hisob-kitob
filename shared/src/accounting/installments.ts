import { InstallmentStatus } from '../constants/enums.js';
import type { Money } from '../types/api.js';
import { splitMoneyEvenly, subtractMoney, toMoney } from '../utils/money.js';

export interface InstallmentScheduleInput {
  /** Sale total minus the deposit — the amount actually being financed. */
  financedAmount: Money;
  monthCount: number;
  /** Due date of the first month. Usually the sale date plus one month. */
  firstDueDate: Date;
}

export interface ScheduledInstallment {
  /** 1-based position in the schedule. */
  sequence: number;
  dueDate: Date;
  amount: Money;
}

export interface InstallmentPlanSummary {
  financedAmount: Money;
  monthCount: number;
  /** The nominal per-month figure shown on the form. */
  monthlyAmount: Money;
  schedule: ScheduledInstallment[];
}

/**
 * Adds whole months, clamping the day to the end of the target month.
 *
 * Without the clamp, a plan starting on the 31st would roll a February payment
 * into March and quietly shift every following due date.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const lastDayOfTargetMonth = new Date(year, month + months + 1, 0).getDate();

  return new Date(
    year,
    month + months,
    Math.min(day, lastDayOfTargetMonth),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/**
 * Builds a monthly payment schedule.
 *
 * The rounding remainder lands on the final month, so the schedule always sums to
 * exactly `financedAmount`. If it did not, a customer who paid every instalment
 * would still show a residual debt.
 */
export function generateInstallmentSchedule(
  input: InstallmentScheduleInput,
): InstallmentPlanSummary {
  const financedAmount = toMoney(input.financedAmount);
  const monthCount = Math.max(0, Math.trunc(input.monthCount));

  if (monthCount === 0 || financedAmount <= 0) {
    return { financedAmount, monthCount, monthlyAmount: 0, schedule: [] };
  }

  const amounts = splitMoneyEvenly(financedAmount, monthCount);

  const schedule: ScheduledInstallment[] = amounts.map((amount, index) => ({
    sequence: index + 1,
    dueDate: addMonthsClamped(input.firstDueDate, index),
    amount,
  }));

  return {
    financedAmount,
    monthCount,
    monthlyAmount: amounts[0] ?? 0,
    schedule,
  };
}

/**
 * Status of a single scheduled month.
 *
 * A past-due row that is only partly paid reports OVERDUE rather than
 * PARTIALLY_PAID: the debt report exists to surface what needs chasing, and a
 * part payment does not stop the month being late.
 */
export function deriveInstallmentStatus(
  amount: Money,
  paidAmount: Money,
  dueDate: Date,
  now: Date = new Date(),
): InstallmentStatus {
  if (paidAmount >= amount) return InstallmentStatus.PAID;
  if (dueDate.getTime() < now.getTime()) return InstallmentStatus.OVERDUE;
  if (paidAmount > 0) return InstallmentStatus.PARTIALLY_PAID;
  return InstallmentStatus.PENDING;
}

export function installmentRemaining(amount: Money, paidAmount: Money): Money {
  return subtractMoney(amount, paidAmount);
}
