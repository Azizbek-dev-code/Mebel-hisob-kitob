import { GlobalLeaderboardPeriod, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthProgress: { findMany: vi.fn() },
    identity: { findMany: vi.fn() },
    growthXpEvent: { groupBy: vi.fn() },
    platformXpTransaction: { groupBy: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { listGlobalRanking } = await import('./personal-growth-ranking.service.js');

const NOW = new Date('2026-09-19T12:00:00.000Z');

describe('listGlobalRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'ws_1',
      type: WorkspaceType.PERSONAL,
      status: 'ACTIVE',
      storeId: null,
    });
    prismaMock.growthProgress.findMany.mockResolvedValue([
      {
        identityId: 'idn_me',
        level: 4,
        totalXp: 120,
        currentStreak: 3,
      },
      {
        identityId: 'idn_other',
        level: 8,
        totalXp: 900,
        currentStreak: 12,
      },
    ]);
    prismaMock.identity.findMany.mockResolvedValue([
      { id: 'idn_me', fullName: 'Aziz', socialProfile: { handle: 'aziz', showInGlobalRanking: true } },
      { id: 'idn_other', fullName: 'Jasur', socialProfile: { handle: 'jasur', showInGlobalRanking: true } },
    ]);
    prismaMock.growthXpEvent.groupBy.mockResolvedValue([]);
    prismaMock.platformXpTransaction.groupBy.mockResolvedValue([]);
  });

  it('returns public rank fields without email or money', async () => {
    const result = await listGlobalRanking(
      'ws_1',
      'idn_me',
      { period: GlobalLeaderboardPeriod.ALL, page: 1, pageSize: 20 },
      prismaMock as never,
      NOW,
    );

    expect(result.myRank).toBe(2);
    expect(result.items[0]).toMatchObject({
      identityId: 'idn_other',
      displayName: 'Jasur',
      handle: 'jasur',
      level: 8,
      totalXp: 900,
      rank: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(/@/);
    expect(JSON.stringify(result)).not.toMatch(/email|phone|wallet|amount/i);
  });

  it('hides opted-out users from the public board but keeps private XP', async () => {
    prismaMock.identity.findMany.mockResolvedValue([
      { id: 'idn_me', fullName: 'Aziz', socialProfile: { handle: 'aziz', showInGlobalRanking: false } },
      { id: 'idn_other', fullName: 'Jasur', socialProfile: { handle: 'jasur', showInGlobalRanking: true } },
    ]);
    const result = await listGlobalRanking(
      'ws_1',
      'idn_me',
      { period: GlobalLeaderboardPeriod.ALL, page: 1, pageSize: 20 },
      prismaMock as never,
      NOW,
    );
    expect(result.showMeInRanking).toBe(false);
    expect(result.myRank).toBeNull();
    expect(result.items.every((row) => row.identityId !== 'idn_me')).toBe(true);
    expect(result.myEntry?.totalXp).toBe(120);
  });
});
