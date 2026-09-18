import { GrowthFriendshipStatus, WorkspaceType, friendshipPairKey } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    identity: { findFirst: vi.fn(), findMany: vi.fn() },
    growthFriendship: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    growthSocialProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthProgress: { findUnique: vi.fn() },
    workspaceMembership: { findFirst: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-achievements.service.js', () => ({
  tryEvaluateAchievements: vi.fn(),
}));
vi.mock('./personal-growth-premium.service.js', () => ({
  assertGrowthQuota: vi.fn().mockResolvedValue('FREE'),
}));

const { acceptFriendRequest, sendFriendRequest } = await import(
  './personal-growth-friends.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');
const ME = {
  id: 'idn_me',
  email: 'me@example.com',
  fullName: 'Me',
  passwordHash: null,
  createdAt: NOW,
  updatedAt: NOW,
  socialProfile: {
    handle: 'me',
    showLevel: true,
    showActivity: true,
    allowFriendRequests: true,
  },
};
const OTHER = {
  id: 'idn_other',
  email: 'other@example.com',
  fullName: 'Other',
  passwordHash: null,
  createdAt: NOW,
  updatedAt: NOW,
  socialProfile: {
    handle: 'other',
    showLevel: true,
    showActivity: true,
    allowFriendRequests: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthSocialProfile.findUnique.mockResolvedValue({
    id: 'sp_1',
    identityId: 'idn_me',
    handle: 'me',
    bio: null,
    showLevel: true,
    showActivity: true,
    allowFriendRequests: true,
  });
  prismaMock.workspaceMembership.findFirst.mockResolvedValue({ workspaceId: 'ws_other' });
  prismaMock.growthProgress.findUnique.mockResolvedValue({ level: 3 });
  prismaMock.growthFriendship.count.mockResolvedValue(0);
});

describe('sendFriendRequest', () => {
  it('creates a pending friendship by email', async () => {
    prismaMock.identity.findFirst.mockResolvedValue(OTHER);
    prismaMock.growthFriendship.findUnique.mockResolvedValue(null);
    prismaMock.growthFriendship.create.mockResolvedValue({
      id: 'fr_1',
      requesterId: 'idn_me',
      addresseeId: 'idn_other',
      pairKey: friendshipPairKey('idn_me', 'idn_other'),
      status: GrowthFriendshipStatus.PENDING,
      blockedById: null,
      respondedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      requester: ME,
      addressee: OTHER,
    });

    const row = await sendFriendRequest(
      'ws_1',
      'idn_me',
      { query: 'other@example.com' },
      prismaMock as never,
      NOW,
    );
    expect(row.status).toBe('PENDING');
    expect(row.friend.fullName).toBe('Other');
    expect(row.iAmRequester).toBe(true);
  });
});

describe('acceptFriendRequest', () => {
  it('accepts incoming pending request', async () => {
    prismaMock.growthFriendship.findFirst.mockResolvedValue({
      id: 'fr_1',
      requesterId: 'idn_other',
      addresseeId: 'idn_me',
      pairKey: friendshipPairKey('idn_me', 'idn_other'),
      status: GrowthFriendshipStatus.PENDING,
      blockedById: null,
      respondedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      requester: OTHER,
      addressee: ME,
    });
    prismaMock.growthFriendship.update.mockResolvedValue({
      id: 'fr_1',
      requesterId: 'idn_other',
      addresseeId: 'idn_me',
      pairKey: friendshipPairKey('idn_me', 'idn_other'),
      status: GrowthFriendshipStatus.ACCEPTED,
      blockedById: null,
      respondedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      requester: OTHER,
      addressee: ME,
    });

    const row = await acceptFriendRequest(
      'ws_1',
      'idn_me',
      'fr_1',
      prismaMock as never,
      NOW,
    );
    expect(row.status).toBe('ACCEPTED');
  });
});
