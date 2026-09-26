import {
  GlobalCompetitionStatus,
  GlobalLeaderboardPeriod,
  GlobalRewardDeliveryStatus,
  GlobalRewardPlace,
  type GlobalMonthlyCompetitionDto,
  type GlobalMonthlyCompetitionOverviewDto,
  type GlobalMonthlyRewardDto,
  type GlobalMonthlyWinnerDto,
  type GlobalMonthlyWinnersHistoryResponse,
  type GlobalRankingEntryDto,
  type PlatformGlobalCompetitionDetailDto,
  type UpsertGlobalMonthlyCompetitionBody,
  type UpsertGlobalMonthlyRewardBody,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

import { listGlobalRanking } from './personal-growth-ranking.service.js';

type DbClient = PrismaClient;

const PLACE_TO_ENUM: Record<number, GlobalRewardPlace> = {
  1: GlobalRewardPlace.FIRST,
  2: GlobalRewardPlace.SECOND,
  3: GlobalRewardPlace.THIRD,
};

const ENUM_TO_PLACE: Record<GlobalRewardPlace, number> = {
  [GlobalRewardPlace.FIRST]: 1,
  [GlobalRewardPlace.SECOND]: 2,
  [GlobalRewardPlace.THIRD]: 3,
};

export function periodKeyFromDate(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthBoundsUtc(periodKey: string): { startsAt: Date; endsAt: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) throw ApiError.badRequest('periodKey YYYY-MM formatida bo‘lishi kerak');
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isFinite(year) || month < 0 || month > 11) {
    throw ApiError.badRequest('periodKey noto‘g‘ri');
  }
  const startsAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endsAt = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { startsAt, endsAt };
}

function rewardDto(row: {
  id: string;
  place: string;
  title: string;
  description: string | null;
  valueText: string | null;
  imageUrl: string | null;
}): GlobalMonthlyRewardDto {
  return {
    id: row.id,
    place: row.place as GlobalRewardPlace,
    title: row.title,
    description: row.description,
    valueText: row.valueText,
    imageUrl: row.imageUrl,
  };
}

function competitionDto(row: {
  id: string;
  periodKey: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  finalizedAt: Date | null;
  rewards: Array<{
    id: string;
    place: string;
    title: string;
    description: string | null;
    valueText: string | null;
    imageUrl: string | null;
  }>;
}): GlobalMonthlyCompetitionDto {
  const order = [GlobalRewardPlace.FIRST, GlobalRewardPlace.SECOND, GlobalRewardPlace.THIRD];
  const rewards = [...row.rewards]
    .sort((a, b) => order.indexOf(a.place as GlobalRewardPlace) - order.indexOf(b.place as GlobalRewardPlace))
    .map(rewardDto);
  return {
    id: row.id,
    periodKey: row.periodKey,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status as GlobalCompetitionStatus,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
    rewards,
  };
}

function winnerDto(row: {
  id: string;
  place: number;
  identityId: string;
  displayName: string;
  handle: string | null;
  level: number;
  periodXp: number;
  totalXp: number;
  deliveryStatus: string;
  reward: {
    id: string;
    place: string;
    title: string;
    description: string | null;
    valueText: string | null;
    imageUrl: string | null;
  } | null;
}): GlobalMonthlyWinnerDto {
  return {
    id: row.id,
    place: row.place,
    identityId: row.identityId,
    displayName: row.displayName,
    handle: row.handle,
    level: row.level,
    periodXp: row.periodXp,
    totalXp: row.totalXp,
    deliveryStatus: row.deliveryStatus as GlobalRewardDeliveryStatus,
    reward: row.reward ? rewardDto(row.reward) : null,
  };
}

