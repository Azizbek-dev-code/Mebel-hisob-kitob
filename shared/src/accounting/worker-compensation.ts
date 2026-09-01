import {
  WorkerCompensationType,
  WorkerResponsibility,
  WORKER_COMPENSATION_FIXED_TYPES,
  WORKER_COMPENSATION_PERCENT_TYPES,
  type WorkerCompensationFixedType,
  type WorkerCompensationPercentType,
  type WorkerCompensationType as WorkerCompensationTypeValue,
  type WorkerResponsibility as WorkerResponsibilityValue,
} from '../constants/enums.js';
import type { Money } from '../types/api.js';
import { toMoney } from '../utils/money.js';

/** 1 percent = 100 basis points. 10% = 1000, 100% = 10_000. */
export const BASIS_POINTS_PER_PERCENT = 100;
export const MAX_COMPENSATION_BASIS_POINTS = 10_000;
export const MIN_COMPENSATION_BASIS_POINTS = 1;

/**
 * Rounding rule for percentage compensation:
 * truncate toward zero via integer division (floor for non-negative amounts).
 *
 *   amount * basisPoints / 10_000
 *
 * Example: 9_500_000 * 1000 / 10_000 = 950_000
 */
export function calculatePercentageCompensation(
  baseAmount: Money,
  basisPoints: number,
): Money {
  assertNonNegativeMoney(baseAmount, 'baseAmount');
  assertValidBasisPoints(basisPoints);

  const product = BigInt(toMoney(baseAmount)) * BigInt(basisPoints);
  return Number(product / 10_000n);
}

export function calculateFixedCompensation(amount: Money): Money {
  assertPositiveMoney(amount, 'amount');
  return toMoney(amount);
}

export interface CalculateWorkerCompensationInput {
  type: WorkerCompensationTypeValue;
  value: number;
  /** Sale total / gross profit / unit event base — ignored for fixed types. */
  baseAmount?: Money;
}

/**
 * Computes compensation for one rule application.
 * Does not touch the database and never posts ledger rows.
 */
export function calculateWorkerCompensation(
  input: CalculateWorkerCompensationInput,
): Money {
  if (isPercentCompensationType(input.type)) {
    if (input.baseAmount === undefined) {
      throw new Error('baseAmount is required for percentage compensation');
    }
    return calculatePercentageCompensation(input.baseAmount, input.value);
  }

  if (isFixedCompensationType(input.type)) {
    return calculateFixedCompensation(input.value);
  }

  throw new Error(`Unsupported compensation type: ${String(input.type)}`);
}

export function isPercentCompensationType(
  type: WorkerCompensationTypeValue,
): type is WorkerCompensationPercentType {
  return (WORKER_COMPENSATION_PERCENT_TYPES as readonly string[]).includes(type);
}

export function isFixedCompensationType(
  type: WorkerCompensationTypeValue,
): type is WorkerCompensationFixedType {
  return (WORKER_COMPENSATION_FIXED_TYPES as readonly string[]).includes(type);
}

/** Required responsibility for each compensation type. */
export const COMPENSATION_TYPE_REQUIRED_RESPONSIBILITY: Record<
  WorkerCompensationTypeValue,
  WorkerResponsibilityValue
> = {
  [WorkerCompensationType.PERCENT_OF_SALE]: WorkerResponsibility.SELLER,
  [WorkerCompensationType.PERCENT_OF_GROSS_PROFIT]: WorkerResponsibility.SELLER,
  [WorkerCompensationType.FIXED_PER_SALE]: WorkerResponsibility.SELLER,
  [WorkerCompensationType.FIXED_PER_ASSEMBLY]: WorkerResponsibility.ASSEMBLER,
  [WorkerCompensationType.FIXED_PER_DELIVERY]: WorkerResponsibility.DELIVERY,
  [WorkerCompensationType.FIXED_PER_INSTALLATION]: WorkerResponsibility.INSTALLER,
};

export function requiredResponsibilityForCompensationType(
  type: WorkerCompensationTypeValue,
): WorkerResponsibilityValue {
  return COMPENSATION_TYPE_REQUIRED_RESPONSIBILITY[type];
}

export function assertValidBasisPoints(basisPoints: number): void {
  if (
    !Number.isInteger(basisPoints) ||
    basisPoints < MIN_COMPENSATION_BASIS_POINTS ||
    basisPoints > MAX_COMPENSATION_BASIS_POINTS
  ) {
    throw new Error(
      `basisPoints must be an integer from ${MIN_COMPENSATION_BASIS_POINTS} to ${MAX_COMPENSATION_BASIS_POINTS}`,
    );
  }
}

function assertNonNegativeMoney(amount: Money, field: string): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${field} must be a non-negative whole so'm amount`);
  }
}

function assertPositiveMoney(amount: Money, field: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${field} must be a positive whole so'm amount`);
  }
}

/**
 * Inclusive calendar-date overlap (null end = open-ended).
 * Dates should be comparable instants from the same parser convention.
 */
export function compensationDateRangesOverlap(
  aFrom: Date,
  aTo: Date | null,
  bFrom: Date,
  bTo: Date | null,
): boolean {
  const aEnd = aTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEnd = bTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return aFrom.getTime() <= bEnd && bFrom.getTime() <= aEnd;
}

/** UTC civil day `YYYY-MM-DD` — matches parseFlexibleDate noon-UTC calendar dates. */
export function utcCalendarDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Inclusive civil-day window (UTC date of each instant).
 *
 * Calendar inputs are stored at noon UTC so Asia/Tashkent still shows the intended
 * day. Instant comparison would miss morning sales on the start day
 * (`04:00Z` < `12:00Z` on the same date). Compare `YYYY-MM-DD` instead.
 *
 * Soft `isActive` is not used here — historical inactive rules still apply inside
 * their effective window (set effectiveTo to close a rule for future events).
 */
export function isCompensationRuleEffectiveOn(
  rule: { effectiveFrom: Date; effectiveTo: Date | null },
  eventDate: Date,
): boolean {
  const eventDay = utcCalendarDay(eventDate);
  if (eventDay < utcCalendarDay(rule.effectiveFrom)) return false;
  if (rule.effectiveTo && eventDay > utcCalendarDay(rule.effectiveTo)) return false;
  return true;
}

export interface CompensationRuleMatchInput {
  id: string;
  type: WorkerCompensationTypeValue;
  value: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * Picks the single rule of `type` covering `eventDate`, if any.
 * Overlapping same-type rules are rejected at create time, so at most one matches.
 */
export function findCompensationRuleForTypeOnDate(
  rules: readonly CompensationRuleMatchInput[],
  type: WorkerCompensationTypeValue,
  eventDate: Date,
): CompensationRuleMatchInput | null {
  const matches = rules.filter(
    (rule) => rule.type === type && isCompensationRuleEffectiveOn(rule, eventDate),
  );
  return matches[0] ?? null;
}
