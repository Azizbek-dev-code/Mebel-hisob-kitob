import {
  AuditEntityType,
  AuditEventType,
  AuthSessionKind,
  PERSONAL_PAID_PERIOD_DAYS,
  PERSONAL_PLAN_KEY,
  PERSONAL_PLANS,
  PERSONAL_TRIAL_DAYS,
  PlanAudience,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  WorkspaceStatus,
  WorkspaceType,
  addCalendarDays,
  canWriteWithSubscription,
  effectiveSubscriptionStatus,
  isPersonalPlanKey,
  persistedExpiredStatus,
  personalPlanByKey,
  trialDaysRemaining,
  type AuthSubscriptionSnapshot,
  type PersonalAuthUser,
  type PersonalBillingResponse,
  type PersonalPlanCatalogEntry,
  type PersonalPlanKey,
  type RequestPersonalSubscriptionBody,
  type SelectPersonalPlanRequest,
  type SubscriptionRequestDto,
  type WorkspaceMembershipRole,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { assertScopedBillingProofKey } from '../../../lib/billing-proof.js';
import { recordAudit } from '../../../services/audit.service.js';
import { assertPaidPlanChange } from '../../../services/plan-change.js';
import {
  requestInclude,
  toRequestDto,
} from '../../../services/platform-billing.service.js';
import { ApiError } from '../../../utils/api-error.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

function periodDaysFromFeatures(features: unknown, fallback: number): number {
  if (features && typeof features === 'object' && !Array.isArray(features)) {
    const raw = (features as Record<string, unknown>).periodDays;
    const days = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(days) && days > 0) return Math.floor(days);
  }
  return fallback;
}

async function loadPersonalPlanCatalog(
  db: DbClient,
  opts?: { includeInactive?: boolean; currentPlanKey?: string | null },
): Promise<PersonalPlanCatalogEntry[]> {
  const rows = await db.subscriptionPlan.findMany({
    where: { audience: PlanAudience.PERSONAL },
    orderBy: [{ rank: 'asc' }, { monthlyPrice: 'asc' }],
    select: {
      name: true,
      monthlyPrice: true,
      trialDays: true,
      rank: true,
      isActive: true,
      features: true,
    },
  });

  const mapped: PersonalPlanCatalogEntry[] = [];
  for (const row of rows) {
    if (!isPersonalPlanKey(row.name)) continue;
    if (
      !opts?.includeInactive &&
      !row.isActive &&
      row.name !== opts?.currentPlanKey
    ) {
      continue;
    }
    const key = row.name as PersonalPlanKey;
    const fallbackPeriod =
      key === PERSONAL_PLAN_KEY.TRIAL ? PERSONAL_TRIAL_DAYS : PERSONAL_PAID_PERIOD_DAYS;
    const periodDays =
      key === PERSONAL_PLAN_KEY.TRIAL
        ? row.trialDays > 0
          ? row.trialDays
          : periodDaysFromFeatures(row.features, fallbackPeriod)
        : periodDaysFromFeatures(row.features, fallbackPeriod);
    mapped.push({
      key,
      trialDays: key === PERSONAL_PLAN_KEY.TRIAL ? periodDays : 0,
      periodDays,
      monthlyPriceSom: Number(row.monthlyPrice),
      rank: row.rank ?? (key === PERSONAL_PLAN_KEY.TRIAL ? 0 : 1),
    });
  }

  if (mapped.length === 0) {
    return [...PERSONAL_PLANS];
  }
  return mapped;
}

export async function resolvePersonalTrialDays(db: DbClient = defaultPrisma): Promise<number> {
  const plan = await db.subscriptionPlan.findFirst({
    where: { name: PERSONAL_PLAN_KEY.TRIAL, audience: PlanAudience.PERSONAL },
    select: { trialDays: true, features: true },
  });
  if (plan?.trialDays && plan.trialDays > 0) return plan.trialDays;
  return periodDaysFromFeatures(plan?.features, PERSONAL_TRIAL_DAYS);
}

