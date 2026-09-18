import {
  GrowthFocusKind,
  GrowthFriendshipStatus,
  GrowthTodoStatus,
  WorkspaceStatus,
  WorkspaceType,
  computeFriendStreakFromDays,
  orderedFriendPair,
  periodStartDayKey,
  shiftDayKey,
  toDayKey,
  FRIEND_STREAK_LOOKBACK_DAYS,
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
  GrowthNotificationKind,
  type GrowthFriendStreakDto,
  type GrowthFriendStreaksResponse,
  type GrowthLeaderboardEntryDto,
  type GrowthLeaderboardMetric as LeaderboardMetric,
  type GrowthLeaderboardPeriod as LeaderboardPeriod,
  type GrowthLeaderboardResponse,
} from '@furniture-erp/shared';
import type { Identity, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryEvaluateAchievements } from './personal-growth-achievements.service.js';
import { tryEmitGrowthNotification } from './personal-growth-notifications.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  identity: PrismaClient['identity'];
  growthFriendship: PrismaClient['growthFriendship'];
  growthSocialProfile: PrismaClient['growthSocialProfile'];
  growthProgress: PrismaClient['growthProgress'];
  growthXpEvent: PrismaClient['growthXpEvent'];
  growthFocusSession: PrismaClient['growthFocusSession'];
  growthTodo: PrismaClient['growthTodo'];
  growthFriendStreak: PrismaClient['growthFriendStreak'];
  workspaceMembership: PrismaClient['workspaceMembership'];
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

