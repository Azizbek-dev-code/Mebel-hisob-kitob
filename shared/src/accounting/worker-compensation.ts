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

export interface SellerCompensationRuleMatchInput extends CompensationRuleMatchInput {
  /** Soft flag — inactive rules still apply inside their window; backfill uses active only. */
  isActive?: boolean;
}

/**
 * Seller sale commission rule for a **new** sale (POST /sales).
 *
 * 1. Prefer a rule whose effective window covers `saleDate`.
 * 2. If none — and an open-ended active rate exists (`effectiveTo = null`) —
 *    use that current rule even when `saleDate` is before `effectiveFrom`.
 *
 * Why (2): a new sale entered today with a historical `saleDate` (createdAt today,
 * saleDate 01.08) must still earn commission under the current open rule.
 * Closed windows (`effectiveTo` set) are never extended — intentional end stays 0.
 *
 * Ledger attribution still uses `saleDate` (not `createdAt` / wall clock).
 *
 * Existing sales are NOT matched here on View / Edit → Save. Recalculate uses
 * `findSellerCompensationRuleForRecalculation` instead.
 */
export function findSellerCompensationRuleForSaleDate(
  rules: readonly SellerCompensationRuleMatchInput[],
  type: WorkerCompensationTypeValue,
  saleDate: Date,
): CompensationRuleMatchInput | null {
  const covering = findCompensationRuleForTypeOnDate(rules, type, saleDate);
  if (covering) return covering;

  const eventDay = utcCalendarDay(saleDate);
  const backfill = rules
    .filter(
      (rule) =>
        rule.type === type &&
        rule.isActive !== false &&
        rule.effectiveTo == null &&
        eventDay < utcCalendarDay(rule.effectiveFrom),
    )
    .sort((a, b) =>
      utcCalendarDay(b.effectiveFrom).localeCompare(utcCalendarDay(a.effectiveFrom)),
    );
  return backfill[0] ?? null;
}

/**
 * Seller commission rule for the explicit **"Qayta hisoblash"** action.
 *
 * 1. Prefer the current open-ended active rule (`effectiveTo = null`).
 *    A historical saleDate must not stay at 0 when a current 10% rule exists.
 * 2. Else a window that covers `asOf` (typically today).
 * 3. Else the exact window covering `saleDate` (legacy closed rate).
 *
 * Never used by View or Edit → Save.
 */
export function findSellerCompensationRuleForRecalculation(
  rules: readonly SellerCompensationRuleMatchInput[],
  type: WorkerCompensationTypeValue,
  saleDate: Date,
  asOf: Date = new Date(),
): CompensationRuleMatchInput | null {
  const currentOpen = rules
    .filter(
      (rule) =>
        rule.type === type &&
        rule.isActive !== false &&
        rule.effectiveTo == null,
    )
    .sort((a, b) =>
      utcCalendarDay(b.effectiveFrom).localeCompare(utcCalendarDay(a.effectiveFrom)),
    );
  if (currentOpen[0]) return currentOpen[0];

  return (
    findCompensationRuleForTypeOnDate(rules, type, asOf) ??
    findCompensationRuleForTypeOnDate(rules, type, saleDate)
  );
}