function planDisplayName(planKey: string): string {
  if (planKey === PERSONAL_PLAN_KEY.PAID) return 'Pullik';
  return 'Sinov';
}

export function toPersonalSubscriptionSnapshot(
  row: {
    status: string;
    planKey: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date;
    trialWelcomeSeenAt?: Date | null;
  },
  extras?: { hasPendingPaymentRequest?: boolean },
): AuthSubscriptionSnapshot {
  const effective = effectiveSubscriptionStatus({
    status: row.status,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd,
  });
  return {
    status: effective,
    storedStatus: row.status as AuthSubscriptionSnapshot['storedStatus'],
    planId: row.planKey,
    planName: planDisplayName(row.planKey),
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    trialWelcomeSeenAt: row.trialWelcomeSeenAt?.toISOString() ?? null,
    daysRemaining:
      effective === SubscriptionStatus.TRIAL
        ? trialDaysRemaining(row.trialEndsAt ?? row.currentPeriodEnd)
        : effective === SubscriptionStatus.ACTIVE
          ? trialDaysRemaining(row.currentPeriodEnd)
          : null,
    canWrite: canWriteWithSubscription(effective),
    hasPendingPaymentRequest: extras?.hasPendingPaymentRequest ?? false,
    featureKeys: [],
    featuresRestricted: false,
  };
}

export function trialSubscriptionCreateData(workspaceId: string, now = new Date(), trialDays = PERSONAL_TRIAL_DAYS) {
  const periodEnd = addCalendarDays(now, trialDays);
  return {
    workspaceId,
    planKey: PERSONAL_PLAN_KEY.TRIAL,
    status: SubscriptionStatus.TRIAL,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    trialStartedAt: now,
    trialEndsAt: periodEnd,
  };
}

async function persistPersonalSubscription(
  workspaceId: string,
  db: DbClient,
) {
  const current = await db.personalSubscription.findUnique({ where: { workspaceId } });
  if (!current) return null;
  const nextStatus = persistedExpiredStatus(
    current.status,
    effectiveSubscriptionStatus(current),
  );
  if (!nextStatus) return current;
  return db.personalSubscription.update({
    where: { workspaceId },
    data: { status: nextStatus },
  });
}

async function findPendingPersonalRequest(workspaceId: string, db: DbClient) {
  return db.subscriptionRequest.findFirst({
    where: { workspaceId, status: SubscriptionRequestStatus.PENDING },
    include: requestInclude,
  });
}

export async function ensurePersonalTrial(
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  const existing = await db.personalSubscription.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (existing) return;
  const trialDays = await resolvePersonalTrialDays(db);
  await db.personalSubscription.create({
    data: trialSubscriptionCreateData(workspaceId, new Date(), trialDays),
  });
}

export async function loadPersonalAuthUser(
  identityId: string,
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalAuthUser> {
  const membership = await db.workspaceMembership.findUnique({
    where: { identityId_workspaceId: { identityId, workspaceId } },
    include: {
      identity: { select: { id: true, email: true, fullName: true, emailVerifiedAt: true } },
      workspace: {
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          storeId: true,
        },
      },
    },
  });
  if (!membership) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }
  if (
    membership.workspace.type !== WorkspaceType.PERSONAL ||
    membership.workspace.status !== WorkspaceStatus.ACTIVE ||
    membership.workspace.storeId !== null
  ) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  await ensurePersonalTrial(workspaceId, db);
  const sub = await persistPersonalSubscription(workspaceId, db);
  if (!sub) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }
  const pending = await findPendingPersonalRequest(workspaceId, db);

  return {
    kind: AuthSessionKind.PERSONAL,
    id: membership.identity.id,
    email: membership.identity.email,
    username: null,
    fullName: membership.identity.fullName,
    phone: null,
    role: 'PERSONAL',
    responsibilities: [],
    storeId: null,
    storeName: membership.workspace.name,
    workspaceId: membership.workspace.id,
    identityId: membership.identity.id,
    membershipRole: membership.role as WorkspaceMembershipRole,
    subscription: toPersonalSubscriptionSnapshot(sub, {
      hasPendingPaymentRequest: Boolean(pending),
    }),
    emailVerified: Boolean(membership.identity.emailVerifiedAt),
  };
}

