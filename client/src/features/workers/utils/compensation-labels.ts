import {
  WorkerCompensationType,
  WorkerResponsibility,
  isFixedCompensationType,
  isPercentCompensationType,
  type WorkerCompensationRule,
  type WorkerCompensationType as WorkerCompensationTypeValue,
  type WorkerResponsibility as WorkerResponsibilityValue,
} from '@furniture-erp/shared';

import { formatMoney } from '@/utils/format';

/** Uzbek labels for worker responsibilities on the compensation screen. */
export const COMPENSATION_RESPONSIBILITY_LABELS: Record<WorkerResponsibilityValue, string> = {
  [WorkerResponsibility.SELLER]: 'Sotuvchi',
  [WorkerResponsibility.ASSEMBLER]: 'Teruvchi',
  [WorkerResponsibility.DELIVERY]: 'Yetkazib beruvchi',
  [WorkerResponsibility.INSTALLER]: "O'rnatuvchi",
  [WorkerResponsibility.SMM]: 'SMM',
  [WorkerResponsibility.OTHER]: 'Boshqa',
};

/** Human-readable compensation type names (Uzbek). */
export const COMPENSATION_TYPE_LABELS: Record<WorkerCompensationTypeValue, string> = {
  [WorkerCompensationType.PERCENT_OF_SALE]: 'Sotuv summasidan foiz',
  [WorkerCompensationType.PERCENT_OF_GROSS_PROFIT]: 'Yalpi foydadan foiz',
  [WorkerCompensationType.FIXED_PER_SALE]: 'Har bir sotuv uchun summa',
  [WorkerCompensationType.FIXED_PER_ASSEMBLY]: 'Har bir terlash uchun summa',
  [WorkerCompensationType.FIXED_PER_DELIVERY]: 'Har bir yetkazib berish uchun summa',
  [WorkerCompensationType.FIXED_PER_INSTALLATION]: "Har bir o'rnatish uchun summa",
};

/** Types offered for each responsibility — mirrors backend validation. */
export const COMPENSATION_TYPES_BY_RESPONSIBILITY: Record<
  WorkerResponsibilityValue,
  readonly WorkerCompensationTypeValue[]
> = {
  [WorkerResponsibility.SELLER]: [
    WorkerCompensationType.PERCENT_OF_SALE,
    WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
    WorkerCompensationType.FIXED_PER_SALE,
  ],
  [WorkerResponsibility.ASSEMBLER]: [WorkerCompensationType.FIXED_PER_ASSEMBLY],
  [WorkerResponsibility.DELIVERY]: [WorkerCompensationType.FIXED_PER_DELIVERY],
  [WorkerResponsibility.INSTALLER]: [WorkerCompensationType.FIXED_PER_INSTALLATION],
  [WorkerResponsibility.SMM]: [],
  [WorkerResponsibility.OTHER]: [],
};

export function compensationTypesForResponsibility(
  responsibility: WorkerResponsibilityValue,
): readonly WorkerCompensationTypeValue[] {
  return COMPENSATION_TYPES_BY_RESPONSIBILITY[responsibility];
}

/**
 * Converts API basis points to a percent input string without floating money math.
 * 1000 → "10", 250 → "2.5", 125 → "1.25"
 */
export function basisPointsToPercentInput(basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) return '';
  const whole = Math.trunc(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, '0')}`;
}

/** Display form: 1000 → "10%", 250 → "2.5%" */
export function formatCompensationPercent(basisPoints: number): string {
  const input = basisPointsToPercentInput(basisPoints);
  return input ? `${input}%` : '—';
}

/**
 * Parses a user percent string into basis points.
 * Accepts up to 2 decimal places (0.01% = 1 bp).
 * Returns null when the format is invalid.
 */
export function percentInputToBasisPoints(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [wholePart = '0', fracPart = ''] = trimmed.split('.');
  const whole = Number(wholePart);
  if (!Number.isInteger(whole) || whole < 0) return null;

  const padded = `${fracPart}00`.slice(0, 2);
  const frac = Number(padded);
  if (!Number.isInteger(frac)) return null;

  return whole * 100 + frac;
}

export function isValidCompensationPercentInput(raw: string): boolean {
  const bp = percentInputToBasisPoints(raw);
  return bp !== null && bp >= 1 && bp <= 10_000;
}

/** Formats rule value for display — never shows raw basis points. */
export function formatCompensationRuleValue(rule: Pick<WorkerCompensationRule, 'type' | 'value'>): string {
  if (isPercentCompensationType(rule.type)) {
    return formatCompensationPercent(rule.value);
  }
  if (isFixedCompensationType(rule.type)) {
    return formatMoney(rule.value);
  }
  return String(rule.value);
}

/** Calendar `YYYY-MM-DD` for `<input type="date">` from an API ISO string. */
export function toCompensationDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match?.[1] ?? '';
}

export { isFixedCompensationType, isPercentCompensationType };
