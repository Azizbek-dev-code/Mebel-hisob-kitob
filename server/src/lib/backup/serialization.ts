/**
 * JSON encoding for Prisma rows.
 *
 * Two column types in this schema have no JSON representation that survives a
 * round trip: `BigInt` (every money column) and `DateTime`. `JSON.stringify`
 * throws on the first and silently downgrades the second to a string, so a
 * naive dump reloads money as text and dates as strings, and Prisma then
 * rejects the insert.
 *
 * Values of those two types are therefore written as tagged objects and read
 * back by shape rather than by consulting the schema. That keeps the encoder
 * independent of the model list: a column added next year round-trips without
 * anyone remembering to register its type here.
 */

const BIGINT_TAG = '$bigint';
const DATE_TAG = '$date';

interface TaggedBigInt {
  [BIGINT_TAG]: string;
}

interface TaggedDate {
  [DATE_TAG]: string;
}

function isTaggedBigInt(value: object): value is TaggedBigInt {
  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === BIGINT_TAG &&
    typeof (value as TaggedBigInt)[BIGINT_TAG] === 'string'
  );
}

function isTaggedDate(value: object): value is TaggedDate {
  const keys = Object.keys(value);
  return (
    keys.length === 1 && keys[0] === DATE_TAG && typeof (value as TaggedDate)[DATE_TAG] === 'string'
  );
}

/** Replaces BigInt and Date with tagged objects, recursively. */
export function encodeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return { [BIGINT_TAG]: value.toString() };
  }
  if (value instanceof Date) {
    return { [DATE_TAG]: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        encodeValue(entry),
      ]),
    );
  }
  return value;
}

/** Inverse of {@link encodeValue}. Untagged values pass through unchanged. */
export function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  if (value !== null && typeof value === 'object') {
    if (isTaggedBigInt(value)) {
      return BigInt(value[BIGINT_TAG]);
    }
    if (isTaggedDate(value)) {
      const date = new Date(value[DATE_TAG]);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Backup contains an invalid date: ${value[DATE_TAG]}`);
      }
      return date;
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        decodeValue(entry),
      ]),
    );
  }
  return value;
}

export function encodeRow(row: Record<string, unknown>): Record<string, unknown> {
  return encodeValue(row) as Record<string, unknown>;
}

export function decodeRow(row: Record<string, unknown>): Record<string, unknown> {
  return decodeValue(row) as Record<string, unknown>;
}
