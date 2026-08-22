import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_TRIAL_FEATURE_KEYS,
  FEATURE_CATALOG,
  LimitResourceKey,
  PlatformBillingStatus,
  PlatformExpenseStatus,
  STARTER_FEATURE_KEYS,
  StoreAccessStatus,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  UserRole,
  addCalendarDays,
  addMonthsClamped,
  calendarDaysBetween,
  canWriteWithSubscription,
  computePlatformNetProfit,
  effectiveSubscriptionStatus,
  isDueDateOverdue,
  monthKey,
  trialDaysRemaining,
  type ApproveSubscriptionRequestBody,
  type AssignStorePlanBody,
  type CreatePlatformExpenseBody,
  type CreateSubscriptionPlanBody,
  type ManualActivateSubscriptionBody,
  type PlatformAnalyticsResponse,
  type PlatformDashboardResponse,
  type PlatformExpenseDto,
  type PlatformInvoiceDto,
  type PlatformInvoiceListQuery,
  type PlatformInvoiceListResponse,
  type PlatformPnlResponse,
  type PlatformSettingsDto,
  type PlatformShopDetail,
  type PlatformShopListResponse,
  type PlatformShopSummary,
  type RecordPlatformPaymentBody,
  type RejectPlatformPaymentBody,
  type StoreAccessStatusResponse,
  type StoreSubscriptionDto,
  type SubscriptionPlanDto,
  type SubscriptionRequestDto,
  type UpdatePlatformExpenseBody,
  type UpdatePlatformSettingsBody,
  type UpdateSubscriptionPlanBody,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import {
  attachDefaultEntitlements,
  enabledFeatureKeys,
  ensureFeatureCatalog,
  getCurrentSubscription,
  getResourceUsage,
  planEntitlementInclude,
  planFeaturesRestricted,
  toPlanDto,
  toPlanLimitDtos,
  syncPlanEntitlements,
  type PlanWithEntitlements,
} from './entitlement.service.js';
import { assertCanReviewStoreCreationRequests } from './platform-authorization.js';

const SETTINGS_ID = 'platform';

function money(value: bigint): number {
  return Number(value);
}

function assertPlatform(role: string): void {
  assertCanReviewStoreCreationRequests(role);
}

const TENANT_STORE_WHERE = { users: { some: { role: UserRole.ADMIN } } } as const;

async function getSettingsRow() {
  return prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, updatedAt: new Date() },
    update: {},
  });
}

function daysOverdue(dueDate: Date, status: string, now = new Date()): number {
  if (
    status === PlatformBillingStatus.PAID ||
    status === PlatformBillingStatus.CANCELLED ||
    status === PlatformBillingStatus.REJECTED
  ) {
    return 0;
  }
  const days = calendarDaysBetween(dueDate, now);
  return days > 0 ? days : 0;
}

const invoiceInclude = {
  store: {
    select: {
      id: true,
      name: true,
      phone: true,
      users: {
        where: { role: UserRole.ADMIN },
        take: 1,
        select: { fullName: true, phone: true },
      },
    },
  },
  recordedBy: { select: { fullName: true } },
} satisfies Prisma.PlatformInvoiceInclude;

function toInvoiceDto(
  row: Prisma.PlatformInvoiceGetPayload<{ include: typeof invoiceInclude }>,
): PlatformInvoiceDto {
  const owner = row.store.users[0];
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: row.store.name,
    ownerName: owner?.fullName ?? null,
    ownerPhone: owner?.phone ?? row.store.phone,
    subscriptionId: row.subscriptionId,
    planId: row.planId,
    planName: row.planName,
    amount: money(row.amount),
    currency: row.currency,
    billingPeriodStart: row.billingPeriodStart.toISOString(),
    billingPeriodEnd: row.billingPeriodEnd.toISOString(),
    dueDate: row.dueDate.toISOString(),
    status: row.status as PlatformInvoiceDto['status'],
    paidAt: row.paidAt?.toISOString() ?? null,
    paymentMethod: row.paymentMethod as PlatformInvoiceDto['paymentMethod'],
    reference: row.reference,
    note: row.note,
    durationMonths: row.durationMonths,
    rejectionReason: row.rejectionReason,
    daysOverdue: daysOverdue(row.dueDate, row.status),
    recordedByName: row.recordedBy?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function syncBillingStatuses(now = new Date()): Promise<void> {
  const open = await prisma.platformInvoice.findMany({
    where: { status: { in: [PlatformBillingStatus.PENDING, PlatformBillingStatus.OVERDUE] } },
    include: { subscription: true, store: { select: { id: true, accessStatus: true } } },
  });

  for (const invoice of open) {
    if (invoice.status === PlatformBillingStatus.PENDING && isDueDateOverdue(invoice.dueDate, now)) {
      await prisma.platformInvoice.update({
        where: { id: invoice.id },
        data: { status: PlatformBillingStatus.OVERDUE },
      });
    }
  }

  const subscriptions = await prisma.storeSubscription.findMany({
    where: {
      isCurrent: true,
      status: {
        in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      },
    },
  });

  for (const sub of subscriptions) {
    const effective = effectiveSubscriptionStatus(sub, now);
    if (effective !== sub.status && effective === SubscriptionStatus.EXPIRED) {
      await prisma.storeSubscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      await recordAudit({
        storeId: sub.storeId,
        actorUserId: null,
        eventType: AuditEventType.SUBSCRIPTION_EXPIRED,
        entityType: AuditEntityType.STORE_SUBSCRIPTION,
        entityId: sub.id,
        summary: 'Subscription expired',
        metadata: { previousStatus: sub.status },
      });
    }
  }
}

async function loadPlan(id: string): Promise<PlanWithEntitlements | null> {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: planEntitlementInclude,
  });
}

export async function listPlans(actorRole: string): Promise<{ items: SubscriptionPlanDto[] }> {
  assertPlatform(actorRole);
  await ensureFeatureCatalog();
  const items = await prisma.subscriptionPlan.findMany({
    include: planEntitlementInclude,
    orderBy: { monthlyPrice: 'asc' },
  });
  return { items: items.map(toPlanDto) };
}

