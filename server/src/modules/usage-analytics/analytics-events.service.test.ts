import { AnalyticsAccountType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    analyticsEvent: { create: vi.fn() },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { tryRecordAnalyticsEvent } = await import('./analytics-events.service.js');

describe('tryRecordAnalyticsEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.analyticsEvent.create.mockResolvedValue({ id: 'ev_1' });
  });

  it('stores sale_created without financial metadata', async () => {
    const result = await tryRecordAnalyticsEvent(
      {
        identityId: 'idn_1',
        accountType: AnalyticsAccountType.BUSINESS,
        eventType: 'sale_created',
        metadata: {
          amount: 5_000_000,
          profit: 1_000_000,
          customerDebt: 300_000,
          feature: 'sales',
          source: 'api',
        },
      },
      prismaMock as never,
    );

    expect(result.stored).toBe(true);
    expect(result.metadata).toEqual({ feature: 'sales', source: 'api' });
    const payload = prismaMock.analyticsEvent.create.mock.calls[0]![0] as {
      data: { metadata: unknown; eventType: string };
    };
    expect(payload.data.eventType).toBe('sale_created');
    expect(JSON.stringify(payload.data.metadata)).not.toMatch(/5000000|1000000|300000|amount|profit|debt/i);
  });
});