/** Ensure current UTC month has an ACTIVE competition row (idempotent). */
export async function ensureCurrentMonthlyCompetition(
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GlobalMonthlyCompetitionDto> {
  const periodKey = periodKeyFromDate(now);
  const existing = await db.globalMonthlyCompetition.findUnique({
    where: { periodKey },
    include: { rewards: true },
  });
  if (existing) return competitionDto(existing);

  const { startsAt, endsAt } = monthBoundsUtc(periodKey);
  const created = await db.globalMonthlyCompetition.create({
    data: {
      periodKey,
      title: `Monthly Competition · ${periodKey}`,
      description: null,
      startsAt,
      endsAt,
      status: GlobalCompetitionStatus.ACTIVE,
    },
    include: { rewards: true },
  });
  return competitionDto(created);
}

export async function getMonthlyCompetitionOverview(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GlobalMonthlyCompetitionOverviewDto> {
  const competition = await ensureCurrentMonthlyCompetition(db, now);

  if (competition.status === GlobalCompetitionStatus.FINALIZED) {
    const detail = await db.globalMonthlyCompetition.findUnique({
      where: { id: competition.id },
      include: {
        rewards: true,
        winners: { include: { reward: true }, orderBy: { place: 'asc' } },
      },
    });
    const winners = detail?.winners ?? [];
    const top3: GlobalRankingEntryDto[] = winners.map((w) => ({
      identityId: w.identityId,
      displayName: w.displayName,
      handle: w.handle,
      level: w.level,
      totalXp: w.totalXp,
      periodXp: w.periodXp,
      currentStreak: 0,
      rank: w.place,
      isMe: w.identityId === identityId,
    }));
    const myWinner = winners.find((w) => w.identityId === identityId) ?? null;
    return {
      competition,
      top3,
      myEntry: myWinner
        ? {
            identityId: myWinner.identityId,
            displayName: myWinner.displayName,
            handle: myWinner.handle,
            level: myWinner.level,
            totalXp: myWinner.totalXp,
            periodXp: myWinner.periodXp,
            currentStreak: 0,
            rank: myWinner.place,
            isMe: true,
          }
        : null,
      xpToTop3: null,
      showMeInRanking: true,
    };
  }

  const live = await listGlobalRanking(
    workspaceId,
    identityId,
    { period: GlobalLeaderboardPeriod.MONTHLY, page: 1, pageSize: 20 },
    db,
    now,
  );
  const top3 = live.items.filter((row) => row.rank <= 3).slice(0, 3);
  const third = top3.find((row) => row.rank === 3) ?? top3[top3.length - 1] ?? null;
  let xpToTop3: number | null = null;
  if (live.myEntry && live.showMeInRanking) {
    if (live.myEntry.rank > 0 && live.myEntry.rank <= 3) {
      xpToTop3 = 0;
    } else if (third) {
      xpToTop3 = Math.max(0, third.periodXp - live.myEntry.periodXp);
    }
  }

  return {
    competition,
    top3,
    myEntry: live.myEntry,
    xpToTop3,
    showMeInRanking: live.showMeInRanking,
  };
}

export async function listMonthlyWinnersHistory(
  db: DbClient = defaultPrisma,
): Promise<GlobalMonthlyWinnersHistoryResponse> {
  const rows = await db.globalMonthlyCompetition.findMany({
    where: { status: GlobalCompetitionStatus.FINALIZED },
    include: {
      rewards: true,
      winners: { include: { reward: true }, orderBy: { place: 'asc' } },
    },
    orderBy: { periodKey: 'desc' },
    take: 24,
  });
  return {
    items: rows.map((row) => ({
      competition: competitionDto(row),
      winners: row.winners.map(winnerDto),
    })),
  };
}

export async function listCompetitionsForAdmin(
  db: DbClient = defaultPrisma,
): Promise<GlobalMonthlyCompetitionDto[]> {
  await ensureCurrentMonthlyCompetition(db);
  const rows = await db.globalMonthlyCompetition.findMany({
    include: { rewards: true },
    orderBy: { periodKey: 'desc' },
    take: 36,
  });
  return rows.map(competitionDto);
}

export async function getCompetitionDetailForAdmin(
  id: string,
  db: DbClient = defaultPrisma,
): Promise<PlatformGlobalCompetitionDetailDto> {
  const row = await db.globalMonthlyCompetition.findUnique({
    where: { id },
    include: {
      rewards: true,
      winners: { include: { reward: true }, orderBy: { place: 'asc' } },
    },
  });
  if (!row) throw ApiError.notFound('Competition topilmadi');
  return {
    ...competitionDto(row),
    winners: row.winners.map(winnerDto),
  };
}

export async function upsertCompetitionForAdmin(
  body: UpsertGlobalMonthlyCompetitionBody,
  db: DbClient = defaultPrisma,
): Promise<GlobalMonthlyCompetitionDto> {
  const { startsAt, endsAt } = monthBoundsUtc(body.periodKey);
  const starts = body.startsAt ? new Date(body.startsAt) : startsAt;
  const ends = body.endsAt ? new Date(body.endsAt) : endsAt;
  if (!(ends > starts)) throw ApiError.badRequest('endsAt startsAt dan keyin bo‘lishi kerak');

  const row = await db.globalMonthlyCompetition.upsert({
    where: { periodKey: body.periodKey },
    create: {
      periodKey: body.periodKey,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      startsAt: starts,
      endsAt: ends,
      status: body.status ?? GlobalCompetitionStatus.ACTIVE,
    },
    update: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      startsAt: starts,
      endsAt: ends,
      ...(body.status ? { status: body.status } : {}),
    },
    include: { rewards: true },
  });
  return competitionDto(row);
}

export async function upsertRewardForAdmin(
  competitionId: string,
  body: UpsertGlobalMonthlyRewardBody,
  db: DbClient = defaultPrisma,
): Promise<GlobalMonthlyRewardDto> {
  const competition = await db.globalMonthlyCompetition.findUnique({ where: { id: competitionId } });
  if (!competition) throw ApiError.notFound('Competition topilmadi');
  if (competition.status === GlobalCompetitionStatus.FINALIZED) {
    throw ApiError.badRequest('Yakunlangan competition rewardini o‘zgartirib bo‘lmaydi');
  }

  const row = await db.globalMonthlyReward.upsert({
    where: {
      competitionId_place: { competitionId, place: body.place },
    },
    create: {
      competitionId,
      place: body.place,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      valueText: body.valueText?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
    },
    update: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      valueText: body.valueText?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
    },
  });
  return rewardDto(row);
}