export async function createPlan(
  actor: { id: string; role: string; storeId: string },
  body: CreateSubscriptionPlanBody,
): Promise<SubscriptionPlanDto> {
  assertPlatform(actor.role);
  await ensureFeatureCatalog();
  const name = body.name.trim();
  if (!name) throw ApiError.validation("Tarif nomini kiriting", [{ field: 'name', message: "Tarif nomini kiriting" }]);
  if (!Number.isInteger(body.monthlyPrice) || body.monthlyPrice < 0) {
    throw ApiError.validation("Narx noto'g'ri", [{ field: 'monthlyPrice', message: "Narx butun so'm bo'lsin" }]);
  }
  try {
    if (body.isDefaultTrial) {
      await prisma.subscriptionPlan.updateMany({ data: { isDefaultTrial: false } });
    }
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description: body.description?.trim() ?? '',
        monthlyPrice: BigInt(body.monthlyPrice),
        currency: body.currency?.trim() || 'UZS',
        trialDays: body.trialDays ?? 0,
        isDefaultTrial: body.isDefaultTrial ?? false,
        features: (body.features ?? {}) as Prisma.InputJsonValue,
      },
    });
    await syncPlanEntitlements(plan.id, {
      featureKeys: body.featureKeys,
      limits: body.limits,
    });
    await recordAudit({
      storeId: null,
      actorUserId: actor.id,
      eventType: AuditEventType.SUBSCRIPTION_PLAN_CREATED,
      entityType: AuditEntityType.SUBSCRIPTION_PLAN,
      entityId: plan.id,
      summary: `Plan created: ${plan.name}`,
      metadata: { name: plan.name, monthlyPrice: body.monthlyPrice },
    });
    const loaded = await loadPlan(plan.id);
    return toPlanDto(loaded!);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict('Bu tarif nomi allaqachon mavjud');
    }
    throw error;
  }
}

export async function updatePlan(
  actor: { id: string; role: string },
  planId: string,
  body: UpdateSubscriptionPlanBody,
): Promise<SubscriptionPlanDto> {
  assertPlatform(actor.role);
  await ensureFeatureCatalog();
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!existing) throw ApiError.notFound('Tarif topilmadi');

  if (body.isDefaultTrial) {
    await prisma.subscriptionPlan.updateMany({
      where: { id: { not: planId } },
      data: { isDefaultTrial: false },
    });
  }

  await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() } : {}),
      ...(body.monthlyPrice !== undefined ? { monthlyPrice: BigInt(body.monthlyPrice) } : {}),
      ...(body.trialDays !== undefined ? { trialDays: body.trialDays } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.isDefaultTrial !== undefined ? { isDefaultTrial: body.isDefaultTrial } : {}),
      ...(body.features !== undefined ? { features: body.features as Prisma.InputJsonValue } : {}),
    },
  });
  await syncPlanEntitlements(planId, {
    featureKeys: body.featureKeys,
    limits: body.limits,
  });
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_PLAN_UPDATED,
    entityType: AuditEntityType.SUBSCRIPTION_PLAN,
    entityId: planId,
    summary: `Plan updated: ${existing.name}`,
    metadata: { isActive: body.isActive ?? existing.isActive },
  });
  const loaded = await loadPlan(planId);
  return toPlanDto(loaded!);
}

export async function getDefaultPlan() {
  const trial = await prisma.subscriptionPlan.findFirst({
    where: { isDefaultTrial: true, isActive: true },
  });
  if (trial) return trial;
  const named = await prisma.subscriptionPlan.findFirst({
    where: { name: env.SEED_DEFAULT_PLAN_NAME, isActive: true },
  });
  if (named) return named;
  return prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
}

export async function provisionStoreSubscription(storeId: string, now = new Date()): Promise<void> {
  const existing = await prisma.storeSubscription.findFirst({ where: { storeId, isCurrent: true } });
  if (existing) return;
  const plan = await getDefaultPlan();
  if (!plan) return;
  const trialDays = plan.trialDays > 0 ? plan.trialDays : env.TRIAL_DAYS;
  const trialEnd = addCalendarDays(now, trialDays);
  await prisma.storeSubscription.create({
    data: {
      storeId,
      planId: plan.id,
      status: SubscriptionStatus.TRIAL,
      isCurrent: true,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      nextPaymentDue: trialEnd,
      trialStartedAt: now,
      trialEndsAt: trialEnd,
    },
  });
  await recordAudit({
    storeId,
    actorUserId: null,
    eventType: AuditEventType.SUBSCRIPTION_TRIAL_STARTED,
    entityType: AuditEntityType.STORE_SUBSCRIPTION,
    entityId: storeId,
    summary: `Trial started (${trialDays} days)`,
    metadata: { planId: plan.id, trialEndsAt: trialEnd.toISOString() },
  });
}

export async function assignPlan(
  actor: { id: string; role: string },
  storeId: string,
  body: AssignStorePlanBody,
): Promise<StoreSubscriptionDto> {
  assertPlatform(actor.role);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.isActive) throw ApiError.notFound('Tarif topilmadi yoki faol emas');
  await provisionStoreSubscription(storeId);
  const sub = await prisma.storeSubscription.findFirst({ where: { storeId, isCurrent: true } });
  if (!sub) throw ApiError.notFound("Obuna topilmadi");

  const updated = await prisma.storeSubscription.update({
    where: { id: sub.id },
    data: { pendingPlanId: plan.id },
    include: { plan: { include: planEntitlementInclude }, pendingPlan: true },
  });
  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_ASSIGNED,
    entityType: AuditEntityType.STORE_SUBSCRIPTION,
    entityId: updated.id,
    summary: `Next-period plan: ${plan.name}`,
    metadata: { planId: plan.id, applies: 'next_period' },
  });
  return toSubscriptionDto(updated);
}

