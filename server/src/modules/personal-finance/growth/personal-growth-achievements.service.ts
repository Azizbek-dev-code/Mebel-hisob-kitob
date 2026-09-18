import {
  GrowthChallengeKind,
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
  GrowthFocusKind,
  GrowthFocusStatus,
  GrowthFriendshipStatus,
  GrowthLearningGoalStatus,
  GrowthNotificationKind,
  GrowthTodoStatus,
  GrowthXpSource,
  GROWTH_ACHIEVEMENT_CATALOG,
  ExpenseStatus,
  PersonalEntryType,
  WorkspaceStatus,
  WorkspaceType,
  listNewlyUnlockedAchievements,
  type AchievementStats,
  type GrowthAchievementDto,
  type GrowthAchievementsResponse,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { logger } from '../../../utils/logger.js';

import { awardXp } from './personal-growth-xp.service.js';
import { tryEmitGrowthNotification } from './personal-growth-notifications.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  growthAchievementUnlock: PrismaClient['growthAchievementUnlock'];
  growthTodo: { count: PrismaClient['growthTodo']['count'] };
  growthFocusSession: {
    count: PrismaClient['growthFocusSession']['count'];
    findMany: PrismaClient['growthFocusSession']['findMany'];
  };
  growthProgress: { findUnique: PrismaClient['growthProgress']['findUnique'] };
  growthHabitCheckIn: { count: PrismaClient['growthHabitCheckIn']['count'] };
  growthDailyGoal: { count: PrismaClient['growthDailyGoal']['count'] };
  growthLearningGoal: { count: PrismaClient['growthLearningGoal']['count'] };
  personalSavingGoal: { count: PrismaClient['personalSavingGoal']['count'] };
  personalEntry: { count: PrismaClient['personalEntry']['count'] };
  personalGoalContribution: { count: PrismaClient['personalGoalContribution']['count'] };
  growthFriendship: { count: PrismaClient['growthFriendship']['count'] };
  growthChallengeParticipant: {
    count: PrismaClient['growthChallengeParticipant']['count'];
  };
  growthFriendStreak: {
    findMany: PrismaClient['growthFriendStreak']['findMany'];
  };
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

export async function collectAchievementStats(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<AchievementStats> {
  const [
    todosCompleted,
    focusSessionsCompleted,
    focusRows,
    progress,
    habitCheckIns,
    dailyGoalsDone,
    learningGoalsCreated,
    learningGoalsCompleted,
    savingGoalsCount,
    expenseEntriesCount,
    savingContributionsCount,
    friendsAccepted,
    challengesJoined,
    fightsCompleted,
    friendStreakRows,
  ] = await Promise.all([
    db.growthTodo.count({
      where: { workspaceId, status: GrowthTodoStatus.DONE },
    }),
    db.growthFocusSession.count({
      where: {
        workspaceId,
        kind: GrowthFocusKind.FOCUS,
        status: { in: [GrowthFocusStatus.COMPLETED, GrowthFocusStatus.INTERRUPTED] },
        creditedMinutes: { gt: 0 },
      },
    }),
    db.growthFocusSession.findMany({
      where: {
        workspaceId,
        kind: GrowthFocusKind.FOCUS,
        creditedMinutes: { gt: 0 },
      },
      select: { creditedMinutes: true },
    }),
    db.growthProgress.findUnique({ where: { workspaceId } }),
    db.growthHabitCheckIn.count({ where: { workspaceId } }),
    db.growthDailyGoal.count({ where: { workspaceId, isDone: true } }),
    db.growthLearningGoal.count({ where: { workspaceId } }),
    db.growthLearningGoal.count({
      where: { workspaceId, status: GrowthLearningGoalStatus.COMPLETED },
    }),
    db.personalSavingGoal.count({ where: { workspaceId } }),
    db.personalEntry.count({
      where: {
        workspaceId,
        type: PersonalEntryType.EXPENSE,
        status: ExpenseStatus.ACTIVE,
      },
    }),
    db.personalGoalContribution.count({
      where: { goal: { workspaceId } },
    }),
    db.growthFriendship.count({
      where: {
        status: GrowthFriendshipStatus.ACCEPTED,
        OR: [{ requesterId: identityId }, { addresseeId: identityId }],
      },
    }),
    db.growthChallengeParticipant.count({
      where: {
        identityId,
        status: GrowthChallengeParticipantStatus.ACCEPTED,
        challenge: {
          status: {
            in: [GrowthChallengeStatus.ACTIVE, GrowthChallengeStatus.COMPLETED],
          },
        },
      },
    }),
    db.growthChallengeParticipant.count({
      where: {
        identityId,
        status: GrowthChallengeParticipantStatus.ACCEPTED,
        challenge: {
          kind: GrowthChallengeKind.FIGHT,
          status: GrowthChallengeStatus.COMPLETED,
        },
      },
    }),
    db.growthFriendStreak.findMany({
      where: {
        OR: [{ identityAId: identityId }, { identityBId: identityId }],
      },
      select: { bestStreak: true },
    }),
  ]);

  const focusMinutesTotal = focusRows.reduce((sum, row) => sum + row.creditedMinutes, 0);
  const bestFriendStreak = friendStreakRows.reduce(
    (max, row) => Math.max(max, row.bestStreak),
    0,
  );

  return {
    todosCompleted,
    focusSessionsCompleted,
    focusMinutesTotal,
    bestStreak: progress?.bestStreak ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
    habitCheckIns,
    dailyGoalsDone,
    learningGoalsCreated,
    learningGoalsCompleted,
    level: progress?.level ?? 1,
    savingGoalsCount,
    expenseEntriesCount,
    savingContributionsCount,
    friendsAccepted,
    challengesJoined,
    fightsCompleted,
    bestFriendStreak,
  };
}

function toItems(
  unlockedMap: Map<string, { unlockedAt: Date; rewardXp: number }>,
): GrowthAchievementDto[] {
  return GROWTH_ACHIEVEMENT_CATALOG.map((def) => {
    const unlock = unlockedMap.get(def.key);
    return {
      key: def.key,
      titleKey: def.titleKey,
      hintKey: def.hintKey,
      rewardXp: def.rewardXp,
      comingSoon: Boolean(def.comingSoon),
      unlocked: Boolean(unlock),
      unlockedAt: unlock ? unlock.unlockedAt.toISOString() : null,
    };
  });
}

export async function listAchievements(
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthAchievementsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const unlocks = await db.growthAchievementUnlock.findMany({
    where: { workspaceId },
  });
  const unlockedMap = new Map(
    unlocks.map((u) => [u.achievementKey, { unlockedAt: u.unlockedAt, rewardXp: u.rewardXp }]),
  );
  const items = toItems(unlockedMap);
  const totalActive = GROWTH_ACHIEVEMENT_CATALOG.filter((a) => !a.comingSoon).length;
  return {
    items,
    unlockedCount: items.filter((i) => i.unlocked && !i.comingSoon).length,
    totalCount: totalActive,
    newlyUnlocked: [],
  };
}

/**
 * Idempotent unlock pass. Awards bonus XP once per achievement key.
 */
export async function evaluateAchievements(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthAchievementsResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const [stats, unlocks] = await Promise.all([
    collectAchievementStats(workspaceId, identityId, db),
    db.growthAchievementUnlock.findMany({ where: { workspaceId } }),
  ]);
  const already = new Set(unlocks.map((u) => u.achievementKey));
  const newly = listNewlyUnlockedAchievements(stats, already);
  const newlyUnlocked: string[] = [];

  for (const def of newly) {
    try {
      await db.growthAchievementUnlock.create({
        data: {
          workspaceId,
          identityId,
          achievementKey: def.key,
          rewardXp: def.rewardXp,
        },
      });
      newlyUnlocked.push(def.key);
      already.add(def.key);

      if (def.rewardXp > 0) {
        await awardXp({
          workspaceId,
          identityId,
          source: GrowthXpSource.ACHIEVEMENT_UNLOCKED,
          sourceEntityId: `achievement:${def.key}`,
          amount: def.rewardXp,
          summary: `Achievement: ${def.key}`,
        });
      }

      await recordAudit({
        storeId: null,
        actorUserId: null,
        eventType: 'GROWTH_ACHIEVEMENT_UNLOCKED',
        entityType: 'GROWTH_ACHIEVEMENT',
        entityId: def.key,
        summary: `Achievement unlocked: ${def.key}`,
        metadata: { workspaceId, identityId, rewardXp: def.rewardXp },
      });

      if (process.env.VITEST !== 'true') {
        await tryEmitGrowthNotification({
          identityId,
          workspaceId,
          kind: GrowthNotificationKind.ACHIEVEMENT,
          title: def.key,
          body: def.rewardXp > 0 ? `+${def.rewardXp} XP` : null,
          href: '/personal/growth/achievements',
          entityType: 'GROWTH_ACHIEVEMENT',
          entityId: def.key,
          dedupeKey: `achievement:${workspaceId}:${def.key}`,
        });
      }
    } catch (error) {
      // Unique race — another request unlocked first.
      logger.warn('Achievement unlock skipped', {
        workspaceId,
        key: def.key,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const refreshed = await db.growthAchievementUnlock.findMany({ where: { workspaceId } });
  const unlockedMap = new Map(
    refreshed.map((u) => [u.achievementKey, { unlockedAt: u.unlockedAt, rewardXp: u.rewardXp }]),
  );
  const items = toItems(unlockedMap);
  const totalActive = GROWTH_ACHIEVEMENT_CATALOG.filter((a) => !a.comingSoon).length;

  return {
    items,
    unlockedCount: items.filter((i) => i.unlocked && !i.comingSoon).length,
    totalCount: totalActive,
    newlyUnlocked,
  };
}

export async function tryEvaluateAchievements(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  try {
    await evaluateAchievements(workspaceId, identityId, db);
  } catch (error) {
    logger.error('Failed to evaluate achievements', {
      workspaceId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
