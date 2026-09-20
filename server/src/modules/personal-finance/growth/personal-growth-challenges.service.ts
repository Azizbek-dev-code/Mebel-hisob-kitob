import {
  GrowthChallengeKind,
  GrowthChallengeMetric,
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
  GrowthFocusKind,
  GrowthFriendshipStatus,
  GrowthNotificationKind,
  GrowthTodoStatus,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  DEFAULT_CHALLENGE_REWARD_XP,
  addDaysUtc,
  expectedInviteeCount,
  groupTargetReached,
  isValidChallengeDuration,
  isValidTargetValue,
  parseStringIdList,
  pickFightWinner,
  serializeStringIdList,
  type CreateGrowthChallengeRequest,
  type GrowthChallengeDto,
  type GrowthChallengeParticipantDto,
  type GrowthChallengesListResponse,
} from '@furniture-erp/shared';
import type {
  GrowthChallenge,
  GrowthChallengeParticipant,
  Identity,
  PrismaClient,
} from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryEvaluateAchievements } from './personal-growth-achievements.service.js';
import { tryEmitGrowthNotification } from './personal-growth-notifications.service.js';
import { assertGrowthQuota } from './personal-growth-premium.service.js';
import { awardXp } from './personal-growth-xp.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  identity: PrismaClient['identity'];
  growthChallenge: PrismaClient['growthChallenge'];
  growthChallengeParticipant: PrismaClient['growthChallengeParticipant'];
  growthFriendship: PrismaClient['growthFriendship'];
  growthSocialProfile: PrismaClient['growthSocialProfile'];
  workspaceMembership: PrismaClient['workspaceMembership'];
  growthFocusSession: PrismaClient['growthFocusSession'];
  growthTodo: PrismaClient['growthTodo'];
  growthLearningSession: PrismaClient['growthLearningSession'];
  growthXpEvent: PrismaClient['growthXpEvent'];
  growthProgress: PrismaClient['growthProgress'];
};