export function toSubscriptionDto(sub: {
  id: string;
  storeId: string;
  planId: string;
  status: SubscriptionStatus;
  isCurrent?: boolean;
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentDue: Date;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialWelcomeSeenAt: Date | null;
  pendingPlanId: string | null;
  cancelledAt: Date | null;
  endedAt?: Date | null;
  plan: PlanWithEntitlements;
  pendingPlan: { name: string } | null;
  usage?: StoreSubscriptionDto['usage'];
}): StoreSubscriptionDto {
  const effective = effectiveSubscriptionStatus(sub);
  const featureKeys = enabledFeatureKeys(sub.plan);
  return {
    id: sub.id,
    storeId: sub.storeId,
    planId: sub.planId,
    planName: sub.plan.name,
    monthlyPrice: money(sub.plan.monthlyPrice),
    currency: sub.plan.currency,
    status: effective,
    storedStatus: sub.status,
    startedAt: sub.startedAt.toISOString(),
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    expiresAt: sub.currentPeriodEnd.toISOString(),
    nextPaymentDue: sub.nextPaymentDue.toISOString(),
    trialStartedAt: sub.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    trialWelcomeSeenAt: sub.trialWelcomeSeenAt?.toISOString() ?? null,
    pendingPlanId: sub.pendingPlanId,
    pendingPlanName: sub.pendingPlan?.name ?? null,
    cancelledAt: sub.cancelledAt?.toISOString() ?? null,
    endedAt: sub.endedAt?.toISOString() ?? null,
    isCurrent: sub.isCurrent ?? true,
    canWrite: canWriteWithSubscription(effective),
    daysRemaining:
      effective === SubscriptionStatus.TRIAL
        ? trialDaysRemaining(sub.trialEndsAt)
        : Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86_400_000)),
    featureKeys,
    featuresRestricted: planFeaturesRestricted(sub.plan),
    enabledFeatures: toPlanDto(sub.plan).enabledFeatures,
    limits: toPlanLimitDtos(sub.plan),
    usage: sub.usage ?? [],
  };
}

export async function listInvoices(
  actorRole: string,
  query: PlatformInvoiceListQuery,
): Promise<PlatformInvoiceListResponse> {
  assertPlatform(actorRole);
  await syncBillingStatuses();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.PlatformInvoiceWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.storeId) where.storeId = query.storeId;
  if (query.planId) where.planId = query.planId;
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    if (year && month) {
      where.dueDate = {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      };
    }
  }
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { store: { name: { contains: q, mode: 'insensitive' } } },
      { store: { phone: { contains: q, mode: 'insensitive' } } },
      { store: { users: { some: { fullName: { contains: q, mode: 'insensitive' } } } } },
      { store: { users: { some: { phone: { contains: q, mode: 'insensitive' } } } } },
    ];
  }

  const [rows, totalItems, amountAgg, storeGroups] = await Promise.all([
    prisma.platformInvoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { dueDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.platformInvoice.count({ where }),
    prisma.platformInvoice.aggregate({ where, _sum: { amount: true } }),
    prisma.platformInvoice.groupBy({ by: ['storeId'], where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    items: rows.map(toInvoiceDto),
    totalAmount: money(amountAgg._sum.amount ?? 0n),
    storeCount: storeGroups.length,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

type BillingTx = Prisma.TransactionClient;

async function activatePaidPeriod(
  tx: BillingTx,
  input: {
    storeId: string;
    planId: string;
    start: Date;
    end: Date;
  },
): Promise<{ id: string }> {
  const current = await tx.storeSubscription.findFirst({
    where: { storeId: input.storeId, isCurrent: true },
  });
  if (current) {
    await tx.storeSubscription.update({
      where: { id: current.id },
      data: {
        isCurrent: false,
        endedAt: input.start,
        pendingPlanId: null,
        status:
          current.status === SubscriptionStatus.TRIAL
            ? SubscriptionStatus.EXPIRED
            : current.status === SubscriptionStatus.CANCELLED
              ? SubscriptionStatus.CANCELLED
              : SubscriptionStatus.EXPIRED,
      },
    });
  }
  return tx.storeSubscription.create({
    data: {
      storeId: input.storeId,
      planId: input.planId,
      status: SubscriptionStatus.ACTIVE,
      isCurrent: true,
      startedAt: input.start,
      currentPeriodStart: input.start,
      currentPeriodEnd: input.end,
      nextPaymentDue: input.end,
      pendingPlanId: null,
    },
    select: { id: true },
  });
}

export async function recordPayment(
  actor: { id: string; role: string },
  invoiceId: string,
  body: RecordPlatformPaymentBody,
): Promise<PlatformInvoiceDto> {
  assertPlatform(actor.role);
  const paidAt = new Date(body.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    throw ApiError.validation("To'lov sanasi noto'g'ri", [{ field: 'paidAt', message: "To'lov sanasi noto'g'ri" }]);
  }

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.platformInvoice.findUnique({
      where: { id: invoiceId },
      include: { store: true, subscription: true },
    });
    if (!invoice) throw ApiError.notFound("To'lov topilmadi");
    if (invoice.status === PlatformBillingStatus.PAID) {
      throw ApiError.conflict("Bu billing allaqachon to'langan");
    }
    if (invoice.status === PlatformBillingStatus.CANCELLED || invoice.status === PlatformBillingStatus.REJECTED) {
      throw ApiError.conflict('Bekor qilingan billingni to‘lab bo‘lmaydi');
    }

    const months = invoice.durationMonths > 0 ? invoice.durationMonths : 1;
    const periodEnd = addMonthsClamped(paidAt, months);
    const next = await activatePaidPeriod(tx, {
      storeId: invoice.storeId,
      planId: invoice.planId,
      start: paidAt,
      end: periodEnd,
    });

    const updated = await tx.platformInvoice.update({
      where: { id: invoice.id },
      data: {
        status: PlatformBillingStatus.PAID,
        paidAt,
        paymentMethod: body.paymentMethod,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        recordedById: actor.id,
        subscriptionId: next.id,
        billingPeriodStart: paidAt,
        billingPeriodEnd: periodEnd,
      },
      include: invoiceInclude,
    });

    if (invoice.store.accessStatus !== StoreAccessStatus.MANUALLY_BLOCKED) {
      await tx.store.update({
        where: { id: invoice.storeId },
        data: { accessStatus: StoreAccessStatus.ACTIVE, isActive: true },
      });
    }

    return {
      updated,
      unblocked:
        invoice.store.accessStatus !== StoreAccessStatus.MANUALLY_BLOCKED &&
        invoice.store.accessStatus !== StoreAccessStatus.ACTIVE,
    };
  });

  await recordAudit({
    storeId: result.updated.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_PAYMENT_APPROVED,
    entityType: AuditEntityType.PLATFORM_INVOICE,
    entityId: result.updated.id,
    summary: `Payment approved: ${result.updated.store.name}`,
    metadata: { amount: money(result.updated.amount), method: body.paymentMethod },
  });

  await recordAudit({
    storeId: result.updated.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_PAYMENT_RECORDED,
    entityType: AuditEntityType.PLATFORM_INVOICE,
    entityId: result.updated.id,
    summary: `Payment recorded: ${result.updated.store.name}`,
    metadata: { amount: money(result.updated.amount), method: body.paymentMethod },
  });

  if (result.unblocked) {
    await recordAudit({
      storeId: result.updated.storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STORE_UNBLOCKED,
      entityType: AuditEntityType.STORE,
      entityId: result.updated.storeId,
      summary: `Store unblocked after payment: ${result.updated.store.name}`,
      metadata: { reason: 'payment' },
    });
  }

  return toInvoiceDto(result.updated);
}

export async function rejectPayment(
  actor: { id: string; role: string },
  invoiceId: string,
  body: RejectPlatformPaymentBody,
): Promise<PlatformInvoiceDto> {
  assertPlatform(actor.role);
  const reason = body.reason.trim();
  if (reason.length < 3) {
    throw ApiError.validation('Rad etish sababi kerak', [
      { field: 'reason', message: 'Kamida 3 ta belgi kiriting' },
    ]);
  }

  const invoice = await prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw ApiError.notFound("To'lov topilmadi");
  if (invoice.status === PlatformBillingStatus.PAID) {
    throw ApiError.conflict("To'langan so'rovni rad etib bo'lmaydi");
  }
  if (invoice.status === PlatformBillingStatus.REJECTED || invoice.status === PlatformBillingStatus.CANCELLED) {
    throw ApiError.conflict("Bu so'rov allaqachon yopilgan");
  }

  const updated = await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: {
      status: PlatformBillingStatus.REJECTED,
      rejectionReason: reason,
      recordedById: actor.id,
    },
    include: invoiceInclude,
  });

  await recordAudit({
    storeId: updated.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_PAYMENT_REJECTED,
    entityType: AuditEntityType.PLATFORM_INVOICE,
    entityId: updated.id,
    summary: `Payment request rejected: ${updated.store.name}`,
    metadata: { reasonLength: reason.length },
  });

  return toInvoiceDto(updated);
}

export async function activateSubscriptionManually(
  actor: { id: string; role: string },
  storeId: string,
  body: ManualActivateSubscriptionBody,
): Promise<StoreSubscriptionDto> {
  assertPlatform(actor.role);
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: body.planId },
    include: planEntitlementInclude,
  });
  if (!plan || !plan.isActive) throw ApiError.notFound('Tarif topilmadi yoki faol emas');
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw ApiError.validation('Sana oralig‘i noto‘g‘ri');
  }
  await provisionStoreSubscription(storeId, start);
  const created = await prisma.$transaction(async (tx) => {
    const next = await activatePaidPeriod(tx, {
      storeId,
      planId: plan.id,
      start,
      end,
    });
    return tx.storeSubscription.findUniqueOrThrow({
      where: { id: next.id },
      include: { plan: { include: planEntitlementInclude }, pendingPlan: true },
    });
  });

  await prisma.store.update({
    where: { id: storeId },
    data: { accessStatus: StoreAccessStatus.ACTIVE, isActive: true },
  });

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_MANUALLY_ACTIVATED,
    entityType: AuditEntityType.STORE_SUBSCRIPTION,
    entityId: created.id,
    summary: `Manual activation: ${plan.name}`,
    metadata: { planId: plan.id, start: start.toISOString(), end: end.toISOString() },
  });
  return toSubscriptionDto(created);
}