async function personalWorkspaceId(
  identityId: string,
  db: DbClient,
): Promise<string | null> {
  const membership = await db.workspaceMembership.findFirst({
    where: {
      identityId,
      workspace: {
        type: WorkspaceType.PERSONAL,
        status: WorkspaceStatus.ACTIVE,
        storeId: null,
      },
    },
    select: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

async function activityDayKeys(
  identityId: string,
  fromDayKey: string,
  db: DbClient,
): Promise<Set<string>> {
  const workspaceId = await personalWorkspaceId(identityId, db);
  if (!workspaceId) return new Set();
  const rows = await db.growthXpEvent.findMany({
    where: {
      workspaceId,
      identityId,
      dayKey: { gte: fromDayKey },
    },
    select: { dayKey: true },
    distinct: ['dayKey'],
  });
  return new Set(rows.map((r) => r.dayKey));
}

async function listAcceptedFriendIds(
  identityId: string,
  db: DbClient,
): Promise<string[]> {
  const rows = await db.growthFriendship.findMany({
    where: {
      status: GrowthFriendshipStatus.ACCEPTED,
      OR: [{ requesterId: identityId }, { addresseeId: identityId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === identityId ? r.addresseeId : r.requesterId));
}

export async function listFriendStreaks(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFriendStreaksResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const todayKey = toDayKey(now);
  const lookbackStart = shiftDayKey(todayKey, -(FRIEND_STREAK_LOOKBACK_DAYS - 1));
  const friendIds = await listAcceptedFriendIds(identityId, db);
  const myDays = await activityDayKeys(identityId, lookbackStart, db);

  const items: GrowthFriendStreakDto[] = [];

  for (const friendId of friendIds) {
    const friend = await db.identity.findUnique({
      where: { id: friendId },
      include: { socialProfile: true },
    });
    if (!friend) continue;

    const friendDays = await activityDayKeys(friendId, lookbackStart, db);
    const computed = computeFriendStreakFromDays(myDays, friendDays, todayKey);
    const { pairKey, identityAId, identityBId } = orderedFriendPair(identityId, friendId);

    const existing = await db.growthFriendStreak.findUnique({ where: { pairKey } });
    const bestStreak = Math.max(existing?.bestStreak ?? 0, computed.bestStreak);
    const row = existing
      ? await db.growthFriendStreak.update({
          where: { pairKey },
          data: {
            currentStreak: computed.currentStreak,
            bestStreak,
            lastSharedDayKey: computed.lastSharedDayKey,
          },
        })
      : await db.growthFriendStreak.create({
          data: {
            pairKey,
            identityAId,
            identityBId,
            currentStreak: computed.currentStreak,
            bestStreak,
            lastSharedDayKey: computed.lastSharedDayKey,
          },
        });

    items.push({
      pairKey: row.pairKey,
      friend: {
        identityId: friend.id,
        fullName: friend.fullName,
        handle: friend.socialProfile?.handle ?? null,
      },
      currentStreak: row.currentStreak,
      bestStreak: row.bestStreak,
      lastSharedDayKey: row.lastSharedDayKey,
      bothActiveToday: myDays.has(todayKey) && friendDays.has(todayKey),
    });

    if (
      process.env.VITEST !== 'true' &&
      row.currentStreak > 0 &&
      [3, 7, 14, 30].includes(row.currentStreak)
    ) {
      await tryEmitGrowthNotification({
        identityId,
        workspaceId,
        kind: GrowthNotificationKind.STREAK,
        title: `${friend.fullName} bilan ${row.currentStreak} kun`,
        body: 'Do‘st streak davom etmoqda',
        href: '/personal/growth/social',
        entityType: 'GROWTH_FRIEND_STREAK',
        entityId: row.pairKey,
        dedupeKey: `friend-streak:${row.pairKey}:${row.currentStreak}`,
      });
    }
  }

  items.sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak);

  if (process.env.VITEST !== 'true' && items.some((i) => i.bestStreak >= 7)) {
    await tryEvaluateAchievements(workspaceId, identityId).catch(() => undefined);
  }

  return { items };
}

export async function maxBestFriendStreak(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<number> {
  const rows = await db.growthFriendStreak.findMany({
    where: {
      OR: [{ identityAId: identityId }, { identityBId: identityId }],
    },
    select: { bestStreak: true },
  });
  return rows.reduce((max, row) => Math.max(max, row.bestStreak), 0);
}

async function scoreForIdentity(
  identityId: string,
  metric: LeaderboardMetric,
  startDayKey: string,
  endDayKey: string,
  db: DbClient,
): Promise<{ score: number; level: number }> {
  const workspaceId = await personalWorkspaceId(identityId, db);
  if (!workspaceId) return { score: 0, level: 1 };

  const progress = await db.growthProgress.findUnique({
    where: { workspaceId },
    select: { level: true, totalXp: true },
  });
  const level = progress?.level ?? 1;

  if (metric === GrowthLeaderboardMetric.LEVEL) {
    return { score: level, level };
  }

  if (metric === GrowthLeaderboardMetric.XP) {
    const agg = await db.growthXpEvent.aggregate({
      where: {
        workspaceId,
        identityId,
        dayKey: { gte: startDayKey, lte: endDayKey },
      },
      _sum: { amount: true },
    });
    return { score: agg._sum.amount ?? 0, level };
  }

  if (metric === GrowthLeaderboardMetric.FOCUS_MINUTES) {
    const rows = await db.growthFocusSession.findMany({
      where: {
        workspaceId,
        identityId,
        kind: GrowthFocusKind.FOCUS,
        creditedMinutes: { gt: 0 },
        startedAt: {
          gte: new Date(`${startDayKey}T00:00:00.000Z`),
          lte: new Date(`${endDayKey}T23:59:59.999Z`),
        },
      },
      select: { creditedMinutes: true },
    });
    return {
      score: rows.reduce((sum, row) => sum + row.creditedMinutes, 0),
      level,
    };
  }

  const tasks = await db.growthTodo.count({
    where: {
      workspaceId,
      status: GrowthTodoStatus.DONE,
      completedAt: {
        gte: new Date(`${startDayKey}T00:00:00.000Z`),
        lte: new Date(`${endDayKey}T23:59:59.999Z`),
      },
    },
  });
  return { score: tasks, level };
}

export async function getFriendsLeaderboard(
  workspaceId: string,
  identityId: string,
  period: LeaderboardPeriod = GrowthLeaderboardPeriod.WEEKLY,
  metric: LeaderboardMetric = GrowthLeaderboardMetric.XP,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthLeaderboardResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const endDayKey = toDayKey(now);
  const startDayKey = periodStartDayKey(period, now);
  const friendIds = await listAcceptedFriendIds(identityId, db);
  const identityIds = [identityId, ...friendIds];

  const entriesRaw: Array<Omit<GrowthLeaderboardEntryDto, 'rank'>> = [];

  for (const id of identityIds) {
    const identity = (await db.identity.findUnique({
      where: { id },
      include: { socialProfile: true },
    })) as
      | (Identity & {
          socialProfile: {
            handle: string | null;
            showLevel: boolean;
            showActivity: boolean;
          } | null;
        })
      | null;
    if (!identity) continue;

    const isMe = id === identityId;
    const showActivity = isMe || (identity.socialProfile?.showActivity ?? true);
    const showLevel = isMe || (identity.socialProfile?.showLevel ?? true);
    const { score, level } = await scoreForIdentity(id, metric, startDayKey, endDayKey, db);

    entriesRaw.push({
      identityId: id,
      fullName: identity.fullName,
      handle: identity.socialProfile?.handle ?? null,
      score: showActivity ? score : null,
      level: showLevel ? level : null,
      isMe,
      scoreVisible: showActivity,
    });
  }

  entriesRaw.sort((a, b) => {
    const sa = a.scoreVisible ? (a.score ?? -1) : -1;
    const sb = b.scoreVisible ? (b.score ?? -1) : -1;
    if (sb !== sa) return sb - sa;
    return a.fullName.localeCompare(b.fullName);
  });

  const entries: GrowthLeaderboardEntryDto[] = entriesRaw.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return {
    period,
    metric,
    startDayKey,
    endDayKey,
    entries,
  };
}
