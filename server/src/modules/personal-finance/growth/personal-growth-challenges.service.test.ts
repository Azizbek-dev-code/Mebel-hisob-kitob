import {
  GrowthChallengeKind,
  GrowthChallengeMetric,
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, awardXpMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    identity: { findFirst: vi.fn() },
    growthChallenge: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthChallengeParticipant: {
      count: vi.fn(),
      update: vi.fn(),
    },
    growthFriendship: { findFirst: vi.fn() },
    growthSocialProfile: { findUnique: vi.fn() },
    workspaceMembership: { findFirst: vi.fn() },
    growthFocusSession: { findMany: vi.fn() },
    growthTodo: { count: vi.fn() },
    growthLearningSession: { findMany: vi.fn() },
    growthXpEvent: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  awardXpMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-achievements.service.js', () => ({
  tryEvaluateAchievements: vi.fn(),
}));
vi.mock('./personal-growth-xp.service.js', () => ({
  awardXp: awardXpMock,
}));
vi.mock('./personal-growth-premium.service.js', () => ({
  assertGrowthQuota: vi.fn().mockResolvedValue('FREE'),
}));

const { acceptChallenge, createChallenge } = await import(
  './personal-growth-challenges.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');
const ME = {
  id: 'idn_me',
  email: 'me@example.com',
  fullName: 'Me',
  passwordHash: null,
  createdAt: NOW,
  updatedAt: NOW,
  socialProfile: { handle: 'me' },
};
const OTHER = {
  id: 'idn_other',
  email: 'other@example.com',
  fullName: 'Other',
  passwordHash: null,
  createdAt: NOW,
  updatedAt: NOW,
  socialProfile: { handle: 'other' },
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  awardXpMock.mockResolvedValue(null);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthChallengeParticipant.count.mockResolvedValue(0);
  prismaMock.growthFriendship.findFirst.mockResolvedValue({ id: 'fr_1' });
});

describe('createChallenge', () => {
  it('creates a pending fight with one opponent', async () => {
    prismaMock.growthChallenge.create.mockResolvedValue({
      id: 'ch_1',
      kind: GrowthChallengeKind.FIGHT,
      title: '7 kun fokus',
      metric: GrowthChallengeMetric.FOCUS_MINUTES,
      targetValue: null,
      durationDays: 7,
      status: GrowthChallengeStatus.PENDING,
      createdById: 'idn_me',
      rewardXp: 50,
      startAt: null,
      endAt: null,
      winnerId: null,
      completedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      participants: [
        {
          id: 'p1',
          challengeId: 'ch_1',
          identityId: 'idn_me',
          status: GrowthChallengeParticipantStatus.ACCEPTED,
          score: 0,
          respondedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
          identity: ME,
        },
        {
          id: 'p2',
          challengeId: 'ch_1',
          identityId: 'idn_other',
          status: GrowthChallengeParticipantStatus.INVITED,
          score: 0,
          respondedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          identity: OTHER,
        },
      ],
    });

    const row = await createChallenge(
      'ws_1',
      'idn_me',
      {
        kind: GrowthChallengeKind.FIGHT,
        title: '7 kun fokus',
        metric: GrowthChallengeMetric.FOCUS_MINUTES,
        durationDays: 7,
        inviteeIds: ['idn_other'],
      },
      prismaMock as never,
      NOW,
    );

    expect(row.kind).toBe('FIGHT');
    expect(row.status).toBe('PENDING');
    expect(row.participants).toHaveLength(2);
    expect(recordAuditMock).toHaveBeenCalled();
  });
});

describe('acceptChallenge', () => {
  it('activates fight when opponent accepts', async () => {
    const pending = {
      id: 'ch_1',
      kind: GrowthChallengeKind.FIGHT,
      title: 'Fight',
      metric: GrowthChallengeMetric.XP_GAINED,
      targetValue: null,
      durationDays: 7,
      status: GrowthChallengeStatus.PENDING,
      createdById: 'idn_me',
      rewardXp: 50,
      startAt: null,
      endAt: null,
      winnerId: null,
      completedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      participants: [
        {
          id: 'p1',
          challengeId: 'ch_1',
          identityId: 'idn_me',
          status: GrowthChallengeParticipantStatus.ACCEPTED,
          score: 0,
          respondedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
          identity: ME,
        },
        {
          id: 'p2',
          challengeId: 'ch_1',
          identityId: 'idn_other',
          status: GrowthChallengeParticipantStatus.INVITED,
          score: 0,
          respondedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          identity: OTHER,
        },
      ],
    };

    prismaMock.growthChallenge.findFirst.mockResolvedValue(pending);
    prismaMock.growthChallengeParticipant.update.mockResolvedValue({});
    prismaMock.growthChallenge.findUnique.mockResolvedValue({
      ...pending,
      participants: [
        pending.participants[0],
        {
          ...pending.participants[1],
          status: GrowthChallengeParticipantStatus.ACCEPTED,
          respondedAt: NOW,
        },
      ],
    });
    prismaMock.growthChallenge.update.mockResolvedValue({
      ...pending,
      status: GrowthChallengeStatus.ACTIVE,
      startAt: NOW,
      endAt: new Date('2026-09-24T12:00:00.000Z'),
      participants: [
        pending.participants[0],
        {
          ...pending.participants[1],
          status: GrowthChallengeParticipantStatus.ACCEPTED,
          respondedAt: NOW,
        },
      ],
    });

    const row = await acceptChallenge(
      'ws_other',
      'idn_other',
      'ch_1',
      prismaMock as never,
      NOW,
    );

    expect(row.status).toBe('ACTIVE');
    expect(row.startAt).toBeTruthy();
    expect(prismaMock.growthChallenge.update).toHaveBeenCalled();
  });
});
