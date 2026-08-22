import { CURRENCY_SUFFIX, MAX_MONEY_AMOUNT, THOUSANDS_SEPARATOR } from '../constants/currency.js';
import type { Money } from '../types/api.js';

/** True when the value is a finite, non-negative whole number within accepted bounds. */
export function isValidMoney(value: unknown): value is Money {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_MONEY_AMOUNT
  );
}

/**
 * Rounds to whole so'm. Every amount entering the accounting layer goes through
 * here so that a stray fractional value can never accumulate across a report.
 */
export function toMoney(value: number): Money {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** Sums amounts, rounding once at the end rather than per term. */
export function sumMoney(...amounts: number[]): Money {
  return toMoney(
    amounts.reduce((total, amount) => total + (Number.isFinite(amount) ? amount : 0), 0),
  );
}

/** Subtraction that never returns a negative balance. */
export function subtractMoney(minuend: number, subtrahend: number): Money {
  return Math.max(0, toMoney(minuend - subtrahend));
}

/** Groups digits with a non-breaking space: `9500000` -> `9 500 000`. */
export function formatMoneyNumber(amount: Money): string {
  const rounded = toMoney(amount);
  const isNegative = rounded < 0;
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return isNegative ? `-${digits}` : digits;
}

/** Full display form: `9 500 000 so'm`. */
export function formatMoney(amount: Money): string {
  return `${formatMoneyNumber(amount)} ${CURRENCY_SUFFIX}`;
}

/**
 * Abbreviated form for dashboard stat cards where space is tight:
 * `9 500 000` -> `9.5 mln`, `1 200 000 000` -> `1.2 mlrd`.
 */
export function formatMoneyCompact(amount: Money): string {
  const rounded = toMoney(amount);
  const absolute = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';

  if (absolute >= 1_000_000_000) {
    return `${sign}${trimTrailingZero(absolute / 1_000_000_000)} mlrd`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}${trimTrailingZero(absolute / 1_000_000)} mln`;
  }
  if (absolute >= 1_000) {
    return `${sign}${trimTrailingZero(absolute / 1_000)} ming`;
  }
  return `${sign}${absolute}`;
}

/**
 * Parses user input from a money field, tolerating the separators a cashier is
 * likely to type: spaces, non-breaking spaces, commas and apostrophes.
 * Returns `null` when the input holds no usable number.
 */
export function parseMoneyInput(input: string): Money | null {
  const normalised = input.replace(/[\s\u00A0',]/g, '').replace(',', '.');
  if (normalised === '') return null;

  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) return null;

  return toMoney(parsed);
}

/**
 * Splits `total` into `count` whole-so'm parts. Rounding remainder is pushed onto
 * the final part, so the schedule always adds back up to `total` exactly — the
 * property that keeps installment plans from drifting away from the sale balance.
 */
export function splitMoneyEvenly(total: Money, count: number): Money[] {
  if (count <= 0) return [];

  const rounded = toMoney(total);
  const base = Math.floor(rounded / count);
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] = rounded - base * (count - 1);

  return parts;
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
