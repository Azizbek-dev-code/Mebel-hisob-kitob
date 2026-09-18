import {
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
  WorkspaceType,
  friendshipPairKey,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    identity: { findUnique: vi.fn() },
    growthFriendship: { findMany: vi.fn() },
    growthSocialProfile: { findUnique: vi.fn() },
    growthProgress: { findUnique: vi.fn() },
    growthXpEvent: { findMany: vi.fn(), aggregate: vi.fn() },
    growthFocusSession: { findMany: vi.fn() },
    growthTodo: { count: vi.fn() },
    growthFriendStreak: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    workspaceMembership: { findFirst: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./personal-growth-achievements.service.js', () => ({
  tryEvaluateAchievements: vi.fn(),
}));

const { getFriendsLeaderboard, listFriendStreaks } = await import(
  './personal-growth-social.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthFriendship.findMany.mockResolvedValue([
    { requesterId: 'idn_me', addresseeId: 'idn_other' },
  ]);
  prismaMock.workspaceMembership.findFirst.mockImplementation(
    async ({ where }: { where: { identityId: string } }) => ({
      workspaceId: where.identityId === 'idn_me' ? 'ws_1' : 'ws_other',
    }),
  );
});

describe('getFriendsLeaderboard', () => {
  it('ranks self and friends by weekly XP', async () => {
    prismaMock.identity.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === 'idn_me') {
        return {
          id: 'idn_me',
          fullName: 'Me',
          socialProfile: { handle: 'me', showLevel: true, showActivity: true },
        };
      }
      return {
        id: 'idn_other',
        fullName: 'Other',
        socialProfile: { handle: 'other', showLevel: true, showActivity: true },
      };
    });
    prismaMock.growthProgress.findUnique.mockResolvedValue({ level: 3, totalXp: 400 });
    prismaMock.growthXpEvent.aggregate.mockImplementation(
      async ({ where }: { where: { identityId: string } }) => ({
        _sum: { amount: where.identityId === 'idn_me' ? 120 : 200 },
      }),
    );

    const board = await getFriendsLeaderboard(
      'ws_1',
      'idn_me',
      GrowthLeaderboardPeriod.WEEKLY,
      GrowthLeaderboardMetric.XP,
      prismaMock as never,
      NOW,
    );

    expect(board.entries).toHaveLength(2);
    expect(board.entries[0]?.identityId).toBe('idn_other');
    expect(board.entries[0]?.rank).toBe(1);
    expect(board.entries[0]?.score).toBe(200);
    expect(board.entries[1]?.isMe).toBe(true);
  });
});

describe('listFriendStreaks', () => {
  it('upserts shared streak from overlapping activity days', async () => {
    prismaMock.identity.findUnique.mockResolvedValue({
      id: 'idn_other',
      fullName: 'Other',
      socialProfile: { handle: 'other' },
    });
    prismaMock.growthXpEvent.findMany.mockImplementation(
      async ({ where }: { where: { identityId: string } }) => {
        if (where.identityId === 'idn_me') {
          return [{ dayKey: '2026-09-16' }, { dayKey: '2026-09-17' }];
        }
        return [{ dayKey: '2026-09-16' }, { dayKey: '2026-09-17' }];
      },
    );
    prismaMock.growthFriendStreak.findUnique.mockResolvedValue(null);
    prismaMock.growthFriendStreak.create.mockResolvedValue({
      pairKey: friendshipPairKey('idn_me', 'idn_other'),
      currentStreak: 2,
      bestStreak: 2,
      lastSharedDayKey: '2026-09-17',
    });

    const result = await listFriendStreaks(
      'ws_1',
      'idn_me',
      prismaMock as never,
      NOW,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.currentStreak).toBe(2);
    expect(result.items[0]?.bothActiveToday).toBe(true);
    expect(prismaMock.growthFriendStreak.create).toHaveBeenCalled();
  });
});