export async function setManualBlock(
  actor: { id: string; role: string },
  storeId: string,
  blocked: boolean,
): Promise<PlatformShopSummary> {
  assertPlatform(actor.role);
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw ApiError.notFound("Do'kon topilmadi");

  if (blocked) {
    await prisma.store.update({
      where: { id: storeId },
      data: { accessStatus: StoreAccessStatus.MANUALLY_BLOCKED, isActive: false },
    });
    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STORE_MANUALLY_BLOCKED,
      entityType: AuditEntityType.STORE,
      entityId: storeId,
      summary: `Manual block: ${store.name}`,
      metadata: { reason: 'manual' },
    });
  } else {
    await prisma.store.update({
      where: { id: storeId },
      data: { accessStatus: StoreAccessStatus.ACTIVE, isActive: true },
    });
    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STORE_UNBLOCKED,
      entityType: AuditEntityType.STORE,
      entityId: storeId,
      summary: `Manual unblock: ${store.name}`,
      metadata: { reason: 'manual' },
    });
  }

  const shops = await listShops(actor.role);
  const shop = shops.items.find((item) => item.id === storeId);
  if (!shop) throw ApiError.notFound("Do'kon topilmadi");
  return shop;
}

export async function listShops(actorRole: string): Promise<PlatformShopListResponse> {
  assertPlatform(actorRole);
  await syncBillingStatuses();
  const stores = await prisma.store.findMany({
    where: TENANT_STORE_WHERE,
    orderBy: { createdAt: 'desc' },
    include: {
      subscriptions: { where: { isCurrent: true }, include: { plan: true }, take: 1 },
      subscriptionRequests: {
        where: { status: SubscriptionRequestStatus.PENDING },
        take: 1,
        select: { id: true },
      },
      platformInvoices: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { status: true, paidAt: true },
      },
      users: { where: { role: UserRole.ADMIN }, take: 1, select: { fullName: true, phone: true } },
    },
  });
  return {
    items: stores.map((store) => {
      const sub = store.subscriptions[0];
      const owner = store.users[0];
      const effective = sub ? effectiveSubscriptionStatus(sub) : null;
      const lastPaid = store.platformInvoices.find((row) => row.status === PlatformBillingStatus.PAID);
      return {
        id: store.id,
        name: store.name,
        phone: store.phone,
        address: store.address,
        isActive: store.isActive,
        accessStatus: store.accessStatus,
        planName: sub?.plan.name ?? null,
        monthlyPrice: sub ? money(sub.plan.monthlyPrice) : null,
        nextPaymentDue: sub?.nextPaymentDue.toISOString() ?? null,
        hasPendingPayment:
          (store.subscriptionRequests?.length ?? 0) > 0 ||
          (store.platformInvoices ?? []).some(
            (row) =>
              row.status === PlatformBillingStatus.PENDING || row.status === PlatformBillingStatus.OVERDUE,
          ),
        ownerName: owner?.fullName ?? null,
        ownerPhone: owner?.phone ?? store.phone,
        createdAt: store.createdAt.toISOString(),
        subscriptionStatus: effective,
        trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd.toISOString() ?? null,
        lastPaymentAt: lastPaid?.paidAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function getShopDetail(actorRole: string, storeId: string): Promise<PlatformShopDetail> {
  assertPlatform(actorRole);
  await syncBillingStatuses();
  const shops = await listShops(actorRole);
  const shop = shops.items.find((item) => item.id === storeId);
  if (!shop) throw ApiError.notFound("Do'kon topilmadi");
  const sub = await getCurrentSubscription(storeId);
  const latest = await prisma.platformInvoice.findFirst({
    where: { storeId },
    include: invoiceInclude,
    orderBy: { dueDate: 'desc' },
  });
  return {
    shop,
    subscription: sub ? toSubscriptionDto({ ...sub, usage: await getResourceUsage(storeId) }) : null,
    latestInvoice: latest ? toInvoiceDto(latest) : null,
  };
}

export async function getSettings(actorRole: string): Promise<PlatformSettingsDto> {
  assertPlatform(actorRole);
  const row = await getSettingsRow();
  return {
    platformName: row.platformName,
    defaultCurrency: row.defaultCurrency,
    gracePeriodDays: row.gracePeriodDays,
    billingCycle: row.billingCycle,
    paymentRemindersEnabled: row.paymentRemindersEnabled,
    reminderDaysBeforeDue: row.reminderDaysBeforeDue,
  };
}

export async function updateSettings(
  actor: { id: string; role: string },
  body: UpdatePlatformSettingsBody,
): Promise<PlatformSettingsDto> {
  assertPlatform(actor.role);
  if (body.gracePeriodDays !== undefined && (body.gracePeriodDays < 0 || body.gracePeriodDays > 90)) {
    throw ApiError.validation("Grace period 0–90 kun", [{ field: 'gracePeriodDays', message: '0–90' }]);
  }
  await getSettingsRow();
  const row = await prisma.platformSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      ...(body.platformName !== undefined ? { platformName: body.platformName.trim() } : {}),
      ...(body.defaultCurrency !== undefined ? { defaultCurrency: body.defaultCurrency.trim() } : {}),
      ...(body.gracePeriodDays !== undefined ? { gracePeriodDays: body.gracePeriodDays } : {}),
      ...(body.billingCycle !== undefined ? { billingCycle: body.billingCycle } : {}),
      ...(body.paymentRemindersEnabled !== undefined
        ? { paymentRemindersEnabled: body.paymentRemindersEnabled }
        : {}),
      ...(body.reminderDaysBeforeDue !== undefined
        ? { reminderDaysBeforeDue: body.reminderDaysBeforeDue }
        : {}),
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.PLATFORM_SETTINGS_UPDATED,
    entityType: AuditEntityType.PLATFORM_SETTINGS,
    entityId: SETTINGS_ID,
    summary: 'Platform settings updated',
    metadata: { gracePeriodDays: row.gracePeriodDays },
  });
  return getSettings(actor.role);
}

export async function listExpenses(actorRole: string): Promise<{ items: PlatformExpenseDto[] }> {
  assertPlatform(actorRole);
  const items = await prisma.platformExpense.findMany({
    orderBy: { date: 'desc' },
    include: { createdBy: { select: { fullName: true } } },
  });
  return {
    items: items.map((row) => ({
      id: row.id,
      category: row.category,
      amount: money(row.amount),
      currency: row.currency,
      date: row.date.toISOString(),
      description: row.description,
      vendor: row.vendor,
      reference: row.reference,
      status: row.status,
      createdByName: row.createdBy?.fullName ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function createExpense(
  actor: { id: string; role: string },
  body: CreatePlatformExpenseBody,
): Promise<PlatformExpenseDto> {
  assertPlatform(actor.role);
  if (!Number.isInteger(body.amount) || body.amount <= 0) {
    throw ApiError.validation("Summa noto'g'ri", [{ field: 'amount', message: "Musbat butun so'm" }]);
  }
  const row = await prisma.platformExpense.create({
    data: {
      category: body.category,
      amount: BigInt(body.amount),
      date: new Date(body.date),
      description: body.description?.trim() ?? '',
      vendor: body.vendor?.trim() || null,
      reference: body.reference?.trim() || null,
      createdById: actor.id,
    },
    include: { createdBy: { select: { fullName: true } } },
  });
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.PLATFORM_EXPENSE_CREATED,
    entityType: AuditEntityType.PLATFORM_EXPENSE,
    entityId: row.id,
    summary: `Platform expense: ${row.category}`,
    metadata: { amount: body.amount, category: row.category },
  });
  return {
    id: row.id,
    category: row.category,
    amount: money(row.amount),
    currency: row.currency,
    date: row.date.toISOString(),
    description: row.description,
    vendor: row.vendor,
    reference: row.reference,
    status: row.status,
    createdByName: row.createdBy?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateExpense(
  actor: { id: string; role: string },
  id: string,
  body: UpdatePlatformExpenseBody,
): Promise<PlatformExpenseDto> {
  assertPlatform(actor.role);
  const existing = await prisma.platformExpense.findUnique({ where: { id } });
  if (!existing || existing.status === PlatformExpenseStatus.CANCELLED) {
    throw ApiError.notFound('Xarajat topilmadi');
  }
  await prisma.platformExpense.update({
    where: { id },
    data: {
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.amount !== undefined ? { amount: BigInt(body.amount) } : {}),
      ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() } : {}),
      ...(body.vendor !== undefined ? { vendor: body.vendor.trim() || null } : {}),
      ...(body.reference !== undefined ? { reference: body.reference.trim() || null } : {}),
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.PLATFORM_EXPENSE_UPDATED,
    entityType: AuditEntityType.PLATFORM_EXPENSE,
    entityId: id,
    summary: 'Platform expense updated',
    metadata: { id },
  });
  const items = await listExpenses(actor.role);
  const found = items.items.find((item) => item.id === id);
  if (!found) throw ApiError.notFound('Xarajat topilmadi');
  return found;
}

export async function cancelExpense(actor: { id: string; role: string }, id: string): Promise<PlatformExpenseDto> {
  assertPlatform(actor.role);
  const existing = await prisma.platformExpense.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Xarajat topilmadi');
  await prisma.platformExpense.update({
    where: { id },
    data: {
      status: PlatformExpenseStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: actor.id,
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.PLATFORM_EXPENSE_CANCELLED,
    entityType: AuditEntityType.PLATFORM_EXPENSE,
    entityId: id,
    summary: 'Platform expense cancelled',
    metadata: { id },
  });
  const items = await listExpenses(actor.role);
  const found = items.items.find((item) => item.id === id);
  if (!found) throw ApiError.notFound('Xarajat topilmadi');
  return found;
}

function monthRange(from: Date, to: Date): { start: Date; end: Date } {
  return { start: from, end: to };
}

export async function getPnl(
  actorRole: string,
  from: Date,
  to: Date,
  label: string,
): Promise<PlatformPnlResponse> {
  assertPlatform(actorRole);
  const { start, end } = monthRange(from, to);
  const [paid, expenses] = await Promise.all([
    prisma.platformInvoice.findMany({
      where: { status: PlatformBillingStatus.PAID, paidAt: { gte: start, lte: end } },
    }),
    prisma.platformExpense.findMany({
      where: { status: PlatformExpenseStatus.ACTIVE, date: { gte: start, lte: end } },
    }),
  ]);
  const revenue = paid.reduce((sum, row) => sum + money(row.amount), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + money(row.amount), 0);
  const buckets = new Map<string, { revenue: number; expenses: number }>();
  for (const row of paid) {
    const key = monthKey(row.paidAt ?? row.dueDate);
    const bucket = buckets.get(key) ?? { revenue: 0, expenses: 0 };
    bucket.revenue += money(row.amount);
    buckets.set(key, bucket);
  }
  for (const row of expenses) {
    const key = monthKey(row.date);
    const bucket = buckets.get(key) ?? { revenue: 0, expenses: 0 };
    bucket.expenses += money(row.amount);
    buckets.set(key, bucket);
  }
  const series = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month,
      revenue: values.revenue,
      expenses: values.expenses,
      netProfit: computePlatformNetProfit(values.revenue, values.expenses),
    }));
  return {
    revenue,
    expenses: expenseTotal,
    netProfit: computePlatformNetProfit(revenue, expenseTotal),
    series,
    period: { from: start.toISOString(), to: end.toISOString(), label },
  };
}

export async function getAnalytics(actorRole: string, from: Date, to: Date): Promise<PlatformAnalyticsResponse> {
  assertPlatform(actorRole);
  const finance = await getPnl(actorRole, from, to, 'Analytics');
  const [requests, stores, currentSubs, paidEver, cancelledPaid] = await Promise.all([
    prisma.storeCreationRequest.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, status: true },
    }),
    prisma.store.findMany({
      where: TENANT_STORE_WHERE,
      select: { createdAt: true, accessStatus: true },
    }),
    prisma.storeSubscription.findMany({
      where: { isCurrent: true },
      include: { plan: { select: { name: true, monthlyPrice: true } } },
    }),
    prisma.platformInvoice.count({
      where: { status: PlatformBillingStatus.PAID, paidAt: { gte: from, lte: to } },
    }),
    prisma.storeSubscription.count({
      where: {
        isCurrent: false,
        status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] },
        endedAt: { gte: from, lte: to },
      },
    }),
  ]);
  const submitted = requests.length;
  const approved = requests.filter((row) => row.status === 'APPROVED').length;
  const rejected = requests.filter((row) => row.status === 'REJECTED').length;
  const active = stores.filter((store) => store.accessStatus === StoreAccessStatus.ACTIVE).length;
  const blocked = stores.filter((store) => store.accessStatus !== StoreAccessStatus.ACTIVE).length;

  const storeBuckets = new Map<
    string,
    { submitted: number; approved: number; rejected: number }
  >();
  for (const row of requests) {
    const key = monthKey(row.createdAt);
    const bucket = storeBuckets.get(key) ?? { submitted: 0, approved: 0, rejected: 0 };
    bucket.submitted += 1;
    if (row.status === 'APPROVED') bucket.approved += 1;
    if (row.status === 'REJECTED') bucket.rejected += 1;
    storeBuckets.set(key, bucket);
  }

  const months = new Set([...finance.series.map((point) => point.month), ...storeBuckets.keys()]);
  const series = [...months].sort().map((month) => {
    const bucket = storeBuckets.get(month) ?? { submitted: 0, approved: 0, rejected: 0 };
    return {
      month,
      submitted: bucket.submitted,
      approved: bucket.approved,
      rejected: bucket.rejected,
      active,
      blocked,
    };
  });

  const subStatuses = currentSubs.map((row) => effectiveSubscriptionStatus(row));
  const trial = subStatuses.filter((status) => status === SubscriptionStatus.TRIAL).length;
  const paidActive = subStatuses.filter((status) => status === SubscriptionStatus.ACTIVE).length;
  const expired = subStatuses.filter((status) => status === SubscriptionStatus.EXPIRED).length;
  const pendingPayment = subStatuses.filter((status) => status === SubscriptionStatus.PENDING_PAYMENT).length;
  const byPlanMap = new Map<string, number>();
  for (const row of currentSubs) {
    byPlanMap.set(row.plan.name, (byPlanMap.get(row.plan.name) ?? 0) + 1);
  }
  const mrr = currentSubs
    .filter((row) => effectiveSubscriptionStatus(row) === SubscriptionStatus.ACTIVE)
    .reduce((sum, row) => sum + money(row.plan.monthlyPrice), 0);

  return {
    stores: {
      submitted,
      approved,
      rejected,
      active,
      blocked,
      trial,
      paidActive,
      expired,
      pendingPayment,
      series,
    },
    finance,
    subscriptions: {
      trial,
      active: paidActive,
      expired,
      pendingPayment,
      byPlan: [...byPlanMap.entries()].map(([planName, storeCount]) => ({ planName, storeCount })),
      monthlyRevenue: mrr,
      trialToPaid: paidEver,
      churned: cancelledPaid,
    },
  };
}

