import { MAX_MONEY_AMOUNT, type Money } from '@furniture-erp/shared';

/**
 * The boundary between Postgres `bigint` money columns and the plain JS numbers
 * used everywhere else.
 *
 * `bigint` is the right storage type — it makes a fractional so'm impossible —
 * but it does not survive `JSON.stringify` and is awkward to compute with. Every
 * value stays well below `Number.MAX_SAFE_INTEGER`, so this conversion is exact
 * in both directions. Repositories convert on the way out; nothing above the
 * repository layer should ever see a `bigint`.
 */

export function toDbMoney(value: Money): bigint {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`Money must be a whole number of so'm, received: ${value}`);
  }
  if (Math.abs(value) > MAX_MONEY_AMOUNT) {
    throw new RangeError(`Money value ${value} exceeds the maximum supported amount`);
  }
  return BigInt(value);
}

export function fromDbMoney(value: bigint | null | undefined): Money {
  if (value === null || value === undefined) return 0;

  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(-Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Money value ${value} cannot be represented exactly as a number`);
  }

  return Number(value);
}

/** Converts an aggregate such as `_sum.amount`, which Prisma returns as null on an empty set. */
export function fromDbMoneySum(value: bigint | null | undefined): Money {
  return fromDbMoney(value ?? 0n);
}
