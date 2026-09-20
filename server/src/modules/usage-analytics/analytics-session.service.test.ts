import { AnalyticsAccountType } from '@furniture-erp/shared';
import { describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    analyticsSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: { ANALYTICS_IDLE_TIMEOUT: 300, PRESENCE_OFFLINE_AFTER_SECONDS: 300 },
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { touchAnalyticsSession } = await import('./analytics-session.service.js');

describe('touchAnalyticsSession', () => {
  it('does not count idle gaps longer than the timeout', async () => {
    const started = new Date('2026-09-21T08:00:00.000Z');
    prismaMock.analyticsSession.findUnique.mockResolvedValue({
      id: 'ses_1',
      identityId: 'idn_1',
      lastActivityAt: started,
      activeSeconds: 60,
    });
    prismaMock.analyticsSession.update.mockImplementation(async ({ data }: { data: { activeSeconds: number } }) => ({
      id: 'ses_1',
      activeSeconds: data.activeSeconds,
    }));

    const later = new Date('2026-09-21T16:00:00.000Z');
    const result = await touchAnalyticsSession({
      identityId: 'idn_1',
      clientSessionId: 'client-session-1',
      accountType: AnalyticsAccountType.PERSONAL,
      accountId: 'ws_1',
      visible: true,
      active: true,
      now: later,
      db: prismaMock as never,
    });
    expect(result.activeSeconds).toBe(60);
  });

  it('adds only the short active delta', async () => {
    const last = new Date('2026-09-21T12:00:00.000Z');
    prismaMock.analyticsSession.findUnique.mockResolvedValue({
      id: 'ses_1',
      identityId: 'idn_1',
      lastActivityAt: last,
      activeSeconds: 10,
    });
    prismaMock.analyticsSession.update.mockImplementation(async ({ data }: { data: { activeSeconds: number } }) => ({
      id: 'ses_1',
      activeSeconds: data.activeSeconds,
    }));

    const result = await touchAnalyticsSession({
      identityId: 'idn_1',
      clientSessionId: 'client-session-1',
      accountType: AnalyticsAccountType.PERSONAL,
      accountId: 'ws_1',
      visible: true,
      active: true,
      now: new Date('2026-09-21T12:00:30.000Z'),
      db: prismaMock as never,
    });
    expect(result.activeSeconds).toBe(40);
  });
});