export async function getDashboard(actorRole: string): Promise<PlatformDashboardResponse> {
  assertPlatform(actorRole);
  await syncBillingStatuses();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const pnl = await getPnl(actorRole, monthStart, monthEnd, 'Shu oy');
  const analytics = await getAnalytics(actorRole, monthStart, monthEnd);
  const [stores, pendingRequests, pending, overdue, latestPayments, latestRequests] = await Promise.all([
    prisma.store.findMany({
      where: TENANT_STORE_WHERE,
      select: {
        accessStatus: true,
        subscriptions: {
          where: { isCurrent: true },
          take: 1,
          select: {
            status: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
          },
        },
      },
    }),
    prisma.storeCreationRequest.count({ where: { status: 'PENDING' } }),
    prisma.platformInvoice.findMany({ where: { status: PlatformBillingStatus.PENDING } }),
    prisma.platformInvoice.findMany({ where: { status: PlatformBillingStatus.OVERDUE } }),
    prisma.platformInvoice.findMany({
      where: { status: PlatformBillingStatus.PAID },
      include: invoiceInclude,
      orderBy: { paidAt: 'desc' },
      take: 5,
    }),
    prisma.storeCreationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, storeName: true, status: true, createdAt: true },
    }),
  ]);
  const statuses = stores.map((store) =>
    store.subscriptions[0]
      ? effectiveSubscriptionStatus(store.subscriptions[0])
      : SubscriptionStatus.EXPIRED,
  );
  return {
    totalStores: stores.length,
    activeStores: stores.filter((store) => store.accessStatus === StoreAccessStatus.ACTIVE).length,
    blockedStores: stores.filter((store) => store.accessStatus === StoreAccessStatus.MANUALLY_BLOCKED)
      .length,
    trialStores: statuses.filter((status) => status === SubscriptionStatus.TRIAL).length,
    activeSubscriptions: statuses.filter((status) => status === SubscriptionStatus.ACTIVE).length,
    pendingPaymentStores: statuses.filter((status) => status === SubscriptionStatus.PENDING_PAYMENT)
      .length,
    expiredStores: statuses.filter((status) => status === SubscriptionStatus.EXPIRED).length,
    pendingStoreRequests: pendingRequests,
    pendingPayments: pending.length,
    pendingPaymentAmount: pending.reduce((sum, row) => sum + money(row.amount), 0),
    overduePayments: overdue.length,
    overduePaymentAmount: overdue.reduce((sum, row) => sum + money(row.amount), 0),
    monthRevenue: pnl.revenue,
    monthExpenses: pnl.expenses,
    monthNetProfit: pnl.netProfit,
    pnlSeries: pnl.series,
    storeSeries: analytics.stores.series,
    latestPayments: latestPayments.map(toInvoiceDto),
    latestStoreRequests: latestRequests.map((row) => ({
      id: row.id,
      storeName: row.storeName,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getStoreAccessStatus(storeId: string): Promise<StoreAccessStatusResponse> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      subscriptions: { where: { isCurrent: true }, include: { plan: true }, take: 1 },
      platformInvoices: {
        where: { status: { in: [PlatformBillingStatus.PENDING, PlatformBillingStatus.OVERDUE] } },
        orderBy: { dueDate: 'asc' },
      },
    },
  });
  if (!store) throw ApiError.notFound("Do'kon topilmadi");
  const outstanding = store.platformInvoices.reduce((sum, row) => sum + money(row.amount), 0);
  const first = store.platformInvoices[0];
  return {
    storeName: store.name,
    accessStatus: store.accessStatus,
    planName: store.subscriptions[0]?.plan.name ?? null,
    outstandingAmount: outstanding,
    dueDate: first?.dueDate.toISOString() ?? null,
    daysOverdue: first ? daysOverdue(first.dueDate, first.status) : 0,
  };
}

