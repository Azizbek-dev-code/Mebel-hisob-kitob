import { randomBytes } from 'node:crypto';
import { randomUUID } from 'node:crypto';

import {
  DEFAULT_REFERRAL_COMMISSION_PERCENT,
  DEFAULT_REFERRAL_MIN_WITHDRAWAL_SOM,
  ReferralCommissionStatus,
  ReferralPaymentSourceType,
  ReferralWithdrawalStatus,
  UserRole,
  WorkspaceMembershipRole,
  computeReferralCommission,
  encodeReferralCode,
  isReferralCode,
  normalizeReferralCode,
  type ReferralAdminOverview,
  type ReferralAdminUserRow,
  type ReferralMeResponse,
  type ReferralPublicResolve,
  type ReferralWithdrawalDto,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ensureIdentityForUser } from '../accounts/account-layer.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

function money(value: bigint): number {
  return Number(value);
}

function toWithdrawalDto(row: {
  id: string;
  amountSom: bigint;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  paidAt: Date | null;
}): ReferralWithdrawalDto {
  return {
    id: row.id,
    amount: money(row.amountSom),
    status: row.status as ReferralWithdrawalDto['status'],
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

async function loadProgram(db: DbClient) {
  const row = await db.platformSettings.findUnique({ where: { id: 'platform' } });
  return {
    active: row?.referralProgramActive ?? true,
    percent: row?.referralCommissionPercent ?? DEFAULT_REFERRAL_COMMISSION_PERCENT,
    minWithdrawal: money(row?.referralMinWithdrawalSom ?? BigInt(DEFAULT_REFERRAL_MIN_WITHDRAWAL_SOM)),
  };
}

export function newVisitorKey(): string {
  return randomUUID();
}

export async function ensureReferralCode(identityId: string, db: DbClient = defaultPrisma): Promise<string> {
  const existing = await db.referralCode.findUnique({
    where: { identityId },
    select: { code: true },
  });
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = encodeReferralCode(randomBytes(5));
    try {
      const created = await db.referralCode.create({
        data: { identityId, code },
        select: { code: true },
      });
      return created.code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await db.referralCode.findUnique({
        where: { identityId },
        select: { code: true },
      });
      if (raced) return raced.code;
    }
  }
  throw ApiError.conflict('Referral kod yaratilmadi');
}

export async function resolveReferralCode(
  raw: string,
  db: DbClient = defaultPrisma,
): Promise<ReferralPublicResolve> {
  const code = normalizeReferralCode(raw);
  if (!isReferralCode(code)) return { valid: false, code };
  const program = await loadProgram(db);
  if (!program.active) return { valid: false, code };
  const row = await db.referralCode.findUnique({
    where: { code },
    select: { code: true, isActive: true },
  });
  if (!row?.isActive) return { valid: false, code };
  return { valid: true, code: row.code };
}

export async function recordReferralClick(
  raw: string,
  visitorKey: string,
  opts: { actorIdentityId?: string | null } = {},
  db: DbClient = defaultPrisma,
): Promise<{ code: string; visitorKey: string }> {
  const resolved = await resolveReferralCode(raw, db);
  if (!resolved.valid) throw ApiError.notFound('Referral havola topilmadi');
  const row = await db.referralCode.findUnique({
    where: { code: resolved.code },
    select: { id: true, identityId: true },
  });
  if (!row) throw ApiError.notFound('Referral havola topilmadi');
  if (opts.actorIdentityId && opts.actorIdentityId === row.identityId) {
    throw ApiError.conflict('O‘z referral havolangizni ishlatib bo‘lmaydi');
  }
  await db.referralClick.create({
    data: { referralCodeId: row.id, visitorKey },
  });
  return { code: resolved.code, visitorKey };
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  return email.includes('@') ? email : null;
}

async function isSelfReferral(
  referrerIdentityId: string,
  referredIdentityId: string,
  db: DbClient,
): Promise<boolean> {
  if (referrerIdentityId === referredIdentityId) return true;
  const [referrer, referred] = await Promise.all([
    db.identity.findUnique({
      where: { id: referrerIdentityId },
      select: { email: true },
    }),
    db.identity.findUnique({
      where: { id: referredIdentityId },
      select: { email: true },
    }),
  ]);
  const left = normalizeEmail(referrer?.email);
  const right = normalizeEmail(referred?.email);
  return Boolean(left && right && left === right);
}

export async function attributeRegistration(
  input: {
    referredIdentityId: string;
    referredWorkspaceId?: string | null;
    code?: string | null;
    visitorKey?: string | null;
  },
  db: DbClient = defaultPrisma,
): Promise<void> {
  if (!input.code) return;
  const program = await loadProgram(db);
  if (!program.active) return;

  const code = normalizeReferralCode(input.code);
  if (!isReferralCode(code)) return;

  const already = await db.referralAttribution.findUnique({
    where: { referredIdentityId: input.referredIdentityId },
    select: { id: true },
  });
  if (already) return;

  const referral = await db.referralCode.findUnique({
    where: { code },
    select: { id: true, identityId: true, isActive: true },
  });
  if (!referral?.isActive) return;
  if (await isSelfReferral(referral.identityId, input.referredIdentityId, db)) return;

  try {
    await db.referralAttribution.create({
      data: {
        referralCodeId: referral.id,
        referrerIdentityId: referral.identityId,
        referredIdentityId: input.referredIdentityId,
        referredWorkspaceId: input.referredWorkspaceId ?? null,
        visitorKey: input.visitorKey ?? null,
        accountCreatedAt: input.referredWorkspaceId ? new Date() : null,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

export async function markReferralAccountCreated(
  referredIdentityId: string,
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  await db.referralAttribution.updateMany({
    where: { referredIdentityId, accountCreatedAt: null },
    data: { referredWorkspaceId: workspaceId, accountCreatedAt: new Date() },
  });
}

async function resolveReferredIdentity(
  input: { referredIdentityId?: string | null; referredWorkspaceId?: string | null; storeId?: string | null },
  db: DbClient,
): Promise<string | null> {
  if (input.referredIdentityId) return input.referredIdentityId;
  if (input.referredWorkspaceId) {
    const owner = await db.workspaceMembership.findFirst({
      where: { workspaceId: input.referredWorkspaceId, role: WorkspaceMembershipRole.OWNER },
      select: { identityId: true },
    });
    return owner?.identityId ?? null;
  }
  if (input.storeId) {
    const admin = await db.user.findFirst({
      where: { storeId: input.storeId, role: UserRole.ADMIN },
      select: { id: true, identityId: true },
    });
    if (!admin) return null;
    if (admin.identityId) return admin.identityId;
    return ensureIdentityForUser(admin.id, db);
  }
  return null;
}

export async function grantFirstPaymentCommission(
  input: {
    referredIdentityId?: string | null;
    referredWorkspaceId?: string | null;
    storeId?: string | null;
    sourceType: string;
    sourceId: string;
    sourceAmountSom: bigint;
    paid: boolean;
  },
  db: DbClient = defaultPrisma,
): Promise<void> {
  if (!input.paid) return;
  if (input.sourceAmountSom <= 0n) return;
  if (
    input.sourceType !== ReferralPaymentSourceType.PLATFORM_INVOICE &&
    input.sourceType !== ReferralPaymentSourceType.SUBSCRIPTION_REQUEST
  ) {
    return;
  }

  const program = await loadProgram(db);
  if (!program.active) return;

  const duplicate = await db.referralCommission.findUnique({
    where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
    select: { id: true },
  });
  if (duplicate) return;

  const referredIdentityId = await resolveReferredIdentity(input, db);
  if (!referredIdentityId) return;

  const attribution = await db.referralAttribution.findUnique({
    where: { referredIdentityId },
  });
  if (!attribution || attribution.firstPaidAt) return;
  if (await isSelfReferral(attribution.referrerIdentityId, referredIdentityId, db)) return;

  const amount = BigInt(
    computeReferralCommission(money(input.sourceAmountSom), program.percent),
  );
  if (amount <= 0n) return;

  try {
    await db.referralCommission.create({
      data: {
        attributionId: attribution.id,
        referrerIdentityId: attribution.referrerIdentityId,
        amountSom: amount,
        commissionPercent: program.percent,
        sourceAmountSom: input.sourceAmountSom,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: ReferralCommissionStatus.AVAILABLE,
      },
    });
    await db.referralAttribution.updateMany({
      where: { id: attribution.id, firstPaidAt: null },
      data: { firstPaidAt: new Date() },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

export async function voidCommissionForSource(
  sourceType: string,
  sourceId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  const row = await db.referralCommission.findUnique({
    where: { sourceType_sourceId: { sourceType, sourceId } },
  });
  if (!row) return;
  if (
    row.status === ReferralCommissionStatus.WITHDRAW_REQUESTED ||
    row.status === ReferralCommissionStatus.PAID
  ) {
    return;
  }
  await db.referralCommission.update({
    where: { id: row.id },
    data: { status: ReferralCommissionStatus.REJECTED },
  });
}

export async function getMyReferral(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<ReferralMeResponse> {
  const code = await ensureReferralCode(identityId, db);
  const program = await loadProgram(db);
  const referral = await db.referralCode.findUnique({
    where: { identityId },
    select: { id: true },
  });
  const [clicks, attributions, commissions] = await Promise.all([
    referral
      ? db.referralClick.count({ where: { referralCodeId: referral.id } })
      : 0,
    db.referralAttribution.findMany({
      where: { referrerIdentityId: identityId },
      select: { firstPaidAt: true },
    }),
    db.referralCommission.findMany({
      where: { referrerIdentityId: identityId },
      select: { amountSom: true, status: true },
    }),
  ]);
  const registrations = attributions.length;
  const firstPayments = attributions.filter((row) => row.firstPaidAt).length;
  let earned = 0n;
  let available = 0n;
  let pending = 0n;
  let paid = 0n;
  for (const row of commissions) {
    if (row.status === ReferralCommissionStatus.REJECTED) continue;
    earned += row.amountSom;
    if (row.status === ReferralCommissionStatus.AVAILABLE) available += row.amountSom;
    if (
      row.status === ReferralCommissionStatus.PENDING ||
      row.status === ReferralCommissionStatus.WITHDRAW_REQUESTED
    ) {
      pending += row.amountSom;
    }
    if (row.status === ReferralCommissionStatus.PAID) paid += row.amountSom;
  }
  const conversionPercent =
    registrations === 0 ? 0 : Math.round((firstPayments / registrations) * 100);
  return {
    code,
    path: `/ref/${code}`,
    programActive: program.active,
    commissionPercent: program.percent,
    minWithdrawal: program.minWithdrawal,
    clicks,
    registrations,
    firstPayments,
    conversionPercent,
    earned: money(earned),
    available: money(available),
    pending: money(pending),
    paid: money(paid),
    canWithdraw: money(available) >= program.minWithdrawal && program.active,
  };
}

export async function requestReferralWithdrawal(
  identityId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ReferralWithdrawalDto> {
  const program = await loadProgram(db);
  if (!program.active) throw ApiError.conflict('Referral dasturi o‘chirilgan');

  return db.$transaction(async (tx) => {
    const open = await tx.referralWithdrawal.findFirst({
      where: {
        identityId,
        status: { in: [ReferralWithdrawalStatus.PENDING, ReferralWithdrawalStatus.APPROVED] },
      },
      select: { id: true },
    });
    if (open) throw ApiError.conflict('Allaqachon ochiq yechish so‘rovi bor');

    const available = await tx.referralCommission.findMany({
      where: { referrerIdentityId: identityId, status: ReferralCommissionStatus.AVAILABLE },
      select: { id: true, amountSom: true },
    });
    const total = available.reduce((sum, row) => sum + row.amountSom, 0n);
    if (money(total) < program.minWithdrawal) {
      throw ApiError.validation('Minimal yechish miqdoriga yetmadi');
    }

    const withdrawal = await tx.referralWithdrawal.create({
      data: {
        identityId,
        amountSom: total,
        status: ReferralWithdrawalStatus.PENDING,
      },
    });
    const locked = await tx.referralCommission.updateMany({
      where: {
        id: { in: available.map((row) => row.id) },
        status: ReferralCommissionStatus.AVAILABLE,
      },
      data: {
        status: ReferralCommissionStatus.WITHDRAW_REQUESTED,
        withdrawalId: withdrawal.id,
      },
    });
    if (locked.count !== available.length) {
      throw ApiError.conflict('Yechish raqobatda qoldi, qayta urinib ko‘ring');
    }
    return toWithdrawalDto(withdrawal);
  });
}

export async function listMyReferralWithdrawals(
  identityId: string,
  db: DbClient = defaultPrisma,
): Promise<{ items: ReferralWithdrawalDto[] }> {
  const items = await db.referralWithdrawal.findMany({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
  return { items: items.map(toWithdrawalDto) };
}

export async function getReferralAdminOverview(
  actorRole: string,
  db: DbClient = defaultPrisma,
): Promise<ReferralAdminOverview> {
  if (actorRole !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  const program = await loadProgram(db);
  const [
    clicks,
    registrations,
    conversions,
    commissionAgg,
    pendingWithdrawals,
    pendingAmount,
    paidWithdrawals,
    paidAmount,
  ] = await Promise.all([
    db.referralClick.count(),
    db.referralAttribution.count(),
    db.referralAttribution.count({ where: { firstPaidAt: { not: null } } }),
    db.referralCommission.aggregate({
      where: { status: { not: ReferralCommissionStatus.REJECTED } },
      _sum: { amountSom: true },
    }),
    db.referralWithdrawal.count({ where: { status: ReferralWithdrawalStatus.PENDING } }),
    db.referralWithdrawal.aggregate({
      where: { status: ReferralWithdrawalStatus.PENDING },
      _sum: { amountSom: true },
    }),
    db.referralWithdrawal.count({ where: { status: ReferralWithdrawalStatus.PAID } }),
    db.referralWithdrawal.aggregate({
      where: { status: ReferralWithdrawalStatus.PAID },
      _sum: { amountSom: true },
    }),
  ]);
  return {
    clicks,
    registrations,
    conversions,
    commissions: money(commissionAgg._sum.amountSom ?? 0n),
    pendingWithdrawals,
    pendingWithdrawalAmount: money(pendingAmount._sum.amountSom ?? 0n),
    paidWithdrawals,
    paidWithdrawalAmount: money(paidAmount._sum.amountSom ?? 0n),
    commissionPercent: program.percent,
    minWithdrawal: program.minWithdrawal,
    programActive: program.active,
  };
}

export async function listReferralAdminUsers(
  actorRole: string,
  db: DbClient = defaultPrisma,
): Promise<{ items: ReferralAdminUserRow[] }> {
  if (actorRole !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  const codes = await db.referralCode.findMany({
    include: { identity: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const items: ReferralAdminUserRow[] = [];
  for (const row of codes) {
    const [referrals, earned] = await Promise.all([
      db.referralAttribution.count({ where: { referrerIdentityId: row.identityId } }),
      db.referralCommission.aggregate({
        where: {
          referrerIdentityId: row.identityId,
          status: { not: ReferralCommissionStatus.REJECTED },
        },
        _sum: { amountSom: true },
      }),
    ]);
    items.push({
      identityId: row.identityId,
      ownerName: row.identity.fullName,
      code: row.code,
      referrals,
      earned: money(earned._sum.amountSom ?? 0n),
    });
  }
  return { items };
}

export async function listReferralAdminWithdrawals(
  actorRole: string,
  status: string | undefined,
  db: DbClient = defaultPrisma,
): Promise<{ items: ReferralWithdrawalDto[] }> {
  if (actorRole !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  const items = await db.referralWithdrawal.findMany({
    where: status ? { status: status as ReferralWithdrawalStatus } : {},
    orderBy: { createdAt: 'desc' },
  });
  return { items: items.map(toWithdrawalDto) };
}

export async function approveReferralWithdrawal(
  actor: { id: string; role: string },
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<ReferralWithdrawalDto> {
  if (actor.role !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  const claimed = await db.referralWithdrawal.updateMany({
    where: { id, status: ReferralWithdrawalStatus.PENDING },
    data: {
      status: ReferralWithdrawalStatus.APPROVED,
      reviewedById: actor.id,
      reviewedAt: new Date(),
    },
  });
  if (claimed.count === 0) throw ApiError.conflict('So‘rovni tasdiqlab bo‘lmaydi');
  const row = await db.referralWithdrawal.findUniqueOrThrow({ where: { id } });
  return toWithdrawalDto(row);
}

export async function rejectReferralWithdrawal(
  actor: { id: string; role: string },
  id: string,
  reason: string,
  db: PrismaClient = defaultPrisma,
): Promise<ReferralWithdrawalDto> {
  if (actor.role !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  return db.$transaction(async (tx) => {
    const claimed = await tx.referralWithdrawal.updateMany({
      where: {
        id,
        status: { in: [ReferralWithdrawalStatus.PENDING, ReferralWithdrawalStatus.APPROVED] },
      },
      data: {
        status: ReferralWithdrawalStatus.REJECTED,
        rejectionReason: reason.trim(),
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });
    if (claimed.count === 0) throw ApiError.conflict('So‘rovni rad etib bo‘lmaydi');
    await tx.referralCommission.updateMany({
      where: { withdrawalId: id, status: ReferralCommissionStatus.WITHDRAW_REQUESTED },
      data: { status: ReferralCommissionStatus.AVAILABLE, withdrawalId: null },
    });
    const row = await tx.referralWithdrawal.findUniqueOrThrow({ where: { id } });
    return toWithdrawalDto(row);
  });
}

export async function payReferralWithdrawal(
  actor: { id: string; role: string },
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<ReferralWithdrawalDto> {
  if (actor.role !== UserRole.PLATFORM_ADMIN) throw ApiError.forbidden();
  return db.$transaction(async (tx) => {
    const claimed = await tx.referralWithdrawal.updateMany({
      where: { id, status: ReferralWithdrawalStatus.APPROVED },
      data: {
        status: ReferralWithdrawalStatus.PAID,
        paidAt: new Date(),
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });
    if (claimed.count === 0) throw ApiError.conflict('To‘lovni ikki marta belgilab bo‘lmaydi');
    await tx.referralCommission.updateMany({
      where: { withdrawalId: id, status: ReferralCommissionStatus.WITHDRAW_REQUESTED },
      data: { status: ReferralCommissionStatus.PAID },
    });
    const row = await tx.referralWithdrawal.findUniqueOrThrow({ where: { id } });
    return toWithdrawalDto(row);
  });
}

export async function countPendingReferralWithdrawals(db: DbClient = defaultPrisma): Promise<number> {
  return db.referralWithdrawal.count({ where: { status: ReferralWithdrawalStatus.PENDING } });
}

export async function countReferralSignups(db: DbClient = defaultPrisma): Promise<number> {
  return db.referralAttribution.count();
}
