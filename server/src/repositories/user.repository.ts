import {
  StoreAccessStatus,
  SubscriptionRequestStatus,
  canWriteWithSubscription,
  effectiveSubscriptionStatus,
  planAllowsFeature,
  resolvePlanEntitlements,
  trialDaysRemaining,
  type AuthSubscriptionSnapshot,
  type AuthUser,
  type WorkerResponsibility,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

/**
 * The only columns the authentication path needs. Selecting explicitly means a
 * column added to the model later cannot accidentally reach a response body.
 */
const authUserSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  phone: true,
  role: true,
  passwordHash: true,
  storeId: true,
  store: {
    select: {
      name: true,
      accessStatus: true,
      subscriptions: {
        where: { isCurrent: true },
        take: 1,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              isDefaultTrial: true,
              monthlyPrice: true,
              planFeatures: {
                include: { feature: { select: { key: true } } },
              },
            },
          },
        },
      },
      platformInvoices: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        take: 1,
        select: { id: true },
      },
      subscriptionRequests: {
        where: { status: SubscriptionRequestStatus.PENDING },
        take: 1,
        select: { id: true },
      },
    },
  },
  responsibilities: { select: { responsibility: true }, orderBy: { responsibility: 'asc' } },
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

/**
 * Only an active user can sign in. Store access (payment/manual block) is a
 * separate gate after authentication so a blocked owner can reach the payment
 * screen instead of looking like a missing account.
 */
const signInScope = { isActive: true } satisfies Prisma.UserWhereInput;

function toSubscriptionSnapshot(record: AuthUserRecord): AuthSubscriptionSnapshot | null {
  if (record.role === 'PLATFORM_ADMIN') return null;
  const subscriptions =
    'subscriptions' in record.store ? record.store.subscriptions : undefined;
  const pendingRequests =
    'subscriptionRequests' in record.store ? record.store.subscriptionRequests : undefined;
  const pendingInvoices =
    'platformInvoices' in record.store ? record.store.platformInvoices : undefined;
  // Route-test fixtures omit billing relations; do not lock writes for those.
  if (subscriptions === undefined) {
    return {
      status: 'ACTIVE',
      storedStatus: 'ACTIVE',
      planId: null,
      planName: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      trialWelcomeSeenAt: null,
      daysRemaining: null,
      canWrite: true,
      hasPendingPaymentRequest: false,
      featureKeys: [],
      featuresRestricted: false,
    };
  }
  const hasPending =
    (pendingRequests?.length ?? 0) > 0 || (pendingInvoices?.length ?? 0) > 0;
  const sub = subscriptions[0];
  if (!sub) {
    return {
      status: 'EXPIRED',
      storedStatus: 'EXPIRED',
      planId: null,
      planName: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      trialWelcomeSeenAt: null,
      daysRemaining: null,
      canWrite: false,
      hasPendingPaymentRequest: hasPending,
      featureKeys: [],
      featuresRestricted: false,
    };
  }
  const effective = effectiveSubscriptionStatus(sub);
  const plan = sub.plan as {
    id: string;
    name: string;
    isDefaultTrial?: boolean;
    monthlyPrice?: bigint | number;
    planFeatures?: Array<{ enabled: boolean; feature: { key: string } }>;
  };
  const planFeatureRows = 'planFeatures' in plan ? plan.planFeatures ?? [] : [];
  const resolved = resolvePlanEntitlements({
    isDefaultTrial: 'isDefaultTrial' in plan ? Boolean(plan.isDefaultTrial) : false,
    monthlyPrice: 'monthlyPrice' in plan ? plan.monthlyPrice : null,
    enabledFeatureKeys: planFeatureRows.filter((row) => row.enabled).map((row) => row.feature.key),
    hasPlanFeatureRows: planFeatureRows.length > 0,
  });
  return {
    status: effective,
    storedStatus: sub.status,
    planId: plan.id,
    planName: plan.name,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    trialWelcomeSeenAt: sub.trialWelcomeSeenAt?.toISOString() ?? null,
    daysRemaining:
      effective === 'TRIAL' ? trialDaysRemaining(sub.trialEndsAt ?? sub.currentPeriodEnd) : null,
    canWrite: canWriteWithSubscription(effective),
    hasPendingPaymentRequest: hasPending,
    featureKeys: resolved.featureKeys,
    featuresRestricted: resolved.featuresRestricted,
  };
}

export function snapshotAllowsFeature(
  snapshot: AuthSubscriptionSnapshot | null | undefined,
  featureKey: string,
): boolean {
  if (!snapshot) return true;
  if (!snapshot.canWrite) return false;
  return planAllowsFeature(snapshot.featureKeys, featureKey, snapshot.featuresRestricted);
}

/** Strips the password hash and flattens the store name onto the principal. */
export function toAuthUser(record: AuthUserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    fullName: record.fullName,
    phone: record.phone,
    role: record.role,
    responsibilities: record.responsibilities.map(
      (row) => row.responsibility as WorkerResponsibility,
    ),
    storeId: record.storeId,
    storeName: record.store.name,
    storeAccessStatus: record.store.accessStatus ?? StoreAccessStatus.ACTIVE,
    subscription: toSubscriptionSnapshot(record),
  };
}

/** Matches either login column, case-insensitively — nobody capitalises an email. */
export function findSignInCandidate(identifier: string): Promise<AuthUserRecord | null> {
  return prisma.user.findFirst({
    where: {
      ...signInScope,
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        { username: { equals: identifier, mode: 'insensitive' } },
      ],
    },
    select: authUserSelect,
  });
}

export function findActiveUserById(id: string): Promise<AuthUserRecord | null> {
  return prisma.user.findFirst({ where: { id, ...signInScope }, select: authUserSelect });
}

export async function recordSuccessfulLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
