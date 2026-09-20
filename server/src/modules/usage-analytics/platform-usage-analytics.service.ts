import {
  AnalyticsAccountType,
  BUSINESS_ADOPTION_FEATURES,
  PERSONAL_ADOPTION_FEATURES,
  WorkspaceType,
  isOnlineAt,
  stripFinancialFields,
  type PlatformUsageFeatureAdoptionDto,
  type PlatformUsageFeaturesResponse,
  type PlatformUsageOverviewDto,
  type PlatformUsageRetentionDto,
  type PlatformUsageUserDetailDto,
  type PlatformUsageUserRowDto,
  type PlatformUsageUsersResponse,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

type DbClient = PrismaClient;

function utcDayStart(now: Date, minusDays = 0): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - minusDays));
}

function displayName(fullName: string): string {
  return fullName.trim() || 'Foydalanuvchi';
}

const membershipSelect = {
  workspace: {
    select: {
      type: true,
      personalSubscription: { select: { status: true } },
      store: {
        select: {
          businessType: true,
          subscriptions: {
            where: { isCurrent: true },
            select: { status: true },
            take: 1,
          },
        },
      },
    },
  },
} as const;

type MembershipRow = {
  workspace: {
    type: string;
    personalSubscription: { status: string } | null;
    store: {
      businessType: string | null;
      subscriptions: { status: string }[];
    } | null;
  };
};

function subscriptionFields(memberships: MembershipRow[]): {
  personalSubscriptionStatus: string | null;
  businessSubscriptionStatus: string | null;
  businessType: string | null;
} {
  let personalSubscriptionStatus: string | null = null;
  let businessSubscriptionStatus: string | null = null;
  let businessType: string | null = null;
  for (const row of memberships) {
    if (row.workspace.personalSubscription?.status) {
      personalSubscriptionStatus = row.workspace.personalSubscription.status;
    }
    const store = row.workspace.store;
    if (!store) continue;
    if (store.businessType) businessType = store.businessType;
    const status = store.subscriptions[0]?.status;
    if (status) businessSubscriptionStatus = status;
  }
  return { personalSubscriptionStatus, businessSubscriptionStatus, businessType };
}

async function activeIdentityIdsSince(since: Date, db: DbClient): Promise<Set<string>> {
  const [sessions, presence] = await Promise.all([
    db.analyticsSession.findMany({
      where: { lastActivityAt: { gte: since } },
      select: { identityId: true },
      distinct: ['identityId'],
    }),
    db.identityPresence.findMany({
      where: { lastActivityAt: { gte: since } },
      select: { identityId: true },
    }),
  ]);
  return new Set([...sessions, ...presence].map((row) => row.identityId));
}

