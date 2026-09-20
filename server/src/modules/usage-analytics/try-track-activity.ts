import {
  AnalyticsAccountType,
  PLATFORM_XP_EVENT_TYPES,
} from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

import { tryRecordAnalyticsEvent } from './analytics-events.service.js';
import { tryAwardPlatformXp } from './platform-xp.service.js';

async function identityIdForUser(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { identityId: true },
  });
  return user?.identityId ?? null;
}

/**
 * Fire-and-forget business usage tracking. Must never fail a sale/product write.
 */
export async function tryTrackBusinessEvent(input: {
  actorUserId?: string | null;
  identityId?: string | null;
  storeId?: string | null;
  eventType: string;
  entityId: string;
  feature?: string;
  businessType?: string | null;
}): Promise<void> {
  try {
    const identityId = input.identityId ?? (await identityIdForUser(input.actorUserId));
    if (!identityId) return;
    await tryRecordAnalyticsEvent({
      identityId,
      accountType: AnalyticsAccountType.BUSINESS,
      accountId: input.storeId ?? null,
      eventType: input.eventType,
      metadata: {
        feature: input.feature,
        entityType: input.eventType,
        businessType: input.businessType ?? undefined,
        source: 'api',
      },
    });
    if (
      input.eventType === PLATFORM_XP_EVENT_TYPES.SALE_CREATED ||
      input.eventType === PLATFORM_XP_EVENT_TYPES.PRODUCT_CREATED
    ) {
      await tryAwardPlatformXp({
        identityId,
        eventType: input.eventType,
        entityId: input.entityId,
      });
    }
  } catch (error) {
    logger.error('Business activity tracking failed', {
      eventType: input.eventType,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function tryTrackAuthEvent(input: {
  identityId?: string | null;
  userId?: string | null;
  eventType: 'login' | 'logout' | 'session_started';
  accountType: AnalyticsAccountType;
  accountId?: string | null;
}): Promise<void> {
  try {
    const identityId = input.identityId ?? (await identityIdForUser(input.userId));
    if (!identityId) return;
    await tryRecordAnalyticsEvent({
      identityId,
      accountType: input.accountType,
      accountId: input.accountId ?? null,
      eventType: input.eventType,
      metadata: { source: 'auth' },
    });
  } catch (error) {
    logger.error('Auth activity tracking failed', {
      eventType: input.eventType,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
