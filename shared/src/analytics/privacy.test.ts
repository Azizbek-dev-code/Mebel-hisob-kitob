import { describe, expect, it } from 'vitest';

import {
  assertNoFinancialFields,
  isForbiddenFinancialKey,
  sanitizeAnalyticsMetadata,
  stripFinancialFields,
} from './privacy.js';

describe('isForbiddenFinancialKey', () => {
  it('rejects money tokens and keeps technical account fields', () => {
    expect(isForbiddenFinancialKey('amount')).toBe(true);
    expect(isForbiddenFinancialKey('customerDebt')).toBe(true);
    expect(isForbiddenFinancialKey('totalSalePrice')).toBe(true);
    expect(isForbiddenFinancialKey('paymentAmount')).toBe(true);
    expect(isForbiddenFinancialKey('customerName')).toBe(true);
    expect(isForbiddenFinancialKey('supplierName')).toBe(true);
    expect(isForbiddenFinancialKey('accountType')).toBe(false);
    expect(isForbiddenFinancialKey('accountId')).toBe(false);
    expect(isForbiddenFinancialKey('eventCount')).toBe(false);
    expect(isForbiddenFinancialKey('feature')).toBe(false);
  });
});

describe('sanitizeAnalyticsMetadata', () => {
  it('drops financial keys and unknown keys', () => {
    const cleaned = sanitizeAnalyticsMetadata({
      eventType: 'sale_created',
      amount: 5_000_000,
      profit: 1_000_000,
      customerDebt: 300_000,
      feature: 'sales',
      entityType: 'SALE',
      businessType: 'FURNITURE',
      source: 'api',
      note: 'secret memo',
      customerName: 'Ali',
    });
    expect(cleaned).toEqual({
      feature: 'sales',
      entityType: 'SALE',
      businessType: 'FURNITURE',
      source: 'api',
    });
    expect(JSON.stringify(cleaned)).not.toMatch(/5000000|1000000|300000|Ali|secret/);
  });

  it('returns null when only forbidden keys were sent', () => {
    expect(
      sanitizeAnalyticsMetadata({
        amount: 5000000,
        profit: 1000000,
        customerDebt: 300000,
      }),
    ).toBeNull();
  });
});

describe('stripFinancialFields', () => {
  it('omits nested money keys without touching accountType', () => {
    const stripped = stripFinancialFields({
      identityId: 'idn_1',
      accountType: 'BUSINESS',
      amount: 99,
      nested: { profit: 1, feature: 'dashboard' },
    });
    expect(stripped).toEqual({
      identityId: 'idn_1',
      accountType: 'BUSINESS',
      nested: { feature: 'dashboard' },
    });
    expect(() => assertNoFinancialFields(stripped)).not.toThrow();
  });
});
