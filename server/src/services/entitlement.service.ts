import {
  FEATURE_CATALOG,
  LIMIT_CATALOG,
  LimitResourceKey,
  UserRole,
  canWriteWithSubscription,
  effectiveSubscriptionStatus,
  isWithinLimit,
  limitByKey,
  planAllowsFeature,
  type FeatureDto,
  type PlanLimitDto,
  type ResourceUsageDto,
  type SubscriptionPlanDto,
  type SubscriptionPlanFeatures,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';

const planEntitlementInclude = {
  planFeatures: {
    include: { feature: true },
  },
  limits: true,
} satisfies Prisma.SubscriptionPlanInclude;

export type PlanWithEntitlements = Prisma.SubscriptionPlanGetPayload<{
  include: typeof planEntitlementInclude;
}>;

function money(value: bigint): number {
  return Number(value);
}

export function toFeatureDto(feature: {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}): FeatureDto {
  return {
    id: feature.id,
    key: feature.key,
    name: feature.name,
    description: feature.description,
    category: feature.category,
    isActive: feature.isActive,
    sortOrder: feature.sortOrder,
  };
}

export function enabledFeatureKeys(plan: PlanWithEntitlements | null | undefined): string[] {
  if (!plan) return [];
  return plan.planFeatures.filter((row) => row.enabled).map((row) => row.feature.key);
}

export function planFeaturesRestricted(plan: PlanWithEntitlements | null | undefined): boolean {
  return Boolean(plan && plan.planFeatures.length > 0);
}

export function toPlanLimitDtos(plan: PlanWithEntitlements | null | undefined): PlanLimitDto[] {
  if (!plan) return [];
  return plan.limits.map((row) => ({
    resourceKey: row.resourceKey,
    name: limitByKey(row.resourceKey)?.name ?? row.resourceKey,
    unlimited: row.unlimited,
    limitValue: row.unlimited ? null : (row.limitValue ?? null),
  }));
}

export function toPlanDto(plan: PlanWithEntitlements): SubscriptionPlanDto {
  const featureKeys = enabledFeatureKeys(plan);
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: money(plan.monthlyPrice),
    currency: plan.currency,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    isDefaultTrial: plan.isDefaultTrial,
    features: (plan.features ?? {}) as SubscriptionPlanFeatures,
    featureKeys,
    featuresRestricted: planFeaturesRestricted(plan),
    enabledFeatures: plan.planFeatures
      .filter((row) => row.enabled)
      .map((row) => toFeatureDto(row.feature))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    limits: toPlanLimitDtos(plan),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function ensureFeatureCatalog(): Promise<void> {
  for (const [index, entry] of FEATURE_CATALOG.entries()) {
    await prisma.feature.upsert({
      where: { key: entry.key },
      update: {
        name: entry.name,
        description: entry.description,
        category: entry.category,
        isActive: true,
        sortOrder: index,
      },
      create: {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        isActive: true,
        sortOrder: index,
      },
    });
  }
}

export async function listFeatureCatalog(): Promise<{ items: FeatureDto[] }> {
  await ensureFeatureCatalog();
  const items = await prisma.feature.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return { items: items.map(toFeatureDto) };
}

export async function syncPlanEntitlements(
  planId: string,
  input: { featureKeys?: string[]; limits?: Array<{ resourceKey: string; unlimited: boolean; limitValue?: number | null }> },
): Promise<void> {
  if (input.featureKeys) {
    await ensureFeatureCatalog();
    const uniqueKeys = [...new Set(input.featureKeys)];
    const catalog = await prisma.feature.findMany();
    const known = new Set(catalog.map((row) => row.key));
    const unknown = uniqueKeys.filter((key) => !known.has(key));
    if (unknown.length > 0) {
      throw ApiError.validation('Noma’lum funksiya', [
        { field: 'featureKeys', message: `Noma’lum: ${unknown.join(', ')}` },
      ]);
    }
    const enabled = new Set(uniqueKeys);
    await prisma.planFeature.deleteMany({ where: { planId } });
    if (catalog.length > 0) {
      await prisma.planFeature.createMany({
        data: catalog.map((feature) => ({
          planId,
          featureId: feature.id,
          enabled: enabled.has(feature.key),
        })),
      });
    }
  }

  if (input.limits) {
    const unique = new Map(input.limits.map((row) => [row.resourceKey, row]));
    for (const resourceKey of unique.keys()) {
      if (!LIMIT_CATALOG.some((item) => item.key === resourceKey)) {
        throw ApiError.validation('Noma’lum limit', [
          { field: 'limits', message: `Noma’lum resurs: ${resourceKey}` },
        ]);
      }
    }
    await prisma.planLimit.deleteMany({ where: { planId } });
    const rows = [...unique.values()];
    if (rows.length > 0) {
      await prisma.planLimit.createMany({
        data: rows.map((row) => ({
          planId,
          resourceKey: row.resourceKey,
          unlimited: row.unlimited,
          limitValue: row.unlimited ? null : (row.limitValue ?? null),
        })),
      });
    }
  }
}

export async function attachDefaultEntitlements(
  planId: string,
  featureKeys: readonly string[],
  limits: Array<{ resourceKey: string; unlimited: boolean; limitValue?: number | null }>,
): Promise<void> {
  const existing = await prisma.planFeature.count({ where: { planId } });
  if (existing > 0) return;
  await syncPlanEntitlements(planId, { featureKeys: [...featureKeys], limits });
}

const currentSubInclude = {
  plan: { include: planEntitlementInclude },
  pendingPlan: { select: { name: true } },
} satisfies Prisma.StoreSubscriptionInclude;

export async function getCurrentSubscription(storeId: string) {
  return prisma.storeSubscription.findFirst({
    where: { storeId, isCurrent: true },
    include: currentSubInclude,
  });
}

export async function getCurrentPlan(storeId: string): Promise<PlanWithEntitlements | null> {
  const sub = await getCurrentSubscription(storeId);
  return sub?.plan ?? null;
}

export async function getSubscriptionStatus(storeId: string, now = new Date()) {
  const sub = await getCurrentSubscription(storeId);
  return effectiveSubscriptionStatus(sub, now);
}

export function isSubscriptionActive(storeIdStatus: string): boolean {
  return canWriteWithSubscription(storeIdStatus);
}

export async function hasFeature(storeId: string, featureKey: string, now = new Date()): Promise<boolean> {
  const sub = await getCurrentSubscription(storeId);
  if (!sub) return false;
  if (!canWriteWithSubscription(effectiveSubscriptionStatus(sub, now))) return false;
  return planAllowsFeature(enabledFeatureKeys(sub.plan), featureKey, planFeaturesRestricted(sub.plan));
}

export async function getFeatureLimit(
  storeId: string,
  resourceKey: string,
): Promise<{ unlimited: boolean; limitValue: number | null } | null> {
  const sub = await getCurrentSubscription(storeId);
  if (!sub) return { unlimited: false, limitValue: 0 };
  const row = sub.plan.limits.find((item) => item.resourceKey === resourceKey);
  if (!row) return { unlimited: true, limitValue: null };
  return { unlimited: row.unlimited, limitValue: row.unlimited ? null : (row.limitValue ?? null) };
}

export async function countResource(storeId: string, resourceKey: string): Promise<number> {
  switch (resourceKey) {
    case LimitResourceKey.WORKERS:
      return prisma.user.count({
        where: { storeId, role: { not: UserRole.PLATFORM_ADMIN } },
      });
    case LimitResourceKey.CUSTOMERS:
      return prisma.customer.count({ where: { storeId, status: 'ACTIVE' } });
    case LimitResourceKey.PRODUCTS:
      return prisma.product.count({ where: { storeId, status: 'ACTIVE' } });
    case LimitResourceKey.SUPPLIERS:
      return prisma.supplier.count({ where: { storeId, status: 'ACTIVE' } });
    case LimitResourceKey.SALES:
      return prisma.sale.count({ where: { storeId, status: { not: 'CANCELLED' } } });
    default:
      return 0;
  }
}

export async function canCreateResource(storeId: string, resourceKey: string): Promise<boolean> {
  const limit = await getFeatureLimit(storeId, resourceKey);
  const used = await countResource(storeId, resourceKey);
  return isWithinLimit(used, limit);
}

export async function getResourceUsage(storeId: string): Promise<ResourceUsageDto[]> {
  const sub = await getCurrentSubscription(storeId);
  const limits = sub ? toPlanLimitDtos(sub.plan) : [];
  const keys = LIMIT_CATALOG.map((item) => item.key);
  return Promise.all(
    keys.map(async (resourceKey) => {
      const configured = limits.find((row) => row.resourceKey === resourceKey);
      return {
        resourceKey,
        name: limitByKey(resourceKey)?.name ?? resourceKey,
        used: await countResource(storeId, resourceKey),
        unlimited: configured ? configured.unlimited : true,
        limitValue: configured ? configured.limitValue : null,
      };
    }),
  );
}

export async function assertCanUseFeature(storeId: string, featureKey: string, now = new Date()): Promise<void> {
  const sub = await getCurrentSubscription(storeId);
  const status = effectiveSubscriptionStatus(sub, now);
  if (!canWriteWithSubscription(status)) {
    throw ApiError.subscriptionRequired();
  }
  if (!planAllowsFeature(enabledFeatureKeys(sub?.plan), featureKey, planFeaturesRestricted(sub?.plan))) {
    throw ApiError.featureNotIncluded();
  }
}

export async function assertCanCreateResource(storeId: string, resourceKey: string): Promise<void> {
  const limit = await getFeatureLimit(storeId, resourceKey);
  const used = await countResource(storeId, resourceKey);
  if (!isWithinLimit(used, limit)) {
    throw ApiError.resourceLimitReached(resourceKey, limit?.limitValue ?? 0);
  }
}

export { planEntitlementInclude };