type ChallengeRow = GrowthChallenge & {
  participants: (GrowthChallengeParticipant & {
    identity: Identity & {
      socialProfile: { handle: string | null } | null;
    };
  })[];
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

const challengeInclude = {
  participants: {
    include: {
      identity: { include: { socialProfile: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

function toDto(row: ChallengeRow, me: string): GrowthChallengeDto {
  const participants: GrowthChallengeParticipantDto[] = row.participants.map((p) => ({
    identityId: p.identityId,
    fullName: p.identity.fullName,
    handle: p.identity.socialProfile?.handle ?? null,
    status: p.status as GrowthChallengeParticipantDto['status'],
    score: p.score,
    isCreator: p.identityId === row.createdById,
    isMe: p.identityId === me,
  }));
  const accepted = participants.filter(
    (p) => p.status === GrowthChallengeParticipantStatus.ACCEPTED,
  );
  const mine = row.participants.find((p) => p.identityId === me);
  return {
    id: row.id,
    kind: row.kind as GrowthChallengeDto['kind'],
    title: row.title,
    metric: row.metric as GrowthChallengeDto['metric'],
    targetValue: row.targetValue,
    durationDays: row.durationDays,
    status: row.status as GrowthChallengeDto['status'],
    rewardXp: row.rewardXp,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    winnerId: row.winnerId,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdById: row.createdById,
    iAmCreator: row.createdById === me,
    myStatus: (mine?.status as GrowthChallengeParticipantDto['status']) ?? null,
    groupScore: accepted.reduce((sum, p) => sum + p.score, 0),
    participants,
    todoIds: parseStringIdList(row.todoIds),
    dailyTargetMinutes: row.dailyTargetMinutes,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertAcceptedFriends(
  me: string,
  inviteeIds: string[],
  db: DbClient,
): Promise<void> {
  const unique = [...new Set(inviteeIds)];
  if (unique.length !== inviteeIds.length) {
    throw ApiError.badRequest('Takliflar takrorlangan');
  }
  if (unique.some((id) => id === me)) {
    throw ApiError.badRequest('O‘zingizni taklif qilib bo‘lmaydi');
  }
  for (const id of unique) {
    const friendship = await db.growthFriendship.findFirst({
      where: {
        status: GrowthFriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: me, addresseeId: id },
          { requesterId: id, addresseeId: me },
        ],
      },
    });
    if (!friendship) {
      throw ApiError.badRequest('Faqat qabul qilingan do‘stlarni taklif qilish mumkin');
    }
  }
}

async function countOpenChallenges(identityId: string, db: DbClient): Promise<number> {
  return db.growthChallengeParticipant.count({
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
  });
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

async function scoreForIdentity(
  identityId: string,
  metric: GrowthChallengeMetric,
  startAt: Date,
  endAt: Date,
  db: DbClient,
  options: { todoIds?: string[] } = {},
): Promise<number> {
  const workspaceId = await personalWorkspaceId(identityId, db);
  if (!workspaceId) return 0;

  if (metric === GrowthChallengeMetric.FOCUS_MINUTES) {
    const rows = await db.growthFocusSession.findMany({
      where: {
        workspaceId,
        identityId,
        kind: GrowthFocusKind.FOCUS,
        creditedMinutes: { gt: 0 },
        startedAt: { gte: startAt, lte: endAt },
      },
      select: { creditedMinutes: true },
    });
    return rows.reduce((sum, row) => sum + row.creditedMinutes, 0);
  }

  if (metric === GrowthChallengeMetric.TASKS_COMPLETED) {
    return db.growthTodo.count({
      where: {
        workspaceId,
        status: GrowthTodoStatus.DONE,
        completedAt: { gte: startAt, lte: endAt },
        ...(options.todoIds?.length ? { id: { in: options.todoIds } } : {}),
      },
    });
  }

  if (metric === GrowthChallengeMetric.LEARNING_MINUTES) {
    const rows = await db.growthLearningSession.findMany({
      where: {
        workspaceId,
        identityId,
        creditedMinutes: { gt: 0 },
        startedAt: { gte: startAt, lte: endAt },
      },
      select: { creditedMinutes: true },
    });
    return rows.reduce((sum, row) => sum + row.creditedMinutes, 0);
  }

  const events = await db.growthXpEvent.findMany({
    where: {
      workspaceId,
      identityId,
      createdAt: { gte: startAt, lte: endAt },
      source: { not: GrowthXpSource.MILESTONE_REACHED },
    },
    select: { amount: true },
  });
  return events.reduce((sum, row) => sum + row.amount, 0);
}

async function refreshScores(
  row: ChallengeRow,
  db: DbClient,
  now: Date,
): Promise<ChallengeRow> {
  if (
    row.status !== GrowthChallengeStatus.ACTIVE ||
    !row.startAt ||
    !row.endAt
  ) {
    return row;
  }

  const endBound = now < row.endAt ? now : row.endAt;
  for (const participant of row.participants) {
    if (participant.status !== GrowthChallengeParticipantStatus.ACCEPTED) continue;
    const score = await scoreForIdentity(
      participant.identityId,
      row.metric as GrowthChallengeMetric,
      row.startAt,
      endBound,
      db,
      { todoIds: parseStringIdList(row.todoIds) },
    );
    if (score !== participant.score) {
      await db.growthChallengeParticipant.update({
        where: { id: participant.id },
        data: { score },
      });
      participant.score = score;
    }
  }
  return row;
}

async function activateChallenge(
  challengeId: string,
  durationDays: number,
  db: DbClient,
  now: Date,
): Promise<ChallengeRow> {
  const startAt = now;
  const endAt = addDaysUtc(now, durationDays);
  return (await db.growthChallenge.update({
    where: { id: challengeId },
    data: {
      status: GrowthChallengeStatus.ACTIVE,
      startAt,
      endAt,
    },
    include: challengeInclude,
  })) as ChallengeRow;
}

async function maybeActivatePending(
  row: ChallengeRow,
  db: DbClient,
  now: Date,
): Promise<ChallengeRow> {
  if (row.status !== GrowthChallengeStatus.PENDING) return row;
  const accepted = row.participants.filter(
    (p) => p.status === GrowthChallengeParticipantStatus.ACCEPTED,
  );
  if (row.kind === GrowthChallengeKind.FIGHT && accepted.length === 2) {
    return activateChallenge(row.id, row.durationDays, db, now);
  }
  if (row.kind === GrowthChallengeKind.GROUP && accepted.length >= 3) {
    return activateChallenge(row.id, row.durationDays, db, now);
  }
  return row;
}

async function completeChallenge(
  row: ChallengeRow,
  db: DbClient,
  now: Date,
): Promise<ChallengeRow> {
  const refreshed = await refreshScores(row, db, now);
  const accepted = refreshed.participants.filter(
    (p) => p.status === GrowthChallengeParticipantStatus.ACCEPTED,
  );
  const scores = accepted.map((p) => ({
    identityId: p.identityId,
    score: p.score,
  }));

  let winnerId: string | null = null;
  if (refreshed.kind === GrowthChallengeKind.FIGHT) {
    winnerId = pickFightWinner(scores);
  } else {
    const top = [...scores].sort((a, b) => b.score - a.score)[0];
    winnerId = top && top.score > 0 ? top.identityId : null;
  }

  const completed = (await db.growthChallenge.update({
    where: { id: refreshed.id },
    data: {
      status: GrowthChallengeStatus.COMPLETED,
      winnerId,
      completedAt: now,
      endAt: refreshed.endAt && refreshed.endAt < now ? refreshed.endAt : now,
    },
    include: challengeInclude,
  })) as ChallengeRow;

  if (winnerId && completed.rewardXp > 0) {
    const winnerWs = await personalWorkspaceId(winnerId, db);
    if (winnerWs) {
      await awardXp(
        {
          workspaceId: winnerWs,
          identityId: winnerId,
          source: GrowthXpSource.MILESTONE_REACHED,
          amount: completed.rewardXp,
          sourceEntityId: `challenge-win:${completed.id}`,
          summary: `Challenge reward: ${completed.title}`,
        },
        db,
        now,
      ).catch(() => undefined);
    }
  }

  for (const p of accepted) {
    const ws = await personalWorkspaceId(p.identityId, db);
    if (!ws) continue;
    if (process.env.VITEST !== 'true') {
      await tryEmitGrowthNotification({
        identityId: p.identityId,
        workspaceId: ws,
        kind: GrowthNotificationKind.RESULT,
        title: completed.title,
        body:
          completed.winnerId === p.identityId
            ? `G‘olib · +${completed.rewardXp} XP`
            : completed.winnerId
              ? 'Challenge yakunlandi'
              : 'Challenge yakunlandi (durang)',
        href: '/personal/growth/challenges',
        entityType: 'GROWTH_CHALLENGE',
        entityId: completed.id,
        dedupeKey: `challenge-result:${completed.id}:${p.identityId}`,
      });
      await tryEvaluateAchievements(ws, p.identityId).catch(() => undefined);
    }
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_CHALLENGE_COMPLETED',
    entityType: 'GROWTH_CHALLENGE',
    entityId: completed.id,
    summary: 'Challenge completed',
    metadata: { winnerId, kind: completed.kind },
  });

  return completed;
}

async function maybeComplete(
  row: ChallengeRow,
  db: DbClient,
  now: Date,
): Promise<ChallengeRow> {
  if (row.status !== GrowthChallengeStatus.ACTIVE || !row.startAt || !row.endAt) {
    return row;
  }
  const refreshed = await refreshScores(row, db, now);
  const accepted = refreshed.participants.filter(
    (p) => p.status === GrowthChallengeParticipantStatus.ACCEPTED,
  );
  const scores = accepted.map((p) => ({ score: p.score }));
  const timeUp = refreshed.endAt != null && now >= refreshed.endAt;
  const groupDone =
    refreshed.kind === GrowthChallengeKind.GROUP &&
    groupTargetReached(scores, refreshed.targetValue);
  if (timeUp || groupDone) {
    return completeChallenge(refreshed, db, now);
  }
  return refreshed;
}

async function loadOwned(
  challengeId: string,
  identityId: string,
  db: DbClient,
): Promise<ChallengeRow> {
  const row = (await db.growthChallenge.findFirst({
    where: {
      id: challengeId,
      participants: { some: { identityId } },
    },
    include: challengeInclude,
  })) as ChallengeRow | null;
  if (!row) throw ApiError.notFound('Challenge topilmadi');
  return row;
}

async function withTodayScore(
  dto: GrowthChallengeDto,
  identityId: string,
  db: DbClient,
  now: Date,
): Promise<GrowthChallengeDto> {
  if (dto.status !== GrowthChallengeStatus.ACTIVE || !dto.startAt) {
    return { ...dto, todayScore: 0 };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const windowStart = start < new Date(dto.startAt) ? new Date(dto.startAt) : start;
  const todayScore = await scoreForIdentity(
    identityId,
    dto.metric,
    windowStart,
    now,
    db,
    { todoIds: dto.todoIds },
  );
  return { ...dto, todayScore };
}

export async function listChallenges(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthChallengesListResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const rows = (await db.growthChallenge.findMany({
    where: { participants: { some: { identityId } } },
    include: challengeInclude,
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })) as ChallengeRow[];

  const active: GrowthChallengeDto[] = [];
  const incoming: GrowthChallengeDto[] = [];
  const outgoing: GrowthChallengeDto[] = [];
  const completed: GrowthChallengeDto[] = [];

  for (let row of rows) {
    row = await maybeActivatePending(row, db, now);
    row = await maybeComplete(row, db, now);
    const dto = await withTodayScore(toDto(row, identityId), identityId, db, now);
    const mine = row.participants.find((p) => p.identityId === identityId);
    if (!mine) continue;

    if (row.status === GrowthChallengeStatus.COMPLETED) {
      completed.push(dto);
    } else if (row.status === GrowthChallengeStatus.CANCELLED) {
      continue;
    } else if (
      row.status === GrowthChallengeStatus.PENDING &&
      mine.status === GrowthChallengeParticipantStatus.INVITED
    ) {
      incoming.push(dto);
    } else if (
      row.status === GrowthChallengeStatus.PENDING &&
      row.createdById === identityId
    ) {
      outgoing.push(dto);
    } else if (
      row.status === GrowthChallengeStatus.ACTIVE ||
      row.status === GrowthChallengeStatus.PENDING
    ) {
      active.push(dto);
    }
  }

  return { active, incoming, outgoing, completed };
}

export async function getChallenge(
  workspaceId: string,
  identityId: string,
  challengeId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthChallengeDto> {
  await assertPersonalWorkspace(workspaceId, db);
  let row = await loadOwned(challengeId, identityId, db);
  row = await maybeActivatePending(row, db, now);
  row = await maybeComplete(row, db, now);
  return withTodayScore(toDto(row, identityId), identityId, db, now);
}

export async function createChallenge(
  workspaceId: string,
  identityId: string,
  body: CreateGrowthChallengeRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthChallengeDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const title = body.title.trim().slice(0, 120);
  if (title.length < 2) throw ApiError.badRequest('Sarlavha juda qisqa');
  if (!isValidChallengeDuration(body.durationDays)) {
    throw ApiError.badRequest('Davomiylik 1–30 kun');
  }
  if (!expectedInviteeCount(body.kind, body.inviteeIds.length)) {
    throw ApiError.badRequest(
      body.kind === GrowthChallengeKind.FIGHT
        ? 'Musobaqa uchun bitta raqib kerak'
        : 'Guruh musobaqasi 3–10 ishtirokchi',
    );
  }
  if (!isValidTargetValue(body.kind, body.metric, body.targetValue ?? null)) {
    throw ApiError.badRequest('Group uchun targetValue majburiy');
  }

  const open = await countOpenChallenges(identityId, db);
  await assertGrowthQuota(workspaceId, identityId, 'activeChallenges', open);

  await assertAcceptedFriends(identityId, body.inviteeIds, db);

  const rewardXp =
    body.rewardXp != null && Number.isInteger(body.rewardXp) && body.rewardXp >= 0
      ? Math.min(200, body.rewardXp)
      : DEFAULT_CHALLENGE_REWARD_XP;

  const created = (await db.growthChallenge.create({
    data: {
      kind: body.kind,
      title,
      metric: body.metric,
      targetValue: body.kind === GrowthChallengeKind.GROUP ? body.targetValue! : null,
      durationDays: body.durationDays,
      status: GrowthChallengeStatus.PENDING,
      createdById: identityId,
      rewardXp,
      todoIds: serializeStringIdList(body.todoIds),
      dailyTargetMinutes:
        body.metric === GrowthChallengeMetric.LEARNING_MINUTES
          ? Math.max(1, Math.min(240, body.dailyTargetMinutes ?? 30))
          : null,
      participants: {
        create: [
          {
            identityId,
            status: GrowthChallengeParticipantStatus.ACCEPTED,
            respondedAt: now,
          },
          ...body.inviteeIds.map((inviteeId) => ({
            identityId: inviteeId,
            status: GrowthChallengeParticipantStatus.INVITED,
          })),
        ],
      },
    },
    include: challengeInclude,
  })) as ChallengeRow;

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_CHALLENGE_CREATED',
    entityType: 'GROWTH_CHALLENGE',
    entityId: created.id,
    summary: 'Challenge created',
    metadata: { workspaceId, identityId, kind: body.kind },
  });

  if (process.env.VITEST !== 'true') {
    for (const inviteeId of body.inviteeIds) {
      await tryEmitGrowthNotification({
        identityId: inviteeId,
        kind: GrowthNotificationKind.FIGHT,
        title: title,
        body:
          body.kind === GrowthChallengeKind.FIGHT
            ? 'Sizni musobaqaga taklif qilishdi'
            : 'Sizni guruh musobaqasiga taklif qilishdi',
        href: '/personal/growth/challenges',
        entityType: 'GROWTH_CHALLENGE',
        entityId: created.id,
        dedupeKey: `challenge-invite:${created.id}:${inviteeId}`,
      });
    }
    await tryEvaluateAchievements(workspaceId, identityId).catch(() => undefined);
  }

  return toDto(created, identityId);
}

export async function acceptChallenge(
  workspaceId: string,
  identityId: string,
  challengeId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthChallengeDto> {
  await assertPersonalWorkspace(workspaceId, db);
  let row = await loadOwned(challengeId, identityId, db);
  if (row.status !== GrowthChallengeStatus.PENDING) {
    throw ApiError.badRequest('Challenge pending emas');
  }
  const mine = row.participants.find((p) => p.identityId === identityId);
  if (!mine || mine.status !== GrowthChallengeParticipantStatus.INVITED) {
    throw ApiError.forbidden('Taklif topilmadi');
  }

  const open = await countOpenChallenges(identityId, db);
  await assertGrowthQuota(workspaceId, identityId, 'activeChallenges', open);

  await db.growthChallengeParticipant.update({
    where: { id: mine.id },
    data: {
      status: GrowthChallengeParticipantStatus.ACCEPTED,
      respondedAt: now,
    },
  });

  const reloaded = (await db.growthChallenge.findUnique({
    where: { id: challengeId },
    include: challengeInclude,
  })) as ChallengeRow | null;
  if (!reloaded) throw ApiError.notFound('Challenge topilmadi');
  row = await maybeActivatePending(reloaded, db, now);

  if (process.env.VITEST !== 'true') {
    await tryEvaluateAchievements(workspaceId, identityId).catch(() => undefined);
  }

  return toDto(row, identityId);
}

export async function declineChallenge(
  workspaceId: string,
  identityId: string,
  challengeId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthChallengeDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const row = await loadOwned(challengeId, identityId, db);
  if (row.status !== GrowthChallengeStatus.PENDING) {
    throw ApiError.badRequest('Challenge pending emas');
  }
  const mine = row.participants.find((p) => p.identityId === identityId);
  if (!mine || mine.status !== GrowthChallengeParticipantStatus.INVITED) {
    throw ApiError.forbidden('Taklif topilmadi');
  }

  await db.growthChallengeParticipant.update({
    where: { id: mine.id },
    data: {
      status: GrowthChallengeParticipantStatus.DECLINED,
      respondedAt: now,
    },
  });

  // Fight collapses if opponent declines.
  if (row.kind === GrowthChallengeKind.FIGHT) {
    const cancelled = (await db.growthChallenge.update({
      where: { id: row.id },
      data: { status: GrowthChallengeStatus.CANCELLED },
      include: challengeInclude,
    })) as ChallengeRow;
    return toDto(cancelled, identityId);
  }

  const updated = (await db.growthChallenge.findUnique({
    where: { id: challengeId },
    include: challengeInclude,
  })) as ChallengeRow | null;
  if (!updated) throw ApiError.notFound('Challenge topilmadi');
  return toDto(updated, identityId);
}

export async function cancelChallenge(
  workspaceId: string,
  identityId: string,
  challengeId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthChallengeDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const row = await loadOwned(challengeId, identityId, db);
  if (row.createdById !== identityId) {
    throw ApiError.forbidden('Faqat yaratuvchi bekor qilishi mumkin');
  }
  if (
    row.status !== GrowthChallengeStatus.PENDING &&
    row.status !== GrowthChallengeStatus.ACTIVE
  ) {
    throw ApiError.badRequest('Bekor qilib bo‘lmaydi');
  }

  const cancelled = (await db.growthChallenge.update({
    where: { id: row.id },
    data: { status: GrowthChallengeStatus.CANCELLED },
    include: challengeInclude,
  })) as ChallengeRow;
  return toDto(cancelled, identityId);
}

export async function countChallengesJoined(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<number> {
  return db.growthChallengeParticipant.count({
    where: {
      identityId,
      status: GrowthChallengeParticipantStatus.ACCEPTED,
      challenge: {
        kind: GrowthChallengeKind.GROUP,
        status: {
          in: [GrowthChallengeStatus.ACTIVE, GrowthChallengeStatus.COMPLETED],
        },
      },
    },
  });
}

export async function countFightsCompleted(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<number> {
  return db.growthChallengeParticipant.count({
    where: {
      identityId,
      status: GrowthChallengeParticipantStatus.ACCEPTED,
      challenge: {
        kind: GrowthChallengeKind.FIGHT,
        status: GrowthChallengeStatus.COMPLETED,
      },
    },
  });
}