export async function getUsageOverview(
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformUsageOverviewDto> {
  const today = utcDayStart(now);
  const week = utcDayStart(now, 6);
  const month = utcDayStart(now, 29);
  const offlineAfter = env.PRESENCE_OFFLINE_AFTER_SECONDS;
  const onlineSince = new Date(now.getTime() - offlineAfter * 1000);

  const [
    totalUsers,
    personalUsers,
    businessUsers,
    newUsers,
    onlineNow,
    dauSet,
    wauSet,
    mauSet,
    sessionAgg,
    dailyAgg,
    retention,
  ] = await Promise.all([
    db.identity.count(),
    db.identity.count({
      where: { memberships: { some: { workspace: { type: WorkspaceType.PERSONAL } } } },
    }),
    db.identity.count({
      where: { memberships: { some: { workspace: { type: WorkspaceType.BUSINESS } } } },
    }),
    db.identity.count({ where: { createdAt: { gte: week } } }),
    db.identityPresence.count({ where: { lastActivityAt: { gte: onlineSince } } }),
    activeIdentityIdsSince(today, db),
    activeIdentityIdsSince(week, db),
    activeIdentityIdsSince(month, db),
    db.analyticsSession.aggregate({
      where: { startedAt: { gte: month } },
      _avg: { activeSeconds: true },
    }),
    db.dailyUserActivity.aggregate({
      where: { date: { gte: month } },
      _avg: { totalUsageSeconds: true },
    }),
    getUsageRetention(db, now),
  ]);

  const returningUsers = await db.identity.count({
    where: {
      createdAt: { lt: today },
      id: { in: [...dauSet] },
    },
  });

  return stripFinancialFields({
    totalUsers,
    activeToday: dauSet.size,
    onlineNow,
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
    averageDailyUsageSeconds: Math.round(dailyAgg._avg.totalUsageSeconds ?? 0),
    averageSessionSeconds: Math.round(sessionAgg._avg.activeSeconds ?? 0),
    personalUsers,
    businessUsers,
    newUsers,
    returningUsers,
    d1Retention: retention.d1,
    d7Retention: retention.d7,
    d30Retention: retention.d30,
  });
}

export async function listUsageUsers(
  query: { page?: number; pageSize?: number },
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformUsageUsersResponse> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, query.pageSize ?? 20));
  const today = utcDayStart(now);
  const week = utcDayStart(now, 6);
  const month = utcDayStart(now, 29);

  const totalItems = await db.identity.count();
  const identities = await db.identity.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      fullName: true,
      socialProfile: { select: { handle: true } },
      memberships: { select: membershipSelect },
      presence: { select: { lastActivityAt: true } },
    },
  });

  const ids = identities.map((row) => row.id);
  const [todayRows, weekRows, monthRows, sessionCounts] = await Promise.all([
    db.dailyUserActivity.findMany({
      where: { identityId: { in: ids }, date: today },
    }),
    db.dailyUserActivity.findMany({
      where: { identityId: { in: ids }, date: { gte: week } },
    }),
    db.dailyUserActivity.findMany({
      where: { identityId: { in: ids }, date: { gte: month } },
    }),
    db.analyticsSession.groupBy({
      by: ['identityId'],
      where: { identityId: { in: ids }, startedAt: { gte: month } },
      _count: { _all: true },
    }),
  ]);

  const todayMap = new Map(todayRows.map((row) => [row.identityId, row]));
  const weekSum = new Map<string, { seconds: number; days: number }>();
  for (const row of weekRows) {
    const cur = weekSum.get(row.identityId) ?? { seconds: 0, days: 0 };
    cur.seconds += row.totalUsageSeconds;
    cur.days += 1;
    weekSum.set(row.identityId, cur);
  }
  const monthSum = new Map<string, { seconds: number; days: number; top: string | null }>();
  for (const row of monthRows) {
    const cur = monthSum.get(row.identityId) ?? { seconds: 0, days: 0, top: row.topFeature };
    cur.seconds += row.totalUsageSeconds;
    cur.days += 1;
    if (row.topFeature) cur.top = row.topFeature;
    monthSum.set(row.identityId, cur);
  }
  const sessionsMap = new Map(sessionCounts.map((row) => [row.identityId, row._count._all]));

  const items: PlatformUsageUserRowDto[] = identities.map((row) => {
    const types = new Set(
      row.memberships.map((m) =>
        m.workspace.type === WorkspaceType.BUSINESS
          ? AnalyticsAccountType.BUSINESS
          : AnalyticsAccountType.PERSONAL,
      ),
    );
    const sub = subscriptionFields(row.memberships as MembershipRow[]);
    const week = weekSum.get(row.id);
    const month = monthSum.get(row.id);
    return {
      identityId: row.id,
      displayName: displayName(row.fullName),
      handle: row.socialProfile?.handle ?? null,
      accountTypes: [...types],
      businessType: sub.businessType,
      personalSubscriptionStatus: sub.personalSubscriptionStatus,
      businessSubscriptionStatus: sub.businessSubscriptionStatus,
      lastActiveAt: row.presence?.lastActivityAt.toISOString() ?? null,
      todaySeconds: todayMap.get(row.id)?.totalUsageSeconds ?? 0,
      avg7dSeconds: week && week.days ? Math.round(week.seconds / 7) : 0,
      avg30dSeconds: month && month.days ? Math.round(month.seconds / 30) : 0,
      sessionsCount: sessionsMap.get(row.id) ?? 0,
      topFeature: month?.top ?? todayMap.get(row.id)?.topFeature ?? null,
    };
  });

  return stripFinancialFields({
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  });
}

