/**
 * The system stores every monetary value as a whole number of so'm.
 *
 * UZS has no circulating subunit, and furniture prices routinely reach tens of
 * millions, so integer so'm keeps every amount well inside `Number.MAX_SAFE_INTEGER`
 * while avoiding floating point drift in accounting totals.
 */
export const CURRENCY_CODE = 'UZS' as const;
export const CURRENCY_SUFFIX = "so'm" as const;
export const CURRENCY_LOCALE = 'uz-UZ' as const;

/** Thin space used as the thousands separator, e.g. `9 500 000 so'm`. */
export const THOUSANDS_SEPARATOR = '\u00A0';

/** Largest amount accepted by any monetary input, guarding against typos. */
export const MAX_MONEY_AMOUNT = 999_999_999_999;