export async function findPersonalSignInCandidate(
  email: string,
  db: PrismaClient = defaultPrisma,
) {
  const identity = await db.identity.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      passwordHash: { not: null },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      memberships: {
        where: {
          workspace: { type: WorkspaceType.PERSONAL, status: WorkspaceStatus.ACTIVE },
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { workspaceId: true, role: true },
      },
    },
  });
  const membership = identity?.memberships[0];
  if (!identity?.passwordHash || !membership) return null;
  return {
    id: identity.id,
    email: identity.email,
    fullName: identity.fullName,
    passwordHash: identity.passwordHash,
    workspaceId: membership.workspaceId,
  };
}

export async function getPersonalBilling(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBillingResponse> {
  await ensurePersonalTrial(workspaceId, db);
  const sub = await persistPersonalSubscription(workspaceId, db);
  if (!sub) throw ApiError.notFound('Obuna topilmadi');
  const pending = await findPendingPersonalRequest(workspaceId, db);
  const plans = await loadPersonalPlanCatalog(db, { currentPlanKey: sub.planKey });
  return {
    subscription: toPersonalSubscriptionSnapshot(sub, {
      hasPendingPaymentRequest: Boolean(pending),
    }),
    currentPlanKey: sub.planKey,
    plans,
    pendingRequest: pending ? toRequestDto(pending) : null,
  };
}

export async function selectPersonalPlan(
  workspaceId: string,
  identityId: string,
  input: SelectPersonalPlanRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBillingResponse> {
  const plan = personalPlanByKey(input.planKey);
  if (!plan) {
    throw ApiError.validation('Tarifni tanlang', [
      { field: 'planKey', message: 'Noma’lum tarif' },
    ]);
  }
  await ensurePersonalTrial(workspaceId, db);
  const current = await db.personalSubscription.findUnique({ where: { workspaceId } });
  if (!current) throw ApiError.notFound('Obuna topilmadi');

  const now = new Date();
  let next: Prisma.PersonalSubscriptionUpdateInput;

  if (plan.key === PERSONAL_PLAN_KEY.TRIAL) {
    const alreadyUsedTrial = Boolean(current.trialEndsAt);
    const trialStillOpen =
      current.status === SubscriptionStatus.TRIAL &&
      current.trialEndsAt &&
      current.trialEndsAt.getTime() >= now.getTime();
    if (!trialStillOpen) {
      throw ApiError.conflict(
        alreadyUsedTrial
          ? 'Sinov muddati tugagan. Pullik tarifni tanlang.'
          : 'Sinov tarifini qayta ochib bo‘lmaydi.',
      );
    }
    next = {};
  } else {
    throw ApiError.conflict("Pullik tarif to‘lov so‘rovi orqali yoqiladi.");
  }

  if (Object.keys(next).length > 0) {
    await db.personalSubscription.update({ where: { workspaceId }, data: next });
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.PERSONAL_PLAN_SELECTED,
      entityType: AuditEntityType.PERSONAL_SUBSCRIPTION,
      entityId: current.id,
      summary: `Personal plan selected: ${plan.key}`,
      metadata: { workspaceId, identityId, planKey: plan.key },
    });
  }

  return getPersonalBilling(workspaceId, db);
}

