import {
  AuditEntityType,
  AuditEventType,
  PlatformBillingStatus,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  effectiveSubscriptionStatus,
  type RequestStoreSubscriptionBody,
  type StoreBillingPaymentsResponse,
  type StoreBillingRequestsResponse,
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
import {
  invoiceInclude,
  provisionStoreSubscription,
  requestInclude,
  toInvoiceDto,
  toRequestDto,
  toSubscriptionDto,
} from './platform-billing.service.js';

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

  let created;
  try {
    created = await prisma.subscriptionRequest.create({
      data: {
        storeId: actor.storeId,
        planId: plan.id,
        fromPlanId: sub.planId,
        fromPlanName: sub.plan.name,
        requestedPriceSnapshot: plan.monthlyPrice,
        currency: plan.currency,
        status: SubscriptionRequestStatus.PENDING,
        note: body.note?.trim() || null,
      },
      include: requestInclude,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict("Sizda allaqachon kutilayotgan obuna so'rovi bor");
    }
    throw error;
  }

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

  return toRequestDto(created);
}

/**
 * The store's own subscription-change requests, newest first.
 *
 * Scoped to `actor.storeId` from the session — a shop can never pass another
 * store's id and read its requests.
 */
export async function listMySubscriptionRequests(
  actor: { storeId: string },
): Promise<StoreBillingRequestsResponse> {
  const items = await prisma.subscriptionRequest.findMany({
    where: { storeId: actor.storeId },
    include: requestInclude,
    orderBy: { requestedAt: 'desc' },
    take: 50,
  });
  return { items: items.map(toRequestDto) };
}

/**
 * The store's own subscription payment history.
 *
 * `totalPaid` counts PAID invoices only, so a pending or rejected request never
 * inflates what the shop believes it has paid.
 */
export async function listMyPayments(
  actor: { storeId: string },
): Promise<StoreBillingPaymentsResponse> {
  const [rows, paidAgg] = await Promise.all([
    prisma.platformInvoice.findMany({
      where: { storeId: actor.storeId },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.platformInvoice.aggregate({
      where: { storeId: actor.storeId, status: PlatformBillingStatus.PAID },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);
  const lastPaid = rows.find((row) => row.status === PlatformBillingStatus.PAID && row.paidAt);
  return {
    totalPaid: money(paidAgg._sum.amount ?? 0n),
    paidCount: paidAgg._count._all,
    lastPaymentAt: lastPaid?.paidAt?.toISOString() ?? null,
    items: rows.map(toInvoiceDto),
  };
}

/**
 * Withdraw a request the shop has not been answered on yet.
 *
 * Soft transition to CANCELLED, never a delete: the history of what was asked
 * for and when has to survive. Only the owning store may cancel, and only while
 * the request is still PENDING.
 */
export async function cancelMySubscriptionRequest(
  actor: { id: string; storeId: string },
  requestId: string,
): Promise<SubscriptionRequestDto> {
  const existing = await prisma.subscriptionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, storeId: true, status: true, planId: true },
  });
  // Same 404 for "not yours" as for "does not exist": a shop must not be able to
  // probe whether another store's request id is real.
  if (!existing || existing.storeId !== actor.storeId) {
    throw ApiError.notFound("So'rov topilmadi");
  }
  const claimed = await prisma.subscriptionRequest.updateMany({
    where: { id: requestId, status: SubscriptionRequestStatus.PENDING },
    data: { status: SubscriptionRequestStatus.CANCELLED, reviewedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw ApiError.conflict("Bu so'rov allaqachon ko'rib chiqilgan");
  }
  await prisma.storeSubscription.updateMany({
    where: { storeId: actor.storeId, isCurrent: true, pendingPlanId: existing.planId },
    data: { pendingPlanId: null },
  });
  const updated = await prisma.subscriptionRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: requestInclude,
  });
  await recordAudit({
    storeId: actor.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_REQUEST_REJECTED,
    entityType: AuditEntityType.SUBSCRIPTION_REQUEST,
    entityId: requestId,
    summary: `Subscription request cancelled by store`,
    metadata: { planId: existing.planId, cancelledBy: 'store' },
  });
  return toRequestDto(updated);
}
