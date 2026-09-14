import {
  FeatureKey,
  LimitResourceKey,
  STARTER_FEATURE_KEYS,
  SubscriptionStatus,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    feature: { upsert: vi.fn(), findMany: vi.fn() },
    planFeature: { deleteMany: vi.fn(), createMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    planLimit: { deleteMany: vi.fn(), createMany: vi.fn() },
    storeSubscription: { findFirst: vi.fn(), update: vi.fn() },
    user: { count: vi.fn() },
    customer: { count: vi.fn() },
    product: { count: vi.fn() },
    supplier: { count: vi.fn() },
    sale: { count: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const {
  assertCanCreateResource,
  assertCanUseFeature,
  canCreateResource,
  hasFeature,
} = await import('./entitlement.service.js');

const now = new Date('2026-08-22T12:00:00.000Z');

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan_1',
    name: 'Starter',
    description: '',
    monthlyPrice: 100000n,
    currency: 'UZS',
    trialDays: 0,
    isActive: true,
    isDefaultTrial: false,
    features: {},
    planFeatures: [
      { enabled: true, feature: { key: FeatureKey.SALES } },
      { enabled: true, feature: { key: FeatureKey.CUSTOMERS } },
      { enabled: true, feature: { key: FeatureKey.WORKERS } },
    ],
    limits: [
      { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 10 },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    storeId: 'store_a',
    planId: 'plan_1',
    status: SubscriptionStatus.TRIAL,
    isCurrent: true,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: new Date('2026-08-29T12:00:00.000Z'),
    nextPaymentDue: new Date('2026-08-29T12:00:00.000Z'),
    trialStartedAt: now,
    trialEndsAt: new Date('2026-08-29T12:00:00.000Z'),
    trialWelcomeSeenAt: null,
    pendingPlanId: null,
    cancelledAt: null,
    endedAt: null,
    plan: plan(),
    pendingPlan: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('entitlement.service', () => {
  it('allows a feature while trial is active', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub());
    await expect(hasFeature('store_a', FeatureKey.SALES, now)).resolves.toBe(true);
    await expect(assertCanUseFeature('store_a', FeatureKey.SALES, now)).resolves.toBeUndefined();
  });

  it('blocks writes after trial expiry even if stored status is still TRIAL', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({
        trialEndsAt: new Date('2026-08-21T12:00:00.000Z'),
        currentPeriodEnd: new Date('2026-08-21T12:00:00.000Z'),
      }),
    );
    await expect(hasFeature('store_a', FeatureKey.SALES, now)).resolves.toBe(false);
    await expect(assertCanUseFeature('store_a', FeatureKey.SALES, now)).rejects.toMatchObject({
      code: 'SUBSCRIPTION_REQUIRED',
    });
  });

  it('allows a feature the plan includes and blocks one it does not', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({ status: SubscriptionStatus.ACTIVE, trialEndsAt: null }),
    );
    await expect(hasFeature('store_a', FeatureKey.SALES, now)).resolves.toBe(true);
    await expect(hasFeature('store_a', FeatureKey.BACKUP, now)).resolves.toBe(false);
    await expect(assertCanUseFeature('store_a', FeatureKey.BACKUP, now)).rejects.toBeInstanceOf(ApiError);
  });

  it('allows the 10th worker and blocks the 11th', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({ status: SubscriptionStatus.ACTIVE, trialEndsAt: null }),
    );
    prismaMock.user.count.mockResolvedValue(9);
    await expect(canCreateResource('store_a', LimitResourceKey.WORKERS)).resolves.toBe(true);
    prismaMock.user.count.mockResolvedValue(10);
    await expect(assertCanCreateResource('store_a', LimitResourceKey.WORKERS)).rejects.toMatchObject({
      code: 'WORKER_LIMIT_REACHED',
    });
  });

  it('does not cap workers when the plan limit is unlimited', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        plan: plan({
          limits: [{ resourceKey: LimitResourceKey.WORKERS, unlimited: true, limitValue: null }],
        }),
      }),
    );
    prismaMock.user.count.mockResolvedValue(500);
    await expect(canCreateResource('store_a', LimitResourceKey.WORKERS)).resolves.toBe(true);
  });

  it('does not grant store B the features of store A', async () => {
    prismaMock.storeSubscription.findFirst.mockImplementation(
      ({ where }: { where: { storeId: string } }) =>
        Promise.resolve(where.storeId === 'store_a' ? sub() : null),
    );
    await expect(hasFeature('store_b', FeatureKey.SALES, now)).resolves.toBe(false);
  });

  it('treats an empty PlanFeature set as legacy all-allowed', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        plan: plan({ planFeatures: [] }),
      }),
    );
    await expect(hasFeature('store_a', FeatureKey.BACKUP, now)).resolves.toBe(true);
  });

  it('does not give a 7-day trial the START modules', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({
        status: SubscriptionStatus.TRIAL,
        plan: plan({
          isDefaultTrial: true,
          monthlyPrice: 0n,
          planFeatures: STARTER_FEATURE_KEYS.map((key) => ({
            enabled: true,
            feature: { key },
          })),
        }),
      }),
    );
    await expect(hasFeature('store_a', FeatureKey.SALES, now)).resolves.toBe(true);
    await expect(hasFeature('store_a', FeatureKey.INVENTORY, now)).resolves.toBe(false);
    await expect(hasFeature('store_a', FeatureKey.WORKERS, now)).resolves.toBe(false);
    await expect(assertCanUseFeature('store_a', FeatureKey.INVENTORY, now)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
