import {
  AnalyticsAccountType,
  DEFAULT_ANALYTICS_IDLE_TIMEOUT_SECONDS,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';

type DbClient = {
  analyticsSession: PrismaClient['analyticsSession'];
};

export function idleTimeoutSeconds(): number {
  try {
    return env.ANALYTICS_IDLE_TIMEOUT;
  } catch {
    return DEFAULT_ANALYTICS_IDLE_TIMEOUT_SECONDS;
  }
}

export async function touchAnalyticsSession(input: {
  identityId: string;
  clientSessionId: string;
  accountType: AnalyticsAccountType;
  accountId: string | null;
  visible: boolean;
  active: boolean;
  now?: Date;
  db?: DbClient;
}): Promise<{ id: string; activeSeconds: number }> {
  const db = input.db ?? defaultPrisma;
  const now = input.now ?? new Date();
  const clientSessionId = input.clientSessionId.trim().slice(0, 80);
  if (!clientSessionId) {
    return { id: '', activeSeconds: 0 };
  }

  const existing = await db.analyticsSession.findUnique({
    where: {
      identityId_clientSessionId: {
        identityId: input.identityId,
        clientSessionId,
      },
    },
  });

  const counts = input.visible && input.active;
  const idleMs = idleTimeoutSeconds() * 1000;

  if (!existing) {
    const row = await db.analyticsSession.create({
      data: {
        identityId: input.identityId,
        accountType: input.accountType,
        accountId: input.accountId,
        clientSessionId,
        startedAt: now,
        lastActivityAt: now,
        activeSeconds: 0,
        endedAt: null,
      },
    });
    return { id: row.id, activeSeconds: 0 };
  }

  if (!counts) {
    return { id: existing.id, activeSeconds: existing.activeSeconds };
  }

  const deltaMs = now.getTime() - existing.lastActivityAt.getTime();
  const addSeconds = deltaMs > 0 && deltaMs <= idleMs ? Math.floor(deltaMs / 1000) : 0;

  const row = await db.analyticsSession.update({
    where: { id: existing.id },
    data: {
      lastActivityAt: now,
      endedAt: null,
      accountType: input.accountType,
      accountId: input.accountId,
      activeSeconds: existing.activeSeconds + addSeconds,
    },
  });
  return { id: row.id, activeSeconds: row.activeSeconds };
}

export async function closeStaleSessions(
  now = new Date(),
  db: DbClient = defaultPrisma,
): Promise<number> {
  const cutoff = new Date(now.getTime() - idleTimeoutSeconds() * 2 * 1000);
  const result = await db.analyticsSession.updateMany({
    where: { endedAt: null, lastActivityAt: { lt: cutoff } },
    data: { endedAt: now },
  });
  return result.count;
}