export async function seedDefaultPlansAndBackfill(): Promise<void> {
  await ensureFeatureCatalog();

  const trialPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Bepul sinov' },
    update: {
      monthlyPrice: 0n,
      trialDays: env.TRIAL_DAYS,
      isDefaultTrial: true,
      isActive: true,
      description: 'Yangi do‘konlar uchun 7 kunlik bepul sinov',
    },
    create: {
      name: 'Bepul sinov',
      description: 'Yangi do‘konlar uchun 7 kunlik bepul sinov',
      monthlyPrice: 0n,
      currency: 'UZS',
      trialDays: env.TRIAL_DAYS,
      isDefaultTrial: true,
      isActive: true,
      features: { highlights: ['Bepul 7 kunlik sinov'] },
    },
  });
  await prisma.subscriptionPlan.updateMany({
    where: { id: { not: trialPlan.id } },
    data: { isDefaultTrial: false },
  });
  await attachDefaultEntitlements(
    trialPlan.id,
    DEFAULT_TRIAL_FEATURE_KEYS,
    Object.values(LimitResourceKey).map((resourceKey) => ({
      resourceKey,
      unlimited: true,
      limitValue: null,
    })),
  );

  const catalogPlans = [
    {
      name: 'START',
      description: 'Asosiy tarif',
      price: env.SEED_PLAN_START_PRICE,
      featureKeys: STARTER_FEATURE_KEYS,
      limits: [
        { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 3 },
        { resourceKey: LimitResourceKey.CUSTOMERS, unlimited: false, limitValue: 100 },
        { resourceKey: LimitResourceKey.PRODUCTS, unlimited: false, limitValue: 80 },
        { resourceKey: LimitResourceKey.SUPPLIERS, unlimited: false, limitValue: 10 },
        { resourceKey: LimitResourceKey.SALES, unlimited: true, limitValue: null },
      ],
      features: {
        highlights: ['Asosiy savdo va ombor', '1 oy hisobotlari', '3 xodimgacha'],
        maxUsers: 3,
        maxProducts: 80,
      },
    },
    {
      name: 'PRO',
      description: 'Kengaytirilgan tarif',
      price: env.SEED_PLAN_PRO_PRICE,
      featureKeys: FEATURE_CATALOG.map((item) => item.key).filter((key) => key !== 'backup'),
      limits: [
        { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 10 },
        { resourceKey: LimitResourceKey.CUSTOMERS, unlimited: false, limitValue: 500 },
        { resourceKey: LimitResourceKey.PRODUCTS, unlimited: false, limitValue: 400 },
        { resourceKey: LimitResourceKey.SUPPLIERS, unlimited: false, limitValue: 50 },
        { resourceKey: LimitResourceKey.SALES, unlimited: true, limitValue: null },
      ],
      features: {
        highlights: ['To‘liq ERP', 'Qarz va installment', '10 xodimgacha'],
        maxUsers: 10,
        maxProducts: 400,
      },
    },
    {
      name: 'BUSINESS',
      description: 'Biznes tarif',
      price: env.SEED_PLAN_BUSINESS_PRICE,
      featureKeys: FEATURE_CATALOG.map((item) => item.key),
      limits: Object.values(LimitResourceKey).map((resourceKey) => ({
        resourceKey,
        unlimited: true,
        limitValue: null,
      })),
      features: {
        highlights: ['Cheksiz xodimlar', 'Kengaytirilgan hisobotlar', 'Ustuvor qo‘llab-quvvatlash'],
        maxUsers: null,
        maxProducts: null,
      },
    },
  ];
  for (const plan of catalogPlans) {
    const saved = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        monthlyPrice: BigInt(plan.price),
        description: plan.description,
        isActive: true,
        features: plan.features as Prisma.InputJsonValue,
      },
      create: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: BigInt(plan.price),
        currency: 'UZS',
        isActive: true,
        features: plan.features as Prisma.InputJsonValue,
      },
    });
    await attachDefaultEntitlements(saved.id, plan.featureKeys, plan.limits);
  }
  await getSettingsRow();
  const stores = await prisma.store.findMany({
    where: TENANT_STORE_WHERE,
    select: { id: true },
  });
  for (const store of stores) {
    await provisionStoreSubscription(store.id);
  }
}

