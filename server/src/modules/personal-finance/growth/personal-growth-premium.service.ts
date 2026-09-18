import {
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
  GrowthFriendshipStatus,
  GrowthLearningGoalStatus,
  WorkspaceStatus,
  WorkspaceType,
  buildGrowthQuotaSnapshot,
  canWriteWithSubscription,
  effectiveSubscriptionStatus,
  growthQuotaFor,
  isGrowthQuotaExceeded,
  resolveGrowthTier,
  type GrowthQuotaKey,
  type GrowthQuotaSnapshot,
  type GrowthPlanTier,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  personalSubscription: PrismaClient['personalSubscription'];
  growthLearningGoal: { count: PrismaClient['growthLearningGoal']['count'] };
  growthHabit: { count: PrismaClient['growthHabit']['count'] };
  growthChallengeParticipant: {
    count: PrismaClient['growthChallengeParticipant']['count'];
  };
  growthFriendship: { count: PrismaClient['growthFriendship']['count'] };
};

async function assertPersonalWorkspace(workspaceId: string, db: DbClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

export async function resolveWorkspaceGrowthTier(
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthPlanTier> {
  const row = await db.personalSubscription.findUnique({
    where: { workspaceId },
    select: {
      planKey: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });
  if (!row) return 'FREE';
  const effective = effectiveSubscriptionStatus(row);
  return resolveGrowthTier({
    planKey: row.planKey,
    status: effective,
    canWrite: canWriteWithSubscription(effective),
  });
}

export async function countGrowthQuotaUsage(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<Record<GrowthQuotaKey, number>> {
  const [activeLearningGoals, activeHabits, activeChallenges, acceptedFriends] =
    await Promise.all([
      db.growthLearningGoal.count({
        where: {
          workspaceId,
          status: {
            in: [GrowthLearningGoalStatus.ACTIVE, GrowthLearningGoalStatus.PAUSED],
          },
        },
      }),
      db.growthHabit.count({
        where: { workspaceId, isArchived: false },
      }),
      db.growthChallengeParticipant.count({
        where: {
          identityId,
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
        },
      }),
      db.growthFriendship.count({
        where: {
          status: GrowthFriendshipStatus.ACCEPTED,
          OR: [{ requesterId: identityId }, { addresseeId: identityId }],
        },
      }),
    ]);

  return {
    activeLearningGoals,
    activeHabits,
    activeChallenges,
    acceptedFriends,
  };
}

export async function getGrowthQuotaSnapshot(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthQuotaSnapshot> {
  await assertPersonalWorkspace(workspaceId, db);
  const [tier, usage] = await Promise.all([
    resolveWorkspaceGrowthTier(workspaceId, db),
    countGrowthQuotaUsage(workspaceId, identityId, db),
  ]);
  return buildGrowthQuotaSnapshot({ tier, usage });
}

/**
 * Soft Free/Premium gate. Throws forbidden with upgrade-friendly Uzbek copy.
 * Does not invent a new subscription table — uses PersonalSubscription.
 */
export async function assertGrowthQuota(
  workspaceId: string,
  identityId: string,
  key: GrowthQuotaKey,
  usedCount: number,
  db: DbClient = defaultPrisma,
): Promise<GrowthPlanTier> {
  const tier = await resolveWorkspaceGrowthTier(workspaceId, db);
  if (!isGrowthQuotaExceeded(tier, key, usedCount)) {
    return tier;
  }
  const quota = growthQuotaFor(tier, key);
  if (tier === 'FREE') {
    throw ApiError.forbidden(
      `Sinov tarifida limit: ${quota}. Pullik tarifda ko‘proq joy ochiladi.`,
    );
  }
  throw ApiError.badRequest(`Limit: ${quota}`);
}