/**
 * Freeze Top 3 into winner snapshots. Idempotent if already FINALIZED.
 * Ranking is always computed server-side from XP — never from client input.
 */
export async function finalizeMonthlyCompetition(
  competitionId: string,
  adminWorkspaceId: string,
  adminIdentityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformGlobalCompetitionDetailDto> {
  const competition = await db.globalMonthlyCompetition.findUnique({
    where: { id: competitionId },
    include: { rewards: true, winners: true },
  });
  if (!competition) throw ApiError.notFound('Competition topilmadi');
  if (competition.status === GlobalCompetitionStatus.CANCELLED) {
    throw ApiError.badRequest('Bekor qilingan competition yakunlanmaydi');
  }
  if (competition.status === GlobalCompetitionStatus.FINALIZED && competition.winners.length > 0) {
    return getCompetitionDetailForAdmin(competitionId, db);
  }

  // Use a personal workspace context for ranking compute — admin may not have personal WS.
  // Ranking list does assertPersonalWorkspace; for finalize we compute via ranking service
  // using the first ACTIVE personal workspace of the top identity, or a system approach.
  // Safer: extract ranking without workspace assert for admin finalize.
  const live = await listGlobalRankingForFinalize(db, now, competition.startsAt);

  const top3 = live.slice(0, 3);
  if (top3.length === 0) {
    throw ApiError.badRequest('Reyting bo‘sh — winner yo‘q');
  }

  await db.$transaction(async (tx) => {
    await tx.globalMonthlyWinner.deleteMany({ where: { competitionId } });
    for (const entry of top3) {
      const placeEnum = PLACE_TO_ENUM[entry.rank];
      const reward = placeEnum
        ? await tx.globalMonthlyReward.findUnique({
            where: { competitionId_place: { competitionId, place: placeEnum } },
          })
        : null;
      await tx.globalMonthlyWinner.create({
        data: {
          competitionId,
          rewardId: reward?.id ?? null,
          identityId: entry.identityId,
          place: entry.rank,
          displayName: entry.displayName,
          handle: entry.handle,
          level: entry.level,
          periodXp: entry.periodXp,
          totalXp: entry.totalXp,
          deliveryStatus: GlobalRewardDeliveryStatus.PENDING,
        },
      });
    }
    await tx.globalMonthlyCompetition.update({
      where: { id: competitionId },
      data: {
        status: GlobalCompetitionStatus.FINALIZED,
        finalizedAt: now,
      },
    });
  });

  void adminWorkspaceId;
  void adminIdentityId;
  return getCompetitionDetailForAdmin(competitionId, db);
}

/** Ranking for finalize — no personal workspace gate; same XP rules as public board. */
async function listGlobalRankingForFinalize(
  db: DbClient,
  now: Date,
  monthStart: Date,
): Promise<GlobalRankingEntryDto[]> {
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
    select: {
      id: true,
      fullName: true,
      socialProfile: { select: { handle: true, showInGlobalRanking: true } },
    },
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
      displayName: identity.fullName.trim() || 'Foydalanuvchi',
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
      displayName: identity.fullName.trim() || 'Foydalanuvchi',
      handle: identity.socialProfile?.handle ?? null,
      level: 1,
      totalXp: xp,
      currentStreak: 0,
      showInRanking: identity.socialProfile?.showInGlobalRanking !== false,
    });
  }

  const events = await db.growthXpEvent.groupBy({
    by: ['identityId'],
    where: { createdAt: { gte: monthStart } },
    _sum: { amount: true },
  });
  const periodXp = new Map(events.map((row) => [row.identityId, row._sum.amount ?? 0]));
  const platformPeriod = await db.platformXpTransaction.groupBy({
    by: ['identityId'],
    where: { identityId: { in: identityIds }, createdAt: { gte: monthStart } },
    _sum: { xp: true },
  });
  for (const row of platformPeriod) {
    periodXp.set(row.identityId, (periodXp.get(row.identityId) ?? 0) + (row._sum.xp ?? 0));
  }

  const ranked = [...unique.values()]
    .filter((row) => row.showInRanking)
    .map((row) => ({
      ...row,
      periodXp: periodXp.get(row.identityId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.periodXp - a.periodXp ||
        b.totalXp - a.totalXp ||
        a.identityId.localeCompare(b.identityId),
    );

  void now;
  return ranked.map((row, index) => ({
    identityId: row.identityId,
    displayName: row.displayName,
    handle: row.handle,
    level: row.level,
    totalXp: row.totalXp,
    periodXp: row.periodXp,
    currentStreak: row.currentStreak,
    rank: index + 1,
    isMe: false,
  }));
}

export async function updateWinnerDeliveryStatus(
  winnerId: string,
  deliveryStatus: GlobalRewardDeliveryStatus,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GlobalMonthlyWinnerDto> {
  const existing = await db.globalMonthlyWinner.findUnique({
    where: { id: winnerId },
    include: { reward: true },
  });
  if (!existing) throw ApiError.notFound('Winner topilmadi');

  const data: {
    deliveryStatus: GlobalRewardDeliveryStatus;
    confirmedAt?: Date | null;
    deliveredAt?: Date | null;
  } = { deliveryStatus };

  if (deliveryStatus === GlobalRewardDeliveryStatus.PENDING) {
    data.confirmedAt = null;
    data.deliveredAt = null;
  } else if (deliveryStatus === GlobalRewardDeliveryStatus.CONFIRMED) {
    data.confirmedAt = existing.confirmedAt ?? now;
    data.deliveredAt = null;
  } else {
    data.confirmedAt = existing.confirmedAt ?? now;
    data.deliveredAt = now;
  }

  const row = await db.globalMonthlyWinner.update({
    where: { id: winnerId },
    data,
    include: { reward: true },
  });
  return winnerDto(row);
}

void ENUM_TO_PLACE;
