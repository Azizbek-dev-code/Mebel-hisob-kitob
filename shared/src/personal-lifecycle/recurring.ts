import {
  PersonalRecurringDueState,
  PersonalRecurringFrequency,
} from '../constants/enums.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Dashboard and notification window for the next occurrence. */
export const UPCOMING_PAYMENT_DAYS = 30;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

export function addUtcMonths(from: Date, months: number, dayOfMonth?: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const desired = dayOfMonth ?? from.getUTCDate();
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(desired, dim),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

export interface AdvanceRecurringDueInput {
  frequency: PersonalRecurringFrequency;
  intervalDays?: number | null;
  dayOfMonth?: number | null;
  from: Date;
}

/** Next reminder date. Does not create a wallet entry. */
export function advanceRecurringDue(input: AdvanceRecurringDueInput): Date {
  switch (input.frequency) {
    case PersonalRecurringFrequency.DAILY:
      return addUtcDays(input.from, 1);
    case PersonalRecurringFrequency.WEEKLY:
      return addUtcDays(input.from, 7);
    case PersonalRecurringFrequency.MONTHLY:
      return addUtcMonths(input.from, 1, input.dayOfMonth ?? undefined);
    case PersonalRecurringFrequency.YEARLY:
      return addUtcMonths(input.from, 12, input.dayOfMonth ?? undefined);
    case PersonalRecurringFrequency.CUSTOM: {
      const days = input.intervalDays ?? 0;
      if (days < 1) return addUtcDays(input.from, 1);
      return addUtcDays(input.from, days);
    }
    default:
      return addUtcDays(input.from, 1);
  }
}

export function recurringDueState(
  nextDueAt: Date,
  now: Date,
  windowDays = UPCOMING_PAYMENT_DAYS,
): PersonalRecurringDueState {
  const today = startOfUtcDay(now);
  const due = startOfUtcDay(nextDueAt);
  if (due.getTime() < today.getTime()) return PersonalRecurringDueState.OVERDUE;
  const until = addUtcDays(today, windowDays);
  if (due.getTime() <= until.getTime()) return PersonalRecurringDueState.DUE;
  return PersonalRecurringDueState.LATER;
}
