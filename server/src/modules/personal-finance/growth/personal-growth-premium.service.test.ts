import {
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
  GrowthFriendshipStatus,
  GrowthLearningGoalStatus,
  PERSONAL_PLAN_KEY,
  SubscriptionStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalSubscription: { findUnique: vi.fn() },
    growthLearningGoal: { count: vi.fn() },
    growthHabit: { count: vi.fn() },
    growthChallengeParticipant: { count: vi.fn() },
    growthFriendship: { count: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { assertGrowthQuota, getGrowthQuotaSnapshot } = await import(
  './personal-growth-premium.service.js'
);

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.personalSubscription.findUnique.mockResolvedValue({
    planKey: PERSONAL_PLAN_KEY.TRIAL,
    status: SubscriptionStatus.TRIAL,
    trialEndsAt: new Date('2026-10-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
  });
  prismaMock.growthLearningGoal.count.mockResolvedValue(5);
  prismaMock.growthHabit.count.mockResolvedValue(1);
  prismaMock.growthChallengeParticipant.count.mockResolvedValue(0);
  prismaMock.growthFriendship.count.mockResolvedValue(2);
});

describe('assertGrowthQuota', () => {
  it('blocks free tier when at learning-goal cap', async () => {
    await expect(
      assertGrowthQuota('ws_1', 'idn_1', 'activeLearningGoals', 5, prismaMock as never),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('Sinov tarifida limit'),
    });
  });

  it('allows paid premium higher caps', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      planKey: PERSONAL_PLAN_KEY.PAID,
      status: SubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-10-17T00:00:00.000Z'),
    });
    await expect(
      assertGrowthQuota('ws_1', 'idn_1', 'activeLearningGoals', 5, prismaMock as never),
    ).resolves.toBe('PREMIUM');
  });
});

describe('getGrowthQuotaSnapshot', () => {
  it('returns free usage snapshot', async () => {
    const snap = await getGrowthQuotaSnapshot('ws_1', 'idn_1', prismaMock as never);
    expect(snap.tier).toBe('FREE');
    expect(snap.premium).toBe(false);
    expect(snap.usage.activeLearningGoals).toBe(5);
    expect(snap.nearLimit).toBe(true);
    expect(prismaMock.growthLearningGoal.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [GrowthLearningGoalStatus.ACTIVE, GrowthLearningGoalStatus.PAUSED],
          },
        }),
      }),
    );
    expect(prismaMock.growthFriendship.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: GrowthFriendshipStatus.ACCEPTED,
        }),
      }),
    );
    expect(prismaMock.growthChallengeParticipant.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              GrowthChallengeParticipantStatus.INVITED,
              GrowthChallengeParticipantStatus.ACCEPTED,
            ],
          },
          challenge: {
            status: {
              in: [GrowthChallengeStatus.PENDING, GrowthChallengeStatus.ACTIVE],
            },
          },
        }),
      }),
    );
  });
});
