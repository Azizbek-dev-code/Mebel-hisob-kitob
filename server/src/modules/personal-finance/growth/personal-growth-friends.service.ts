import {
  GrowthFriendshipStatus,
  GrowthNotificationKind,
  WorkspaceStatus,
  WorkspaceType,
  friendshipPairKey,
  isSelfFriendRequest,
  type GrowthFriendPublicDto,
  type GrowthFriendshipDto,
  type GrowthFriendsListResponse,
  type GrowthFriendSearchResponse,
  type GrowthSocialPrivacyDto,
  type SendFriendRequestBody,
  type UpdateGrowthSocialPrivacyRequest,
} from '@furniture-erp/shared';
import type { GrowthFriendship, Identity, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryEvaluateAchievements } from './personal-growth-achievements.service.js';
import { tryEmitGrowthNotification } from './personal-growth-notifications.service.js';
import { assertGrowthQuota } from './personal-growth-premium.service.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  identity: PrismaClient['identity'];
  growthFriendship: PrismaClient['growthFriendship'];
  growthSocialProfile: PrismaClient['growthSocialProfile'];
  growthProgress: PrismaClient['growthProgress'];
  workspaceMembership: PrismaClient['workspaceMembership'];
};

type FriendshipRow = GrowthFriendship & {
  requester: Identity & {
    socialProfile: { handle: string | null; showLevel: boolean; showActivity: boolean } | null;
  };
  addressee: Identity & {
    socialProfile: { handle: string | null; showLevel: boolean; showActivity: boolean } | null;
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

async function levelForIdentity(
  identityId: string,
  showLevel: boolean,
  db: DbClient,
): Promise<number | null> {
  if (!showLevel) return null;
  const membership = await db.workspaceMembership.findFirst({
    where: {
      identityId,
      workspace: { type: WorkspaceType.PERSONAL, status: WorkspaceStatus.ACTIVE, storeId: null },
    },
    select: { workspaceId: true },
  });
  if (!membership) return null;
  const progress = await db.growthProgress.findUnique({
    where: { workspaceId: membership.workspaceId },
    select: { level: true },
  });
  return progress?.level ?? 1;
}

async function toPublicDto(
  identity: Identity & {
    socialProfile: { handle: string | null; showLevel: boolean; showActivity: boolean } | null;
  },
  viewerIsSelf: boolean,
  db: DbClient,
): Promise<GrowthFriendPublicDto> {
  const profile = identity.socialProfile;
  const showLevel = viewerIsSelf || (profile?.showLevel ?? true);
  const showActivity = viewerIsSelf || (profile?.showActivity ?? true);
  return {
    identityId: identity.id,
    fullName: identity.fullName,
    email: viewerIsSelf ? identity.email : null,
    handle: profile?.handle ?? null,
    level: await levelForIdentity(identity.id, showLevel, db),
    showActivity,
  };
}

async function toFriendshipDto(
  row: FriendshipRow,
  me: string,
  db: DbClient,
): Promise<GrowthFriendshipDto> {
  const other = row.requesterId === me ? row.addressee : row.requester;
  return {
    id: row.id,
    status: row.status as GrowthFriendshipDto['status'],
    iAmRequester: row.requesterId === me,
    friend: await toPublicDto(other, false, db),
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}

const friendInclude = {
  requester: { include: { socialProfile: true } },
  addressee: { include: { socialProfile: true } },
} as const;

export async function listFriends(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthFriendsListResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const rows = (await db.growthFriendship.findMany({
    where: {
      OR: [{ requesterId: identityId }, { addresseeId: identityId }],
      status: {
        in: [
          GrowthFriendshipStatus.PENDING,
          GrowthFriendshipStatus.ACCEPTED,
          GrowthFriendshipStatus.BLOCKED,
        ],
      },
    },
    include: friendInclude,
    orderBy: { updatedAt: 'desc' },
  })) as FriendshipRow[];

  const friends: GrowthFriendshipDto[] = [];
  const incoming: GrowthFriendshipDto[] = [];
  const outgoing: GrowthFriendshipDto[] = [];

  for (const row of rows) {
    if (row.status === GrowthFriendshipStatus.BLOCKED) continue;
    const dto = await toFriendshipDto(row, identityId, db);
    if (row.status === GrowthFriendshipStatus.ACCEPTED) {
      friends.push(dto);
    } else if (row.status === GrowthFriendshipStatus.PENDING) {
      if (row.addresseeId === identityId) incoming.push(dto);
      else outgoing.push(dto);
    }
  }

  return {
    friends,
    incoming,
    outgoing,
    friendCount: friends.length,
  };
}

export async function searchFriends(
  workspaceId: string,
  identityId: string,
  query: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthFriendSearchResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return { items: [] };

  const identities = await db.identity.findMany({
    where: {
      id: { not: identityId },
      OR: [
        { email: { equals: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { socialProfile: { handle: { equals: q, mode: 'insensitive' } } },
      ],
    },
    include: { socialProfile: true },
    take: 10,
  });

  const items: GrowthFriendPublicDto[] = [];
  for (const identity of identities) {
    if (identity.socialProfile && identity.socialProfile.allowFriendRequests === false) {
      continue;
    }
    items.push(await toPublicDto(identity, false, db));
  }
  return { items };
}

export async function sendFriendRequest(
  workspaceId: string,
  identityId: string,
  body: SendFriendRequestBody,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFriendshipDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const q = body.query.trim().replace(/^@/, '');
  if (q.length < 2) throw ApiError.badRequest('Qidiruv juda qisqa');

  const target = await db.identity.findFirst({
    where: {
      OR: [
        { email: { equals: q, mode: 'insensitive' } },
        { socialProfile: { handle: { equals: q, mode: 'insensitive' } } },
      ],
    },
    include: { socialProfile: true },
  });
  if (!target) throw ApiError.notFound('Foydalanuvchi topilmadi');
  if (isSelfFriendRequest(identityId, target.id)) {
    throw ApiError.badRequest('O‘zingizga so‘rov yuborib bo‘lmaydi');
  }
  if (target.socialProfile && !target.socialProfile.allowFriendRequests) {
    throw ApiError.forbidden('Bu foydalanuvchi so‘rovlarni qabul qilmaydi');
  }

  const myPrivacy = await ensureSocialProfile(identityId, db);
  if (!myPrivacy.allowFriendRequests) {
    throw ApiError.badRequest('Avval so‘rovlarni yoqing (privacy)');
  }

  const friendCount = await countAcceptedFriends(identityId, db);
  await assertGrowthQuota(workspaceId, identityId, 'acceptedFriends', friendCount);

  const pairKey = friendshipPairKey(identityId, target.id);
  const existing = await db.growthFriendship.findUnique({ where: { pairKey } });
  if (existing) {
    if (existing.status === GrowthFriendshipStatus.ACCEPTED) {
      throw ApiError.badRequest('Allaqachon do‘stingiz bor');
    }
    if (existing.status === GrowthFriendshipStatus.BLOCKED) {
      throw ApiError.forbidden('Aloqa bloklangan');
    }
    if (existing.status === GrowthFriendshipStatus.PENDING) {
      throw ApiError.badRequest('So‘rov allaqachon yuborilgan');
    }
    // DECLINED → allow re-request: flip requester to current user
    const row = (await db.growthFriendship.update({
      where: { id: existing.id },
      data: {
        requesterId: identityId,
        addresseeId: target.id,
        status: GrowthFriendshipStatus.PENDING,
        blockedById: null,
        respondedAt: null,
        updatedAt: now,
      },
      include: friendInclude,
    })) as FriendshipRow;
    return toFriendshipDto(row, identityId, db);
  }

  const row = (await db.growthFriendship.create({
    data: {
      requesterId: identityId,
      addresseeId: target.id,
      pairKey,
      status: GrowthFriendshipStatus.PENDING,
    },
    include: friendInclude,
  })) as FriendshipRow;

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_FRIEND_REQUESTED',
    entityType: 'GROWTH_FRIENDSHIP',
    entityId: row.id,
    summary: 'Friend request sent',
    metadata: { workspaceId, identityId, addresseeId: target.id },
  });

  if (process.env.VITEST !== 'true') {
    await tryEmitGrowthNotification({
      identityId: target.id,
      kind: GrowthNotificationKind.FRIEND,
      title: 'Yangi do‘stlik so‘rovi',
      body: 'Kimdir sizga do‘stlik so‘rovi yubordi',
      href: '/personal/growth/friends',
      entityType: 'GROWTH_FRIENDSHIP',
      entityId: row.id,
      dedupeKey: `friend-request:${row.id}`,
    });
  }

  return toFriendshipDto(row, identityId, db);
}

async function loadOwnedFriendship(
  friendshipId: string,
  identityId: string,
  db: DbClient,
): Promise<FriendshipRow> {
  const row = (await db.growthFriendship.findFirst({
    where: {
      id: friendshipId,
      OR: [{ requesterId: identityId }, { addresseeId: identityId }],
    },
    include: friendInclude,
  })) as FriendshipRow | null;
  if (!row) throw ApiError.notFound('Do‘stlik topilmadi');
  return row;
}

export async function acceptFriendRequest(
  workspaceId: string,
  identityId: string,
  friendshipId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFriendshipDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadOwnedFriendship(friendshipId, identityId, db);
  if (existing.addresseeId !== identityId) {
    throw ApiError.forbidden('Faqat qabul qiluvchi tasdiqlashi mumkin');
  }
  if (existing.status !== GrowthFriendshipStatus.PENDING) {
    throw ApiError.badRequest('So‘rov pending emas');
  }

  const friendCount = await countAcceptedFriends(identityId, db);
  await assertGrowthQuota(workspaceId, identityId, 'acceptedFriends', friendCount);

  const row = (await db.growthFriendship.update({
    where: { id: existing.id },
    data: {
      status: GrowthFriendshipStatus.ACCEPTED,
      respondedAt: now,
    },
    include: friendInclude,
  })) as FriendshipRow;

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_FRIEND_ACCEPTED',
    entityType: 'GROWTH_FRIENDSHIP',
    entityId: row.id,
    summary: 'Friend request accepted',
    metadata: { workspaceId, identityId },
  });

  if (process.env.VITEST !== 'true') {
    await tryEmitGrowthNotification({
      identityId: row.requesterId,
      kind: GrowthNotificationKind.FRIEND,
      title: 'Do‘stlik qabul qilindi',
      body: 'Sizning so‘rovingiz qabul qilindi',
      href: '/personal/growth/friends',
      entityType: 'GROWTH_FRIENDSHIP',
      entityId: row.id,
      dedupeKey: `friend-accept:${row.id}`,
    });
    await tryEvaluateAchievements(workspaceId, identityId);
  }

  return toFriendshipDto(row, identityId, db);
}

export async function declineFriendRequest(
  workspaceId: string,
  identityId: string,
  friendshipId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFriendshipDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadOwnedFriendship(friendshipId, identityId, db);
  if (existing.addresseeId !== identityId) {
    throw ApiError.forbidden('Faqat qabul qiluvchi rad etishi mumkin');
  }
  if (existing.status !== GrowthFriendshipStatus.PENDING) {
    throw ApiError.badRequest('So‘rov pending emas');
  }

  const row = (await db.growthFriendship.update({
    where: { id: existing.id },
    data: {
      status: GrowthFriendshipStatus.DECLINED,
      respondedAt: now,
    },
    include: friendInclude,
  })) as FriendshipRow;

  return toFriendshipDto(row, identityId, db);
}

export async function removeFriendship(
  workspaceId: string,
  identityId: string,
  friendshipId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadOwnedFriendship(friendshipId, identityId, db);
  if (
    existing.status !== GrowthFriendshipStatus.ACCEPTED &&
    existing.status !== GrowthFriendshipStatus.PENDING
  ) {
    throw ApiError.badRequest('O‘chirib bo‘lmaydi');
  }
  // Outgoing pending can be cancelled by requester; accepted by either.
  if (
    existing.status === GrowthFriendshipStatus.PENDING &&
    existing.requesterId !== identityId
  ) {
    throw ApiError.forbidden('Kiruvchi so‘rovni decline qiling');
  }
  await db.growthFriendship.delete({ where: { id: existing.id } });
}

export async function blockFriendship(
  workspaceId: string,
  identityId: string,
  friendshipId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthFriendshipDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadOwnedFriendship(friendshipId, identityId, db);
  const row = (await db.growthFriendship.update({
    where: { id: existing.id },
    data: {
      status: GrowthFriendshipStatus.BLOCKED,
      blockedById: identityId,
      respondedAt: now,
    },
    include: friendInclude,
  })) as FriendshipRow;
  return toFriendshipDto(row, identityId, db);
}

async function ensureSocialProfile(identityId: string, db: DbClient) {
  const existing = await db.growthSocialProfile.findUnique({ where: { identityId } });
  if (existing) return existing;
  return db.growthSocialProfile.create({
    data: { identityId },
  });
}

export async function getSocialPrivacy(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthSocialPrivacyDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const profile = await ensureSocialProfile(identityId, db);
  return {
    handle: profile.handle,
    bio: profile.bio,
    showLevel: profile.showLevel,
    showActivity: profile.showActivity,
    allowFriendRequests: profile.allowFriendRequests,
  };
}

export async function updateSocialPrivacy(
  workspaceId: string,
  identityId: string,
  body: UpdateGrowthSocialPrivacyRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthSocialPrivacyDto> {
  await assertPersonalWorkspace(workspaceId, db);
  await ensureSocialProfile(identityId, db);

  let handle: string | null | undefined = body.handle;
  if (handle !== undefined) {
    const trimmed = handle?.trim().replace(/^@/, '') || null;
    if (trimmed && !/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) {
      throw ApiError.badRequest('Handle 3–24 belgi: harf, raqam, _');
    }
    handle = trimmed;
  }

  const updated = await db.growthSocialProfile.update({
    where: { identityId },
    data: {
      ...(handle !== undefined ? { handle } : {}),
      ...(body.bio !== undefined ? { bio: body.bio?.trim().slice(0, 280) || null } : {}),
      ...(body.showLevel !== undefined ? { showLevel: body.showLevel } : {}),
      ...(body.showActivity !== undefined ? { showActivity: body.showActivity } : {}),
      ...(body.allowFriendRequests !== undefined
        ? { allowFriendRequests: body.allowFriendRequests }
        : {}),
    },
  });

  return {
    handle: updated.handle,
    bio: updated.bio,
    showLevel: updated.showLevel,
    showActivity: updated.showActivity,
    allowFriendRequests: updated.allowFriendRequests,
  };
}

export async function countAcceptedFriends(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<number> {
  return db.growthFriendship.count({
    where: {
      status: GrowthFriendshipStatus.ACCEPTED,
      OR: [{ requesterId: identityId }, { addresseeId: identityId }],
    },
  });
}