export async function requestPersonalSubscription(
  actor: { id: string; workspaceId: string },
  body: RequestPersonalSubscriptionBody,
): Promise<SubscriptionRequestDto> {
  if (!body.proofUrl?.trim() || !body.proofKey?.trim()) {
    throw ApiError.validation('To‘lov chekini yuklang', [
      { field: 'proofUrl', message: 'Chek majburiy' },
    ]);
  }
  const proofKey = assertScopedBillingProofKey(
    body.proofKey,
    `billing-proofs/workspace/${actor.workspaceId}`,
  );

  await ensurePersonalTrial(actor.workspaceId);
  const current = await persistPersonalSubscription(actor.workspaceId, defaultPrisma);
  if (!current) throw ApiError.notFound('Obuna topilmadi');

  const paidCatalog = personalPlanByKey(PERSONAL_PLAN_KEY.PAID);
  const currentCatalog = personalPlanByKey(current.planKey);
  assertPaidPlanChange({
    effectiveStatus: effectiveSubscriptionStatus(current),
    currentPlanId: current.planKey,
    currentRank: currentCatalog?.rank ?? 0,
    targetPlanId: PERSONAL_PLAN_KEY.PAID,
    targetRank: paidCatalog?.rank ?? 1,
    targetIsTrial: false,
  });

  const plan = await defaultPrisma.subscriptionPlan.findFirst({
    where: {
      name: PERSONAL_PLAN_KEY.PAID,
      audience: PlanAudience.PERSONAL,
      isActive: true,
    },
  });
  if (!plan) throw ApiError.notFound('Pullik tarif topilmadi');

  const pending = await defaultPrisma.subscriptionRequest.findFirst({
    where: { workspaceId: actor.workspaceId, status: SubscriptionRequestStatus.PENDING },
  });
  if (pending) {
    throw ApiError.conflict("Sizda allaqachon kutilayotgan obuna so'rovi bor");
  }

  let created;
  try {
    created = await defaultPrisma.subscriptionRequest.create({
      data: {
        storeId: null,
        workspaceId: actor.workspaceId,
        planId: plan.id,
        fromPlanId: null,
        fromPlanName: planDisplayName(current.planKey),
        requestedPriceSnapshot: plan.monthlyPrice,
        currency: plan.currency,
        status: SubscriptionRequestStatus.PENDING,
        note: body.note?.trim() || null,
        paymentMethod: body.paymentMethod,
        payerReference: body.payerReference?.trim() || null,
        proofUrl: body.proofUrl.trim(),
        proofKey,
      },
      include: requestInclude,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict("Sizda allaqachon kutilayotgan obuna so'rovi bor");
    }
    throw error;
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.SUBSCRIPTION_REQUEST_CREATED,
    entityType: AuditEntityType.SUBSCRIPTION_REQUEST,
    entityId: created.id,
    summary: `Personal subscription requested: ${plan.name}`,
    metadata: {
      workspaceId: actor.workspaceId,
      identityId: actor.id,
      planId: plan.id,
      amount: Number(plan.monthlyPrice),
    },
  });

  return toRequestDto(created);
}

export async function listPersonalSubscriptionRequests(workspaceId: string): Promise<{
  items: SubscriptionRequestDto[];
}> {
  const items = await defaultPrisma.subscriptionRequest.findMany({
    where: { workspaceId },
    include: requestInclude,
    orderBy: { requestedAt: 'desc' },
    take: 50,
  });
  return { items: items.map(toRequestDto) };
}

export async function cancelPersonalSubscriptionRequest(
  workspaceId: string,
  requestId: string,
): Promise<SubscriptionRequestDto> {
  const existing = await defaultPrisma.subscriptionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, workspaceId: true, status: true },
  });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw ApiError.notFound("So'rov topilmadi");
  }
  const claimed = await defaultPrisma.subscriptionRequest.updateMany({
    where: { id: requestId, status: SubscriptionRequestStatus.PENDING },
    data: { status: SubscriptionRequestStatus.CANCELLED, reviewedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw ApiError.conflict("Bu so'rov allaqachon ko'rib chiqilgan");
  }
  const updated = await defaultPrisma.subscriptionRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: requestInclude,
  });
  return toRequestDto(updated);
}

export async function markPersonalTrialWelcomeSeen(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBillingResponse> {
  await ensurePersonalTrial(workspaceId, db);
  const current = await db.personalSubscription.findUnique({ where: { workspaceId } });
  if (!current) throw ApiError.notFound('Obuna topilmadi');
  if (!current.trialWelcomeSeenAt) {
    await db.personalSubscription.update({
      where: { workspaceId },
      data: { trialWelcomeSeenAt: new Date() },
    });
  }
  return getPersonalBilling(workspaceId, db);
}
