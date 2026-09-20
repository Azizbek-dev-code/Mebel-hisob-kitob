import {
  AnalyticsAccountType,
  featureForAnalyticsEvent,
  featureFromRoute,
  sanitizeAnalyticsMetadata,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

export type RecordAnalyticsEventInput = {
  identityId: string;
  accountType?: AnalyticsAccountType;
  accountId?: string | null;
  eventType: string;
  route?: string | null;
  sessionId?: string | null;
  metadata?: unknown;
};

type DbClient = {
  analyticsEvent: {
    create: PrismaClient['analyticsEvent']['create'];
  };
};

function resolveFeature(eventType: string, route?: string | null, metadataFeature?: string): string | null {
  if (metadataFeature) return metadataFeature.slice(0, 64);
  return featureForAnalyticsEvent(eventType) ?? (route ? featureFromRoute(route) : null);
}

/**
 * Isolated write. Never throws to the caller — business transactions must not roll back.
 */
export async function tryRecordAnalyticsEvent(
  input: RecordAnalyticsEventInput,
  db: DbClient = defaultPrisma,
): Promise<{ stored: boolean; metadata: Record<string, string> | null }> {
  try {
    const eventType = input.eventType.trim().slice(0, 80);
    if (!eventType || !input.identityId) return { stored: false, metadata: null };
    const metadata = sanitizeAnalyticsMetadata(input.metadata);
    const feature = resolveFeature(eventType, input.route, metadata?.feature);
    await db.analyticsEvent.create({
      data: {
        identityId: input.identityId,
        accountType: input.accountType ?? AnalyticsAccountType.PERSONAL,
        accountId: input.accountId ?? null,
        eventType,
        feature,
        route: input.route?.slice(0, 160) ?? null,
        sessionId: input.sessionId?.slice(0, 80) ?? null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return { stored: true, metadata };
  } catch (error) {
    logger.error('Analytics event write failed', {
      eventType: input.eventType,
      reason: error instanceof Error ? error.message : String(error),
    });
    return { stored: false, metadata: null };
  }
}

export async function tryRecordAnalyticsEvents(
  identityId: string,
  accountType: AnalyticsAccountType,
  accountId: string | null,
  sessionId: string | null,
  events: Array<{ eventType: string; route?: string; feature?: string; metadata?: unknown }>,
  db: DbClient = defaultPrisma,
): Promise<number> {
  let stored = 0;
  for (const event of events.slice(0, 20)) {
    const result = await tryRecordAnalyticsEvent(
      {
        identityId,
        accountType,
        accountId,
        eventType: event.eventType,
        route: event.route,
        sessionId,
        metadata: {
          ...(typeof event.metadata === 'object' && event.metadata ? event.metadata : {}),
          ...(event.feature ? { feature: event.feature } : {}),
        },
      },
      db,
    );
    if (result.stored) stored += 1;
  }
  return stored;
}
