import { GrowthNotificationKind, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthSocialProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthNotification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    growthTodo: { findMany: vi.fn() },
    growthCalendarEvent: { findMany: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const {
  emitGrowthNotification,
  listGrowthNotifications,
  markGrowthNotificationsRead,
} = await import('./personal-growth-notifications.service.js');

const NOW = new Date('2026-09-17T12:00:00.000Z');
const PROFILE = {
  id: 'sp_1',
  identityId: 'idn_1',
  handle: null,
  bio: null,
  showLevel: true,
  showActivity: true,
  allowFriendRequests: true,
  notifyReminder: true,
  notifyAchievement: true,
  notifyFriend: true,
  notifyFight: true,
  notifyStreak: true,
  notifyResult: true,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthSocialProfile.findUnique.mockResolvedValue(PROFILE);
  prismaMock.growthTodo.findMany.mockResolvedValue([]);
  prismaMock.growthCalendarEvent.findMany.mockResolvedValue([]);
});

describe('emitGrowthNotification', () => {
  it('creates a friend notification when prefs allow', async () => {
    prismaMock.growthNotification.create.mockResolvedValue({
      id: 'n_1',
      identityId: 'idn_1',
      workspaceId: 'ws_1',
      kind: GrowthNotificationKind.FRIEND,
      title: 'Yangi so‘rov',
      body: null,
      href: '/personal/growth/friends',
      entityType: 'GROWTH_FRIENDSHIP',
      entityId: 'fr_1',
      dedupeKey: 'friend:fr_1',
      readAt: null,
      dismissedAt: null,
      createdAt: NOW,
    });

    const row = await emitGrowthNotification(
      {
        identityId: 'idn_1',
        workspaceId: 'ws_1',
        kind: GrowthNotificationKind.FRIEND,
        title: 'Yangi so‘rov',
        href: '/personal/growth/friends',
        entityType: 'GROWTH_FRIENDSHIP',
        entityId: 'fr_1',
        dedupeKey: 'friend:fr_1',
      },
      prismaMock as never,
    );

    expect(row?.kind).toBe('FRIEND');
    expect(prismaMock.growthNotification.create).toHaveBeenCalled();
  });

  it('skips when pref disabled', async () => {
    prismaMock.growthSocialProfile.findUnique.mockResolvedValue({
      ...PROFILE,
      notifyFriend: false,
    });
    const row = await emitGrowthNotification(
      {
        identityId: 'idn_1',
        kind: GrowthNotificationKind.FRIEND,
        title: 'X',
        dedupeKey: 'friend:x',
      },
      prismaMock as never,
    );
    expect(row).toBeNull();
    expect(prismaMock.growthNotification.create).not.toHaveBeenCalled();
  });
});

describe('listGrowthNotifications', () => {
  it('returns items and unread count', async () => {
    prismaMock.growthNotification.findMany.mockResolvedValue([
      {
        id: 'n_1',
        identityId: 'idn_1',
        workspaceId: 'ws_1',
        kind: GrowthNotificationKind.ACHIEVEMENT,
        title: 'Badge',
        body: null,
        href: '/personal/growth/achievements',
        entityType: null,
        entityId: null,
        dedupeKey: 'ach:1',
        readAt: null,
        dismissedAt: null,
        createdAt: NOW,
      },
    ]);
    prismaMock.growthNotification.count.mockResolvedValue(1);

    const result = await listGrowthNotifications(
      'ws_1',
      'idn_1',
      prismaMock as never,
      NOW,
    );
    expect(result.items).toHaveLength(1);
    expect(result.unreadCount).toBe(1);
    expect(result.prefs.notifyAchievement).toBe(true);
  });
});

describe('markGrowthNotificationsRead', () => {
  it('marks all unread when ids omitted', async () => {
    prismaMock.growthNotification.updateMany.mockResolvedValue({ count: 3 });
    const result = await markGrowthNotificationsRead(
      'ws_1',
      'idn_1',
      {},
      prismaMock as never,
      NOW,
    );
    expect(result.updated).toBe(3);
  });
});