export async function getUsageUserDetail(
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformUsageUserDetailDto> {
  const identity = await db.identity.findUnique({
    where: { id: identityId },
    select: {
      id: true,
      fullName: true,
      socialProfile: { select: { handle: true } },
      memberships: { select: membershipSelect },
      presence: { select: { lastActivityAt: true } },
    },
  });
  if (!identity) throw ApiError.notFound('Foydalanuvchi topilmadi');

  const today = utcDayStart(now);
  const week = utcDayStart(now, 6);
  const month = utcDayStart(now, 29);

  const [sessions, todayRow, weekRows, monthRows, featureGroups] = await Promise.all([
    db.analyticsSession.aggregate({
      where: { identityId },
      _count: { _all: true },
      _avg: { activeSeconds: true },
    }),
    db.dailyUserActivity.findUnique({
      where: { identityId_date: { identityId, date: today } },
    }),
    db.dailyUserActivity.findMany({ where: { identityId, date: { gte: week } } }),
    db.dailyUserActivity.findMany({ where: { identityId, date: { gte: month } } }),
    db.analyticsEvent.groupBy({
      by: ['feature'],
      where: { identityId, feature: { not: null }, createdAt: { gte: month } },
      _count: { _all: true },
    }),
  ]);

  const types = new Set(
    identity.memberships.map((m) =>
      m.workspace.type === WorkspaceType.BUSINESS
        ? AnalyticsAccountType.BUSINESS
        : AnalyticsAccountType.PERSONAL,
    ),
  );
  const sub = subscriptionFields(identity.memberships as MembershipRow[]);

  const dto: PlatformUsageUserDetailDto = {
    identityId,
    displayName: displayName(identity.fullName),
    handle: identity.socialProfile?.handle ?? null,
    accountTypes: [...types],
    businessType: sub.businessType,
    personalSubscriptionStatus: sub.personalSubscriptionStatus,
    businessSubscriptionStatus: sub.businessSubscriptionStatus,
    lastActiveAt: identity.presence?.lastActivityAt.toISOString() ?? null,
    totalSessions: sessions._count._all,
    averageSessionSeconds: Math.round(sessions._avg.activeSeconds ?? 0),
    todaySeconds: todayRow?.totalUsageSeconds ?? 0,
    last7dSeconds: weekRows.reduce((sum, row) => sum + row.totalUsageSeconds, 0),
    last30dSeconds: monthRows.reduce((sum, row) => sum + row.totalUsageSeconds, 0),
    featureUsage: featureGroups
      .filter((row) => row.feature)
      .map((row) => ({ feature: row.feature as string, eventCount: row._count._all }))
      .sort((a, b) => b.eventCount - a.eventCount),
  };

  return stripFinancialFields(dto);
}

export async function getUsageFeatures(
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformUsageFeaturesResponse> {
  const month = utcDayStart(now, 29);
  const active = await activeIdentityIdsSince(month, db);
  const activeUsers = Math.max(1, active.size);
  const groups = await db.analyticsEvent.groupBy({
    by: ['feature'],
    where: { feature: { not: null }, createdAt: { gte: month } },
    _count: { _all: true },
  });
  const distinctUsers = await db.analyticsEvent.findMany({
    where: { feature: { not: null }, createdAt: { gte: month } },
    select: { feature: true, identityId: true },
    distinct: ['feature', 'identityId'],
  });
  const userMap = new Map<string, number>();
  for (const row of distinctUsers) {
    if (!row.feature) continue;
    userMap.set(row.feature, (userMap.get(row.feature) ?? 0) + 1);
  }

  const countMap = new Map(
    groups.filter((g) => g.feature).map((g) => [g.feature as string, g._count._all]),
  );

  const toRows = (features: readonly string[]): PlatformUsageFeatureAdoptionDto[] =>
    features.map((feature) => {
      const users = userMap.get(feature) ?? 0;
      return {
        feature,
        activeUsers: users,
        adoptionPercent: Math.round((users / activeUsers) * 100),
        eventCount: countMap.get(feature) ?? 0,
      };
    });

  return stripFinancialFields({
    personal: toRows(PERSONAL_ADOPTION_FEATURES),
    business: toRows(BUSINESS_ADOPTION_FEATURES),
    activeUsers: active.size,
  });
}

export async function getUsageRetention(
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<PlatformUsageRetentionDto> {
  const d1 = await retentionRate(1, db, now);
  const d7 = await retentionRate(7, db, now);
  const d30 = await retentionRate(30, db, now);
  return stripFinancialFields({
    d1,
    d7,
    d30,
    definition: {
      d1: 'Share of users who returned on the calendar day after signup. Incomplete cohorts excluded.',
      d7: 'Share of users who returned on day 7 after signup. Incomplete cohorts excluded.',
      d30: 'Share of users who returned on day 30 after signup. Incomplete cohorts excluded.',
    },
  });
}

async function retentionRate(dayOffset: number, db: DbClient, now: Date): Promise<number | null> {
  const today = utcDayStart(now);
  // D{n} needs the nth calendar day after signup to have fully elapsed.
  const lastCompleteSignup = utcDayStart(now, dayOffset + 1);
  const windowStart = utcDayStart(now, dayOffset + 1 + 59);
  if (lastCompleteSignup.getTime() >= today.getTime()) return null;

  const cohortEnd = new Date(lastCompleteSignup.getTime() + 24 * 60 * 60 * 1000);
  const signups = await db.identity.findMany({
    where: { createdAt: { gte: windowStart, lt: cohortEnd } },
    select: { id: true, createdAt: true },
  });
  if (signups.length === 0) return null;

  const ids = signups.map((row) => row.id);
  const earliestTarget = new Date(windowStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const latestTargetEnd = new Date(today.getTime());

  const [dailyHits, sessionHits] = await Promise.all([
    db.dailyUserActivity.findMany({
      where: {
        identityId: { in: ids },
        date: { gte: earliestTarget, lt: latestTargetEnd },
        OR: [{ active: true }, { totalUsageSeconds: { gt: 0 } }, { sessionsCount: { gt: 0 } }],
      },
      select: { identityId: true, date: true },
    }),
    db.analyticsSession.findMany({
      where: {
        identityId: { in: ids },
        lastActivityAt: { gte: earliestTarget, lt: latestTargetEnd },
      },
      select: { identityId: true, lastActivityAt: true },
    }),
  ]);

  const activeDays = new Set<string>();
  for (const row of dailyHits) {
    activeDays.add(`${row.identityId}:${row.date.toISOString().slice(0, 10)}`);
  }
  for (const row of sessionHits) {
    activeDays.add(`${row.identityId}:${row.lastActivityAt.toISOString().slice(0, 10)}`);
  }

  let returned = 0;
  for (const row of signups) {
    const signupDay = utcDayStart(row.createdAt);
    const targetDay = new Date(signupDay.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    if (activeDays.has(`${row.id}:${targetDay.toISOString().slice(0, 10)}`)) {
      returned += 1;
    }
  }

  return Math.round((returned / signups.length) * 1000) / 10;
}

export function isOnlineNow(lastActivityAt: Date | null, now: Date): boolean {
  return isOnlineAt(lastActivityAt, now, env.PRESENCE_OFFLINE_AFTER_SECONDS);
}
