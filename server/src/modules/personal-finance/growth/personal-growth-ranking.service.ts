import {
  GlobalLeaderboardPeriod,
  GrowthFriendshipStatus,
  WorkspaceStatus,
  WorkspaceType,
  type AppFeedbackKind,
  type GlobalRankingEntryDto,
  type GlobalRankingListResponse,
  type GlobalRankingProfileDto,
  type GlobalRankingProfileFeedbackDto,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

type DbClient = PrismaClient;

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

function periodStart(period: GlobalLeaderboardPeriod, now: Date): Date | null {
  if (period === GlobalLeaderboardPeriod.ALL) return null;
  if (period === GlobalLeaderboardPeriod.WEEKLY) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dow = day.getUTCDay();
    day.setUTCDate(day.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    return day;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function displayName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed || 'Foydalanuvchi';
}

export async function listGlobalRanking(
  workspaceId: string,
  identityId: string,
  query: { period?: GlobalLeaderboardPeriod; page?: number; pageSize?: number },
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GlobalRankingListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const period = query.period ?? GlobalLeaderboardPeriod.WEEKLY;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, query.pageSize ?? 20));
  const from = periodStart(period, now);

  const progressRows = await db.growthProgress.findMany({
    orderBy: { totalXp: 'desc' },
    take: 500,
  });
  const platformXpAll = await db.platformXpTransaction.groupBy({
    by: ['identityId'],
    _sum: { xp: true },
  });
  const platformXpAllMap = new Map(platformXpAll.map((row) => [row.identityId, row._sum.xp ?? 0]));
  const identityIds = [
    ...new Set([...progressRows.map((row) => row.identityId), ...platformXpAllMap.keys()]),
  ];
  const identityRows = await db.identity.findMany({
    where: { id: { in: identityIds } },
    select: { id: true, fullName: true, socialProfile: { select: { handle: true, showInGlobalRanking: true } } },
  });
  const identityMap = new Map(identityRows.map((row) => [row.id, row]));

  const unique = new Map<
    string,
    {
      identityId: string;
      displayName: string;
      handle: string | null;
      level: number;
      totalXp: number;
      currentStreak: number;
      showInRanking: boolean;
    }
  >();
  for (const row of progressRows) {
    if (unique.has(row.identityId)) continue;
    const identity = identityMap.get(row.identityId);
    if (!identity) continue;
    unique.set(row.identityId, {
      identityId: identity.id,
      displayName: displayName(identity.fullName),
      handle: identity.socialProfile?.handle ?? null,
      level: row.level,
      totalXp: row.totalXp + (platformXpAllMap.get(row.identityId) ?? 0),
      currentStreak: row.currentStreak,
      showInRanking: identity.socialProfile?.showInGlobalRanking !== false,
    });
  }
  for (const [id, xp] of platformXpAllMap) {
    if (unique.has(id) || xp <= 0) continue;
    const identity = identityMap.get(id);
    if (!identity) continue;
    unique.set(id, {
      identityId: identity.id,
      displayName: displayName(identity.fullName),
      handle: identity.socialProfile?.handle ?? null,
      level: 1,
      totalXp: xp,
      currentStreak: 0,
      showInRanking: identity.socialProfile?.showInGlobalRanking !== false,
    });
  }
  const base = [...unique.values()];

  let periodXp = new Map<string, number>();
  if (from) {
    const events = await db.growthXpEvent.groupBy({
      by: ['identityId'],
      where: { createdAt: { gte: from } },
      _sum: { amount: true },
    });
    periodXp = new Map(events.map((row) => [row.identityId, row._sum.amount ?? 0]));
    const platformPeriod = await db.platformXpTransaction.groupBy({
      by: ['identityId'],
      where: { identityId: { in: identityIds }, createdAt: { gte: from } },
      _sum: { xp: true },
    });
    for (const row of platformPeriod) {
      periodXp.set(row.identityId, (periodXp.get(row.identityId) ?? 0) + (row._sum.xp ?? 0));
    }
  }

  const ranked = base
    .map((row) => ({
      ...row,
      periodXp: from ? periodXp.get(row.identityId) ?? 0 : row.totalXp,
    }))
    .sort((a, b) => b.periodXp - a.periodXp || b.totalXp - a.totalXp || a.identityId.localeCompare(b.identityId));

  const publicRanked = ranked.filter((row) => row.showInRanking);
  const withRank: GlobalRankingEntryDto[] = publicRanked.map((row, index) => ({
    identityId: row.identityId,
    displayName: row.displayName,
    handle: row.handle,
    level: row.level,
    totalXp: row.totalXp,
    periodXp: row.periodXp,
    currentStreak: row.currentStreak,
    rank: index + 1,
    isMe: row.identityId === identityId,
  }));

  const myBase = ranked.find((row) => row.identityId === identityId) ?? null;
  const showMeInRanking = myBase?.showInRanking !== false;
  const myPublic = withRank.find((row) => row.isMe) ?? null;
  const myEntry = myBase
    ? {
        identityId: myBase.identityId,
        displayName: myBase.displayName,
        handle: myBase.handle,
        level: myBase.level,
        totalXp: myBase.totalXp,
        periodXp: myBase.periodXp,
        currentStreak: myBase.currentStreak,
        rank: myPublic?.rank ?? 0,
        isMe: true,
      }
    : null;
  const totalItems = withRank.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const items = withRank.slice((page - 1) * pageSize, page * pageSize);

  return {
    period,
    items,
    myRank: showMeInRanking ? (myPublic?.rank ?? null) : null,
    myEntry: myEntry && (!showMeInRanking || myPublic) ? { ...myEntry, rank: showMeInRanking ? myEntry.rank : 0 } : myEntry,
    showMeInRanking,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getGlobalRankingProfile(
  workspaceId: string,
  me: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GlobalRankingProfileDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const identity = await db.identity.findUnique({
    where: { id: identityId },
    select: {
      id: true,
      fullName: true,
      socialProfile: true,
    },
  });
  if (!identity) throw ApiError.notFound('Profil topilmadi');

  const progress = await db.growthProgress.findFirst({
    where: { identityId },
    orderBy: { totalXp: 'desc' },
  });

  let friendshipStatus: GlobalRankingProfileDto['friendshipStatus'] = 'NONE';
  if (me === identityId) {
    friendshipStatus = 'SELF';
  } else {
    const pair = await db.growthFriendship.findFirst({
      where: {
        OR: [
          { requesterId: me, addresseeId: identityId },
          { requesterId: identityId, addresseeId: me },
        ],
      },
    });
    if (pair?.status === GrowthFriendshipStatus.ACCEPTED) friendshipStatus = 'FRIENDS';
    else if (pair?.status === GrowthFriendshipStatus.PENDING && pair.requesterId === me) {
      friendshipStatus = 'PENDING_OUTGOING';
    } else if (pair?.status === GrowthFriendshipStatus.PENDING) {
      friendshipStatus = 'PENDING_INCOMING';
    }
  }

  const feedbackRows = await db.appFeedback.findMany({
    where: { identityId, isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      _count: { select: { reactions: true, views: true } },
      reactions: { where: { identityId: me }, select: { id: true } },
    },
  });

  if (me !== identityId) {
    for (const row of feedbackRows) {
      await db.appFeedbackView.upsert({
        where: { feedbackId_identityId: { feedbackId: row.id, identityId: me } },
        create: { feedbackId: row.id, identityId: me },
        update: {},
      }).catch(() => undefined);
    }
  }

  const feedback: GlobalRankingProfileFeedbackDto[] = feedbackRows.map((row) => ({
    id: row.id,
    kind: row.kind as AppFeedbackKind,
    body: row.body,
    rating: row.rating,
    likeCount: row._count.reactions,
    viewCount: row._count.views + (me !== identityId ? 1 : 0),
    likedByMe: row.reactions.length > 0,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    identityId,
    displayName: displayName(identity.fullName),
    handle: identity.socialProfile?.handle ?? null,
    level: progress?.level ?? 1,
    totalXp: progress?.totalXp ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
    friendshipStatus,
    allowFriendRequests: identity.socialProfile?.allowFriendRequests !== false,
    feedback,
  };
}

export async function likePublicFeedback(
  workspaceId: string,
  me: string,
  feedbackId: string,
  db: DbClient = defaultPrisma,
): Promise<{ liked: boolean; likeCount: number }> {
  await assertPersonalWorkspace(workspaceId, db);
  const row = await db.appFeedback.findFirst({
    where: { id: feedbackId, isPublic: true },
    include: { _count: { select: { reactions: true } }, reactions: { where: { identityId: me } } },
  });
  if (!row) throw ApiError.notFound('Fikr topilmadi');
  if (row.identityId === me) throw ApiError.badRequest('O‘z fikringizga like qo‘yib bo‘lmaydi');

  if (row.reactions.length > 0) {
    await db.appFeedbackReaction.delete({ where: { id: row.reactions[0]!.id } });
    return { liked: false, likeCount: Math.max(0, row._count.reactions - 1) };
  }

  await db.appFeedbackReaction.create({
    data: { feedbackId, identityId: me },
  });
  return { liked: true, likeCount: row._count.reactions + 1 };
}
