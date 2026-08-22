import {
  AuditEntityType,
  AuditEventType,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  effectiveSubscriptionStatus,
  type RequestStoreSubscriptionBody,
  type StoreSubscriptionDto,
  type SubscriptionPlanDto,
  type SubscriptionRequestDto,
} from '@furniture-erp/shared';

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import {
  getCurrentSubscription,
  getResourceUsage,
  planEntitlementInclude,
  toPlanDto,
} from './entitlement.service.js';
import { provisionStoreSubscription, toSubscriptionDto } from './platform-billing.service.js';

function money(value: bigint): number {
  return Number(value);
}

export async function listStorePlans(): Promise<{ items: SubscriptionPlanDto[] }> {
  const items = await prisma.subscriptionPlan.findMany({
    where: { isActive: true, isDefaultTrial: false },
    include: planEntitlementInclude,
    orderBy: { monthlyPrice: 'asc' },
  });
  return { items: items.map(toPlanDto) };
}

export async function getStoreSubscription(storeId: string): Promise<StoreSubscriptionDto | null> {
  await provisionStoreSubscription(storeId);
  const sub = await getCurrentSubscription(storeId);
  if (!sub) return null;
  const usage = await getResourceUsage(storeId);
  return toSubscriptionDto({ ...sub, usage });
}

export async function markTrialWelcomeSeen(storeId: string): Promise<StoreSubscriptionDto> {
  const sub = await getCurrentSubscription(storeId);
  if (!sub) throw ApiError.notFound('Obuna topilmadi');
  if (sub.trialWelcomeSeenAt) {
    const usage = await getResourceUsage(storeId);
    return toSubscriptionDto({ ...sub, usage });
  }
  const updated = await prisma.storeSubscription.update({
    where: { id: sub.id },
    data: { trialWelcomeSeenAt: new Date() },
    include: { plan: { include: planEntitlementInclude }, pendingPlan: true },
  });
  const usage = await getResourceUsage(storeId);
  return toSubscriptionDto({ ...updated, usage });
}

export async function requestStoreSubscription(
  actor: { id: string; storeId: string },
  body: RequestStoreSubscriptionBody,
): Promise<SubscriptionRequestDto> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.isActive) throw ApiError.notFound('Tarif topilmadi yoki faol emas');
  if (plan.isDefaultTrial) {
    throw ApiError.badRequest('Sinov tarifiga obuna bo‘lib bo‘lmaydi');
  }

  await provisionStoreSubscription(actor.storeId);
  const sub = await getCurrentSubscription(actor.storeId);
  if (!sub) throw ApiError.notFound('Obuna topilmadi');

  const pending = await prisma.subscriptionRequest.findFirst({
    where: { storeId: actor.storeId, status: SubscriptionRequestStatus.PENDING },
  });
  if (pending) {
    throw ApiError.conflict("Sizda allaqachon kutilayotgan obuna so'rovi bor");
  }

  const created = await prisma.subscriptionRequest.create({
    data: {
      storeId: actor.storeId,
      planId: plan.id,
      requestedPriceSnapshot: plan.monthlyPrice,
      currency: plan.currency,
      status: SubscriptionRequestStatus.PENDING,
      note: body.note?.trim() || null,
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          phone: true,
          users: {
            where: { role: 'ADMIN' },
            take: 1,
            select: { fullName: true, phone: true },
          },
          subscriptions: {
            where: { isCurrent: true },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
      },
      plan: { select: { id: true, name: true } },
      reviewedBy: { select: { fullName: true } },
    },
  });

  const effective = effectiveSubscriptionStatus(sub);
  if (effective !== SubscriptionStatus.TRIAL && effective !== SubscriptionStatus.ACTIVE) {
    await prisma.storeSubscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.PENDING_PAYMENT, pendingPlanId: plan.id },
    });
  } else {
    await prisma.storeSubscription.update({
      where: { id: sub.id },
      data: { pendingPlanId: plan.id },
    });
  }

  await recordAudit({
    storeId: actor.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_REQUEST_CREATED,
    entityType: AuditEntityType.SUBSCRIPTION_REQUEST,
    entityId: created.id,
    summary: `Subscription requested: ${plan.name}`,
    metadata: { planId: plan.id, amount: money(plan.monthlyPrice), priceSnapshot: money(plan.monthlyPrice) },
  });

  const owner = created.store.users[0];
  const current = created.store.subscriptions[0];
  return {
    id: created.id,
    storeId: created.storeId,
    storeName: created.store.name,
    ownerName: owner?.fullName ?? null,
    ownerPhone: owner?.phone ?? created.store.phone,
    planId: created.planId,
    planName: created.plan.name,
    currentPlanName: current?.plan.name ?? null,
    currentStatus: current ? effectiveSubscriptionStatus(current) : null,
    requestedPriceSnapshot: money(created.requestedPriceSnapshot),
    currency: created.currency,
    status: created.status,
    requestedAt: created.requestedAt.toISOString(),
    reviewedAt: null,
    reviewedByName: null,
    rejectionReason: null,
    note: created.note,
    createdInvoiceId: null,
    createdSubscriptionId: null,
  };
}