const requestInclude = {
  store: {
    select: {
      id: true,
      name: true,
      phone: true,
      users: {
        where: { role: UserRole.ADMIN },
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
} satisfies Prisma.SubscriptionRequestInclude;

function toRequestDto(
  row: Prisma.SubscriptionRequestGetPayload<{ include: typeof requestInclude }>,
): SubscriptionRequestDto {
  const owner = row.store.users[0];
  const current = row.store.subscriptions[0];
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: row.store.name,
    ownerName: owner?.fullName ?? null,
    ownerPhone: owner?.phone ?? row.store.phone,
    planId: row.planId,
    planName: row.plan.name,
    currentPlanName: current?.plan.name ?? null,
    currentStatus: current ? effectiveSubscriptionStatus(current) : null,
    requestedPriceSnapshot: money(row.requestedPriceSnapshot),
    currency: row.currency,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByName: row.reviewedBy?.fullName ?? null,
    rejectionReason: row.rejectionReason,
    note: row.note,
    createdInvoiceId: row.createdInvoiceId,
    createdSubscriptionId: row.createdSubscriptionId,
  };
}

export async function listSubscriptionRequests(
  actorRole: string,
  status?: SubscriptionRequestStatus,
): Promise<{ items: SubscriptionRequestDto[] }> {
  assertPlatform(actorRole);
  const items = await prisma.subscriptionRequest.findMany({
    where: status ? { status } : {},
    include: requestInclude,
    orderBy: { requestedAt: 'desc' },
  });
  return { items: items.map(toRequestDto) };
}

export async function approveSubscriptionRequest(
  actor: { id: string; role: string },
  requestId: string,
  body: ApproveSubscriptionRequestBody,
): Promise<{ request: SubscriptionRequestDto; invoice: PlatformInvoiceDto }> {
  assertPlatform(actor.role);
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw ApiError.validation('Sana oralig‘i noto‘g‘ri');
  }

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: { plan: true, store: true },
    });
    if (!request) throw ApiError.notFound("So'rov topilmadi");
    if (request.status !== SubscriptionRequestStatus.PENDING) {
      throw ApiError.conflict("Bu so'rov allaqachon ko'rib chiqilgan");
    }

    const next = await activatePaidPeriod(tx, {
      storeId: request.storeId,
      planId: request.planId,
      start,
      end,
    });

    const invoice = await tx.platformInvoice.create({
      data: {
        storeId: request.storeId,
        subscriptionId: next.id,
        planId: request.planId,
        planName: request.plan.name,
        amount: request.requestedPriceSnapshot,
        currency: request.currency,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        dueDate: start,
        status: PlatformBillingStatus.PAID,
        paidAt: start,
        paymentMethod: body.paymentMethod,
        note: body.note?.trim() || request.note,
        durationMonths: 1,
        recordedById: actor.id,
      },
      include: invoiceInclude,
    });

    const updatedRequest = await tx.subscriptionRequest.update({
      where: { id: request.id },
      data: {
        status: SubscriptionRequestStatus.APPROVED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        createdInvoiceId: invoice.id,
        createdSubscriptionId: next.id,
      },
      include: requestInclude,
    });

    if (request.store.accessStatus !== StoreAccessStatus.MANUALLY_BLOCKED) {
      await tx.store.update({
        where: { id: request.storeId },
        data: { accessStatus: StoreAccessStatus.ACTIVE, isActive: true },
      });
    }

    return { updatedRequest, invoice };
  });

  await recordAudit({
    storeId: result.updatedRequest.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_REQUEST_APPROVED,
    entityType: AuditEntityType.SUBSCRIPTION_REQUEST,
    entityId: result.updatedRequest.id,
    summary: `Subscription request approved: ${result.updatedRequest.store.name}`,
    metadata: {
      planId: result.updatedRequest.planId,
      amount: money(result.invoice.amount),
      invoiceId: result.invoice.id,
    },
  });

  return {
    request: toRequestDto(result.updatedRequest),
    invoice: toInvoiceDto(result.invoice),
  };
}

