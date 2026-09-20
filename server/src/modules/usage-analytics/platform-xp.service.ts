import { platformXpReferenceKey, platformXpRule, toDayKey } from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

type DbClient = {
  platformXpTransaction: PrismaClient['platformXpTransaction'];
};

/**
 * Flat usage XP with daily cap + referenceKey idempotency.
 * Isolated: never throws to the caller.
 */
export async function tryAwardPlatformXp(input: {
  identityId: string;
  eventType: string;
  entityId: string;
  now?: Date;
  db?: DbClient;
}): Promise<{ awarded: number; duplicate: boolean }> {
  try {
    const rule = platformXpRule(input.eventType);
    if (!rule || !input.identityId || !input.entityId) {
      return { awarded: 0, duplicate: false };
    }
    const db = input.db ?? defaultPrisma;
    const now = input.now ?? new Date();
    const referenceKey = platformXpReferenceKey(input.eventType, input.entityId);

    const existing = await db.platformXpTransaction.findUnique({
      where: {
        identityId_referenceKey: { identityId: input.identityId, referenceKey },
      },
    });
    if (existing) return { awarded: 0, duplicate: true };

    const dayStart = new Date(`${toDayKey(now)}T00:00:00.000Z`);
    const todayCount = await db.platformXpTransaction.count({
      where: {
        identityId: input.identityId,
        eventType: input.eventType,
        createdAt: { gte: dayStart },
      },
    });
    if (todayCount >= rule.dailyLimit) {
      return { awarded: 0, duplicate: false };
    }

    await db.platformXpTransaction.create({
      data: {
        identityId: input.identityId,
        eventType: input.eventType,
        xp: rule.xp,
        referenceKey,
      },
    });
    return { awarded: rule.xp, duplicate: false };
  } catch (error) {
    logger.error('Platform XP award failed', {
      eventType: input.eventType,
      reason: error instanceof Error ? error.message : String(error),
    });
    return { awarded: 0, duplicate: false };
  }
}
