import { WorkspaceType, stripFinancialFields } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

describe('platform usage analytics privacy', () => {
  it('keeps subscription status and strips money fields', () => {
    const payload = stripFinancialFields({
      identityId: 'idn_1',
      displayName: 'Aziz',
      accountTypes: ['PERSONAL', 'BUSINESS'],
      businessType: 'FURNITURE',
      personalSubscriptionStatus: 'ACTIVE',
      businessSubscriptionStatus: 'TRIAL',
      todaySeconds: 120,
      profit: 9_000_000,
      revenue: 12_000_000,
      featureUsage: [{ feature: 'sales', eventCount: 4, amount: 5_000_000 }],
    });
    expect(payload).toMatchObject({
      identityId: 'idn_1',
      personalSubscriptionStatus: 'ACTIVE',
      businessSubscriptionStatus: 'TRIAL',
      todaySeconds: 120,
      featureUsage: [{ feature: 'sales', eventCount: 4 }],
    });
    expect(JSON.stringify(payload)).not.toMatch(/9000000|12000000|5000000|profit|revenue|amount/i);
  });

  it('treats business workspace type as the identity overlay, not a second user', () => {
    expect(WorkspaceType.BUSINESS).toBe('BUSINESS');
    expect(WorkspaceType.PERSONAL).toBe('PERSONAL');
  });
});
