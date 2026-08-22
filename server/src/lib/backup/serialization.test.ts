import { describe, expect, it } from 'vitest';

import { decodeRow, decodeValue, encodeRow, encodeValue } from './serialization.js';

describe('backup serialization', () => {
  it('round-trips a row through JSON without losing BigInt or Date', () => {
    const row = {
      id: 'sale_1',
      totalSalePrice: 1_500_000n,
      saleDate: new Date('2026-08-01T12:30:00.000Z'),
      notes: null,
      quantity: 3,
      isDeposit: false,
    };

    const restored = decodeRow(JSON.parse(JSON.stringify(encodeRow(row))));

    expect(restored).toEqual(row);
    expect(restored.totalSalePrice).toBe(1_500_000n);
    expect(restored.saleDate).toBeInstanceOf(Date);
  });

  it('leaves plain JSON values untouched', () => {
    const value = { a: 1, b: 'two', c: [true, null, 4.5] };
    expect(decodeValue(encodeValue(value))).toEqual(value);
  });

  it('encodes nested structures', () => {
    const encoded = encodeValue({ outer: [{ amount: 5n }] }) as {
      outer: { amount: { $bigint: string } }[];
    };
    expect(encoded.outer[0]!.amount).toEqual({ $bigint: '5' });
  });

  it('does not mistake a user string for a tag', () => {
    // A note that happens to read like a tag must survive as a string, not
    // become a number.
    const row = { note: '$bigint', payload: { $bigint: 7 } };
    const restored = decodeRow(JSON.parse(JSON.stringify(encodeRow(row))));
    expect(restored.note).toBe('$bigint');
    // The numeric form is not a valid tag, so it stays an object.
    expect(restored.payload).toEqual({ $bigint: 7 });
  });

  it('rejects a tag holding an unparseable date', () => {
    expect(() => decodeValue({ $date: 'not-a-date' })).toThrow(/invalid date/i);
  });
});
