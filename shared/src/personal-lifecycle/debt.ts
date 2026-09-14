import { PersonalDebtStatus } from '../constants/enums.js';

import { startOfUtcDay } from './recurring.js';

export function personalDebtRemaining(principalSom: number, paidSom: number): number {
  return Math.max(0, principalSom - paidSom);
}

/**
 * Remaining vs due date. PAID wins over overdue. Payments never become store
 * customer debt or Sale installments.
 */
export function personalDebtStatus(
  principalSom: number,
  paidSom: number,
  dueAt: Date | string | null | undefined,
  now: Date,
): PersonalDebtStatus {
  const remaining = personalDebtRemaining(principalSom, paidSom);
  if (remaining <= 0) return PersonalDebtStatus.PAID;
  const due = dueAt ? new Date(dueAt) : null;
  if (due && !Number.isNaN(due.getTime()) && startOfUtcDay(due).getTime() < startOfUtcDay(now).getTime()) {
    return PersonalDebtStatus.OVERDUE;
  }
  if (paidSom > 0) return PersonalDebtStatus.PARTIALLY_PAID;
  return PersonalDebtStatus.ACTIVE;
}
