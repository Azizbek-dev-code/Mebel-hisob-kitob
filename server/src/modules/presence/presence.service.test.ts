import { PresenceVisibility, stripFinancialFields } from '@furniture-erp/shared';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    identity: { findUnique: vi.fn() },
    identityPresence: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    growthFriendship: { findFirst: vi.fn() },
    growthSocialProfile: { findUnique: vi.fn() },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    PRESENCE_OFFLINE_AFTER_SECONDS: 300,
    ANALYTICS_IDLE_TIMEOUT: 300,
  },
}));
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../usage-analytics/analytics-session.service.js', () => ({
  touchAnalyticsSession: vi.fn().mockResolvedValue({ id: 's1', activeSeconds: 0 }),
}));

const { getPresenceStatus, recordHeartbeat } = await import('./presence.service.js');

const NOW = new Date('2026-09-21T12:00:00.000Z');

describe('recordHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('marks a recent active heartbeat as online', async () => {
    prismaMock.identityPresence.findUnique.mockResolvedValue(null);
    prismaMock.identityPresence.create.mockResolvedValue({});
    const result = await recordHeartbeat(
      'idn_1',
      { clientSessionId: 'client-session-1', visible: true, active: true },
      prismaMock as never,
      NOW,
    );
    expect(result.online).toBe(true);
    expect(prismaMock.identityPresence.create).toHaveBeenCalled();
  });

  it('does not treat a hidden idle tab as online activity', async () => {
    prismaMock.identityPresence.findUnique.mockResolvedValue(null);
    const result = await recordHeartbeat(
      'idn_1',
      { clientSessionId: 'client-session-1', visible: false, active: false },
      prismaMock as never,
      NOW,
    );
    expect(result.online).toBe(false);
    expect(result.lastSeenAt).toBeNull();
    expect(prismaMock.identityPresence.create).not.toHaveBeenCalled();
  });
});

describe('getPresenceStatus', () => {
  it('hides online and last seen when visibility is nobody', async () => {
    prismaMock.identity.findUnique.mockResolvedValue({
      id: 'idn_other',
      socialProfile: {
        onlineStatusVisibility: PresenceVisibility.NOBODY,
        lastSeenVisibility: PresenceVisibility.NOBODY,
      },
    });
    prismaMock.growthFriendship.findFirst.mockResolvedValue({ id: 'fr_1' });
    prismaMock.identityPresence.findUnique.mockResolvedValue({
      lastActivityAt: NOW,
    });
    const status = await getPresenceStatus('idn_me', 'idn_other', prismaMock as never, NOW);
    expect(status.online).toBeNull();
    expect(status.lastSeenAt).toBeNull();
  });

  it('lets the owner see their own status', async () => {
    prismaMock.identity.findUnique.mockResolvedValue({
      id: 'idn_me',
      socialProfile: {
        onlineStatusVisibility: PresenceVisibility.NOBODY,
        lastSeenVisibility: PresenceVisibility.NOBODY,
      },
    });
    prismaMock.identityPresence.findUnique.mockResolvedValue({
      lastActivityAt: NOW,
    });
    const status = await getPresenceStatus('idn_me', 'idn_me', prismaMock as never, NOW);
    expect(status.online).toBe(true);
    expect(status.lastSeenAt).toBe(NOW.toISOString());
  });
});

describe('admin user detail privacy', () => {
  it('never serializes financial keys', () => {
    const leaked = stripFinancialFields({
      identityId: 'idn_1',
      accountType: 'BUSINESS',
      amount: 1,
      profit: 2,
      featureUsage: [{ feature: 'sales', eventCount: 3, revenue: 9 }],
    });
    expect(JSON.stringify(leaked)).not.toMatch(/amount|profit|revenue/i);
    expect(leaked).toMatchObject({
      identityId: 'idn_1',
      accountType: 'BUSINESS',
      featureUsage: [{ feature: 'sales', eventCount: 3 }],
    });
  });
});