export async function rejectSubscriptionRequest(
  actor: { id: string; role: string },
  requestId: string,
  body: RejectPlatformPaymentBody,
): Promise<SubscriptionRequestDto> {
  assertPlatform(actor.role);
  const reason = body.reason.trim();
  if (reason.length < 3) {
    throw ApiError.validation('Rad etish sababi kerak', [
      { field: 'reason', message: 'Kamida 3 ta belgi kiriting' },
    ]);
  }
  const existing = await prisma.subscriptionRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("So'rov topilmadi");
  if (existing.status !== SubscriptionRequestStatus.PENDING) {
    throw ApiError.conflict("Bu so'rov allaqachon ko'rib chiqilgan");
  }
  const updated = await prisma.subscriptionRequest.update({
    where: { id: requestId },
    data: {
      status: SubscriptionRequestStatus.REJECTED,
      reviewedById: actor.id,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
    include: requestInclude,
  });
  await recordAudit({
    storeId: updated.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUBSCRIPTION_REQUEST_REJECTED,
    entityType: AuditEntityType.SUBSCRIPTION_REQUEST,
    entityId: updated.id,
    summary: `Subscription request rejected: ${updated.store.name}`,
    metadata: { reasonLength: reason.length },
  });
  return toRequestDto(updated);
}
