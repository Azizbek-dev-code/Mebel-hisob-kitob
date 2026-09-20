import {
  AnalyticsAccountType,
  PresenceVisibility,
  canSeePresence,
  isOnlineAt,
  type PresenceHeartbeatRequest,
  type PresenceHeartbeatResponse,
  type PresenceStatusDto,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { touchAnalyticsSession } from '../usage-analytics/analytics-session.service.js';

/** Ignore duplicate idle heartbeats so a stuck tab cannot flood the DB. */
const HEARTBEAT_MIN_GAP_MS = 15_000;

type DbClient = {
  identity: PrismaClient['identity'];
  identityPresence: PrismaClient['identityPresence'];
  growthFriendship: PrismaClient['growthFriendship'];
  growthSocialProfile: PrismaClient['growthSocialProfile'];
};

export function offlineAfterSeconds(): number {
  return env.PRESENCE_OFFLINE_AFTER_SECONDS;
}

export async function recordHeartbeat(
  identityId: string,
  body: PresenceHeartbeatRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PresenceHeartbeatResponse> {
  const lastHeartbeatAt = now;
  const countsAsActivity = body.visible === true && body.active === true;

  const existing = await db.identityPresence.findUnique({ where: { identityId } });
  const skipIdleWrite =
    Boolean(existing) &&
    !countsAsActivity &&
    now.getTime() - existing!.lastHeartbeatAt.getTime() < HEARTBEAT_MIN_GAP_MS;

  if (existing && !skipIdleWrite) {
    await db.identityPresence.update({
      where: { identityId },
      data: {
        lastHeartbeatAt,
        ...(countsAsActivity ? { lastActivityAt: now } : {}),
      },
    });
  } else if (!existing && countsAsActivity) {
    await db.identityPresence.create({
      data: {
        identityId,
        lastActivityAt: now,
        lastHeartbeatAt,
      },
    });
  }

  const lastActivityAt = countsAsActivity ? now : (existing?.lastActivityAt ?? null);

  const accountType =
    body.accountType === 'BUSINESS'
      ? AnalyticsAccountType.BUSINESS
      : body.accountType === 'PLATFORM'
        ? AnalyticsAccountType.PLATFORM
        : AnalyticsAccountType.PERSONAL;

  if (!skipIdleWrite) {
    try {
      await touchAnalyticsSession({
        identityId,
        clientSessionId: body.clientSessionId,
        accountType,
        accountId: body.accountId ?? null,
        visible: body.visible,
        active: body.active,
        now,
      });
    } catch (error) {
      logger.error('Analytics session touch failed', {
        identityId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    online: isOnlineAt(lastActivityAt, now, offlineAfterSeconds()),
    lastSeenAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    idleTimeoutSeconds: env.ANALYTICS_IDLE_TIMEOUT,
    offlineAfterSeconds: offlineAfterSeconds(),
  };
}

export async function getPresenceStatus(
  viewerId: string,
  targetId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PresenceStatusDto> {
  const target = await db.identity.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      socialProfile: {
        select: { onlineStatusVisibility: true, lastSeenVisibility: true },
      },
    },
  });
  if (!target) throw ApiError.notFound('Foydalanuvchi topilmadi');

  const viewerIsSelf = viewerId === targetId;
  const viewerIsFriend = viewerIsSelf ? true : await areFriends(viewerId, targetId, db);
  const onlineVis = target.socialProfile?.onlineStatusVisibility ?? PresenceVisibility.FRIENDS;
  const lastSeenVis = target.socialProfile?.lastSeenVisibility ?? PresenceVisibility.FRIENDS;

  const showOnline = canSeePresence({
    visibility: onlineVis,
    viewerIsSelf,
    viewerIsFriend,
  });
  const showLastSeen = canSeePresence({
    visibility: lastSeenVis,
    viewerIsSelf,
    viewerIsFriend,
  });

  const presence = await db.identityPresence.findUnique({ where: { identityId: targetId } });
  const lastSeenAt = presence?.lastActivityAt ?? null;
  const online = isOnlineAt(lastSeenAt, now, offlineAfterSeconds());

  return {
    identityId: targetId,
    online: showOnline ? online : null,
    lastSeenAt: showLastSeen && lastSeenAt ? lastSeenAt.toISOString() : null,
  };
}

export async function areFriends(
  a: string,
  b: string,
  db: Pick<DbClient, 'growthFriendship'>,
): Promise<boolean> {
  const row = await db.growthFriendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function presenceDtoFor(
  viewerId: string,
  target: {
    id: string;
    socialProfile: {
      onlineStatusVisibility?: PresenceVisibility | null;
      lastSeenVisibility?: PresenceVisibility | null;
    } | null;
  },
  presence: { lastActivityAt: Date } | null,
  viewerIsFriend: boolean,
  now = new Date(),
): Promise<{ online: boolean | null; lastSeenAt: string | null }> {
  const viewerIsSelf = viewerId === target.id;
  const showOnline = canSeePresence({
    visibility: target.socialProfile?.onlineStatusVisibility ?? PresenceVisibility.FRIENDS,
    viewerIsSelf,
    viewerIsFriend,
  });
  const showLastSeen = canSeePresence({
    visibility: target.socialProfile?.lastSeenVisibility ?? PresenceVisibility.FRIENDS,
    viewerIsSelf,
    viewerIsFriend,
  });
  const lastSeenAt = presence?.lastActivityAt ?? null;
  const online = isOnlineAt(lastSeenAt, now, offlineAfterSeconds());
  return {
    online: showOnline ? online : null,
    lastSeenAt: showLastSeen && lastSeenAt ? lastSeenAt.toISOString() : null,
  };
}
