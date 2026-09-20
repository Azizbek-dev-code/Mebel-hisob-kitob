import { AnalyticsAccountType, DEFAULT_ANALYTICS_EVENT_RETENTION_DAYS } from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

import { closeStaleSessions } from './analytics-session.service.js';

function utcDayStart(now: Date, minusDays = 0): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - minusDays));
}

export async function runUsageAnalyticsMaintenance(
  db: PrismaClient = defaultPrisma,
  now = new Date(),
): Promise<{
  sessionsClosed: number;
  daysAggregated: number;
  eventsDeleted: number;
}> {
  const sessionsClosed = await closeStaleSessions(now, db);
  let daysAggregated = 0;
  for (const offset of [1, 0]) {
    await aggregateDay(utcDayStart(now, offset), db);
    daysAggregated += 1;
  }
  const retentionDays = env.ANALYTICS_EVENT_RETENTION_DAYS ?? DEFAULT_ANALYTICS_EVENT_RETENTION_DAYS;
  const cutoff = utcDayStart(now, retentionDays);
  const deleted = await db.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  logger.info('Usage analytics maintenance', {
    sessionsClosed,
    eventsDeleted: deleted.count,
  });
  return { sessionsClosed, daysAggregated, eventsDeleted: deleted.count };
}

async function aggregateDay(day: Date, db: PrismaClient): Promise<void> {
  const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const sessions = await db.analyticsSession.findMany({
    where: {
      OR: [
        { startedAt: { gte: day, lt: next } },
        { lastActivityAt: { gte: day, lt: next } },
      ],
    },
    select: { identityId: true, activeSeconds: true, id: true },
  });

  const byIdentity = new Map<string, { seconds: number; sessions: number }>();
  for (const row of sessions) {
    const cur = byIdentity.get(row.identityId) ?? { seconds: 0, sessions: 0 };
    cur.seconds += row.activeSeconds;
    cur.sessions += 1;
    byIdentity.set(row.identityId, cur);
  }

  const topFeatures = await db.analyticsEvent.groupBy({
    by: ['identityId', 'feature'],
    where: { createdAt: { gte: day, lt: next }, feature: { not: null } },
    _count: { _all: true },
  });
  const topMap = new Map<string, { feature: string; count: number }>();
  for (const row of topFeatures) {
    if (!row.feature) continue;
    const cur = topMap.get(row.identityId);
    if (!cur || row._count._all > cur.count) {
      topMap.set(row.identityId, { feature: row.feature, count: row._count._all });
    }
  }

  for (const [identityId, stats] of byIdentity) {
    await db.dailyUserActivity.upsert({
      where: { identityId_date: { identityId, date: day } },
      create: {
        identityId,
        date: day,
        totalUsageSeconds: stats.seconds,
        sessionsCount: stats.sessions,
        active: stats.seconds > 0 || stats.sessions > 0,
        topFeature: topMap.get(identityId)?.feature ?? null,
      },
      update: {
        totalUsageSeconds: stats.seconds,
        sessionsCount: stats.sessions,
        active: stats.seconds > 0 || stats.sessions > 0,
        topFeature: topMap.get(identityId)?.feature ?? null,
      },
    });
  }

  const featureGroups = await db.analyticsEvent.groupBy({
    by: ['feature', 'accountType'],
    where: { createdAt: { gte: day, lt: next }, feature: { not: null } },
    _count: { _all: true, identityId: true },
  });
  for (const row of featureGroups) {
    if (!row.feature) continue;
    await db.dailyFeatureUsage.upsert({
      where: {
        date_feature_accountType: {
          date: day,
          feature: row.feature,
          accountType: row.accountType as AnalyticsAccountType,
        },
      },
      create: {
        date: day,
        feature: row.feature,
        accountType: row.accountType,
        activeUsers: row._count.identityId,
        eventCount: row._count._all,
      },
      update: {
        activeUsers: row._count.identityId,
        eventCount: row._count._all,
      },
    });
  }
}
