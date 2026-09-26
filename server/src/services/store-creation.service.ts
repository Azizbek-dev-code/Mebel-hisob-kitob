import {
  AuditEntityType,
  AuditEventType,
  BusinessType,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PRODUCT_CATEGORIES,
  StoreCreationRequestStatus,
  UserRole,
  WorkerResponsibility,
  applicantFullName,
  buildPaginationMeta,
  isNormalizedUzMobile,
  normalisePagination,
  normalizeEmail,
  normalizePersonName,
  normalizeStoreName,
  normalizeUsername,
  normalizeUzPhone,
  parseBusinessType,
  validateAuthenticatedBusinessRequestDraft,
  validateStoreCreationDraft,
  type ApproveStoreCreationResponse,
  type CreateAuthenticatedBusinessRequestBody,
  type CreateStoreRequestBody,
  type PaginatedResult,
  type StoreCreationPendingSummary,
  type StoreCreationRequestAdmin,
  type StoreCreationRequestPublic,
} from '@furniture-erp/shared';
import { randomBytes } from 'node:crypto';

import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import * as storeCreationRepository from '../repositories/store-creation.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import {
  assertCanReviewStoreCreationRequests,
  canReviewStoreCreationRequests,
} from './platform-authorization.js';
import { assertPasswordNotCompromised } from './security/compromised-password.service.js';
import { tryEnsureUserOnBusinessWorkspace } from '../modules/accounts/account-layer.service.js';
import {
  attributeRegistration,
  markReferralAccountCreated,
} from '../modules/referrals/referral.service.js';
import { provisionStoreSubscription } from './platform-billing.service.js';

export { assertCanReviewStoreCreationRequests, canReviewStoreCreationRequests };

const OWNER_RESPONSIBILITIES: readonly WorkerResponsibility[] = [
  WorkerResponsibility.SELLER,
  WorkerResponsibility.ASSEMBLER,
  WorkerResponsibility.DELIVERY,
  WorkerResponsibility.INSTALLER,
];

function composeStoreAddress(region: string, district: string, address: string): string {
  return `${region}, ${district}, ${address}`;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = normalizePersonName(fullName).split(' ').filter(Boolean);
  const firstName = parts[0] ?? 'Foydalanuvchi';
  if (parts.length <= 1) return { firstName, lastName: firstName };
  return { firstName, lastName: parts.slice(1).join(' ') };
}

function usernameSeed(email: string, storeName: string): string {
  const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 16) || 'biznes';
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return `${local}${slug ? `.${slug}` : ''}`.slice(0, 32);
}

async function allocateStoreUsername(email: string, storeName: string): Promise<string> {
  const base = usernameSeed(email, storeName) || 'biznes';
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const suffix = attempt === 0 ? '' : String(attempt + 1);
    const candidate = `${base.slice(0, Math.max(3, 40 - suffix.length))}${suffix}`.slice(0, 40);
    const [pending, existing] = await Promise.all([
      storeCreationRepository.findPendingByUsername(candidate),
      storeCreationRepository.findUserByUsername(candidate),
    ]);
    if (!pending && !existing) return candidate;
  }
  return `${base.slice(0, 24)}${Date.now().toString(36)}`.slice(0, 40);
}

export async function createStoreRequest(
  input: CreateStoreRequestBody,
  referral?: { code?: string | null; visitorKey?: string | null },
): Promise<StoreCreationRequestPublic> {
  const fieldErrors = validateStoreCreationDraft(input);
  if (fieldErrors.length > 0) {
    throw ApiError.validation("Arizani to'ldirishda xatolik", fieldErrors);
  }

  const phone = normalizeUzPhone(input.phone);
  if (!isNormalizedUzMobile(phone)) {
    throw ApiError.validation("Arizani to'ldirishda xatolik", [
      { field: 'phone', message: "O'zbekiston mobil raqamini kiriting (+998 XX XXX XX XX)" },
    ]);
  }

  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const storeName = normalizeStoreName(input.storeName);
  const applicantFirstName = normalizePersonName(input.applicantFirstName);
  const applicantLastName = normalizePersonName(input.applicantLastName);
  const region = input.region.trim();
  const district = input.district.trim();
  const address = input.address.trim();

  const [pendingPhone, pendingEmail, pendingUsername, pendingStoreName, existingEmail, existingUsername] =
    await Promise.all([
      storeCreationRepository.findPendingByPhone(phone),
      storeCreationRepository.findPendingByEmail(email),
      storeCreationRepository.findPendingByUsername(username),
      storeCreationRepository.findPendingByStoreName(storeName),
      storeCreationRepository.findUserByEmail(email),
      storeCreationRepository.findUserByUsername(username),
    ]);

  if (pendingPhone) {
    throw ApiError.conflict("Bu telefon raqami bilan kutilayotgan ariza allaqachon mavjud");
  }
  if (pendingEmail || existingEmail) {
    throw ApiError.conflict('Bu email allaqachon ishlatilgan');
  }
  if (pendingUsername || existingUsername) {
    throw ApiError.conflict('Bu login allaqachon ishlatilgan');
  }
  if (pendingStoreName) {
    throw ApiError.conflict("Shu nomdagi do'kon uchun kutilayotgan ariza allaqachon mavjud");
  }

  await assertPasswordNotCompromised(input.password);
  const passwordHash = await hashPassword(input.password);

  const record = await storeCreationRepository.createPendingRequest({
    applicantFirstName,
    applicantLastName,
    phone,
    email,
    username,
    passwordHash,
    storeName,
    region,
    district,
    address,
    businessType: parseBusinessType(input.businessType),
    identityId: null,
    referralCode: referral?.code ?? null,
    visitorKey: referral?.visitorKey ?? null,
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.STORE_CREATION_REQUESTED,
    entityType: AuditEntityType.STORE_CREATION_REQUEST,
    entityId: record.id,
    summary: `Store creation requested: ${storeName}`,
    metadata: {
      requestId: record.id,
      storeName,
      phone,
      region,
      district,
      applicant: applicantFullName(applicantFirstName, applicantLastName),
    },
  });

  return storeCreationRepository.toPublicView(record);
}

/**
 * Signed-in Identity applying for another BUSINESS workspace.
 * Reuses the person's name/email/password; only the new store fields are required.
 */
export async function createAuthenticatedBusinessRequest(
  identityId: string,
  input: CreateAuthenticatedBusinessRequestBody,
  storeUserId?: string,
): Promise<StoreCreationRequestPublic> {
  const fieldErrors = validateAuthenticatedBusinessRequestDraft(input);
  if (fieldErrors.length > 0) {
    throw ApiError.validation("Arizani to'ldirishda xatolik", fieldErrors);
  }

  const identity = await prisma.identity.findUnique({
    where: { id: identityId },
    select: { id: true, email: true, fullName: true, passwordHash: true },
  });
  if (!identity) {
    throw ApiError.unauthorized();
  }

  const phone = normalizeUzPhone(input.phone);
  if (!isNormalizedUzMobile(phone)) {
    throw ApiError.validation("Arizani to'ldirishda xatolik", [
      { field: 'phone', message: "O'zbekiston mobil raqamini kiriting (+998 XX XXX XX XX)" },
    ]);
  }

  const email = normalizeEmail(identity.email);
  const storeName = normalizeStoreName(input.storeName);
  const region = input.region.trim();
  const district = input.district.trim();
  const address = input.address.trim();
  const businessType = parseBusinessType(input.businessType);
  const { firstName, lastName } = splitFullName(identity.fullName);

  const [pendingPhone, pendingEmail, pendingStoreName, existingEmail] = await Promise.all([
    storeCreationRepository.findPendingByPhone(phone),
    storeCreationRepository.findPendingByEmail(email),
    storeCreationRepository.findPendingByStoreName(storeName),
    storeCreationRepository.findUserByEmailOutsideIdentity(email, identityId),
  ]);

  if (pendingPhone && pendingPhone.identityId !== identityId) {
    throw ApiError.conflict("Bu telefon raqami bilan kutilayotgan ariza allaqachon mavjud");
  }
  if (pendingEmail && pendingEmail.identityId !== identityId) {
    throw ApiError.conflict('Bu email allaqachon ishlatilgan');
  }
  if (existingEmail) {
    throw ApiError.conflict('Bu email allaqachon ishlatilgan');
  }
  if (pendingStoreName) {
    throw ApiError.conflict("Shu nomdagi do'kon uchun kutilayotgan ariza allaqachon mavjud");
  }

  const username = await allocateStoreUsername(email, storeName);

  let passwordHash = identity.passwordHash;
  if (!passwordHash && storeUserId) {
    const storeUser = await prisma.user.findUnique({
      where: { id: storeUserId },
      select: { passwordHash: true },
    });
    passwordHash = storeUser?.passwordHash ?? null;
  }
  if (!passwordHash) {
    passwordHash = await hashPassword(randomBytes(24).toString('base64url'));
  }

  const record = await storeCreationRepository.createPendingRequest({
    applicantFirstName: firstName,
    applicantLastName: lastName,
    phone,
    email,
    username,
    passwordHash,
    storeName,
    region,
    district,
    address,
    businessType,
    identityId,
  });

  await recordAudit({
    storeId: null,
    actorUserId: storeUserId ?? null,
    eventType: AuditEventType.STORE_CREATION_REQUESTED,
    entityType: AuditEntityType.STORE_CREATION_REQUEST,
    entityId: record.id,
    summary: `Store creation requested: ${storeName}`,
    metadata: {
      requestId: record.id,
      storeName,
      phone,
      region,
      district,
      businessType,
      identityId,
      applicant: applicantFullName(firstName, lastName),
    },
  });

  return storeCreationRepository.toPublicView(record);
}

export async function getPublicStoreRequest(id: string): Promise<StoreCreationRequestPublic> {
  const record = await storeCreationRepository.findById(id);
  if (!record) {
    throw ApiError.notFound("Ariza topilmadi");
  }
  return storeCreationRepository.toPublicView(record);
}

export async function listStoreRequests(options: {
  actorRole: string;
  status?: StoreCreationRequestStatus;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<StoreCreationRequestAdmin> & { pendingCount: number }> {
  assertCanReviewStoreCreationRequests(options.actorRole);

  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);

  const { rows, totalItems, pendingCount } = await storeCreationRepository.listRequests({
    status: options.status,
    page,
    pageSize,
    skip,
    take,
  });

  return {
    items: rows.map(storeCreationRepository.toAdminView),
    meta: buildPaginationMeta(page, pageSize, totalItems),
    pendingCount,
  };
}

export async function getStoreRequestForAdmin(
  actorRole: string,
  id: string,
): Promise<StoreCreationRequestAdmin> {
  assertCanReviewStoreCreationRequests(actorRole);
  const record = await storeCreationRepository.findById(id);
  if (!record) {
    throw ApiError.notFound("Ariza topilmadi");
  }
  return storeCreationRepository.toAdminView(record);
}

export async function getPendingSummary(actorRole: string): Promise<StoreCreationPendingSummary> {
  assertCanReviewStoreCreationRequests(actorRole);
  return { pendingCount: await storeCreationRepository.countPending() };
}

export async function approveStoreRequest(
  actor: { id: string; role: string; storeId: string },
  requestId: string,
): Promise<ApproveStoreCreationResponse> {
  assertCanReviewStoreCreationRequests(actor.role);

  const result = await prisma.$transaction(async (tx) => {
    const request = await storeCreationRepository.loadPendingForUpdate(tx, requestId);
    if (!request) {
      throw ApiError.notFound("Ariza topilmadi");
    }
    if (request.status !== StoreCreationRequestStatus.PENDING) {
      throw ApiError.conflict("Bu ariza allaqachon ko'rib chiqilgan");
    }
    if (!request.passwordHash) {
      throw ApiError.internal("Arizada parol saqlanmagan");
    }

    const store = await tx.store.create({
      data: {
        name: request.storeName,
        phone: request.phone,
        address: composeStoreAddress(request.region, request.district, request.address),
        isActive: true,
        businessType: request.businessType ?? BusinessType.FURNITURE,
      },
      select: { id: true, name: true, isActive: true },
    });

    const owner = await tx.user.create({
      data: {
        storeId: store.id,
        email: request.email,
        username: request.username,
        passwordHash: request.passwordHash,
        fullName: applicantFullName(request.applicantFirstName, request.applicantLastName),
        phone: request.phone,
        role: UserRole.ADMIN,
        isActive: true,
        identityId: request.identityId ?? undefined,
        responsibilities: {
          create: OWNER_RESPONSIBILITIES.map((responsibility) => ({
            storeId: store.id,
            responsibility,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        storeId: true,
      },
    });

    if (DEFAULT_EXPENSE_CATEGORIES.length > 0) {
      await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
          storeId: store.id,
          key: category.key,
          name: category.name,
          color: category.color,
          sortOrder: index,
        })),
      });
    }

    if (DEFAULT_PRODUCT_CATEGORIES.length > 0) {
      await tx.productCategory.createMany({
        data: DEFAULT_PRODUCT_CATEGORIES.map((category) => ({
          storeId: store.id,
          name: category.name,
          sortOrder: category.sortOrder,
        })),
      });
    }

    const updated = await tx.storeCreationRequest.update({
      where: { id: request.id },
      data: {
        status: StoreCreationRequestStatus.APPROVED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        createdStoreId: store.id,
        createdUserId: owner.id,
        passwordHash: null,
      },
      include: { reviewedBy: { select: { id: true, fullName: true } } },
    });

    return { store, owner, updated, request };
  });

  await recordAudit({
    storeId: result.store.id,
    actorUserId: actor.id,
    eventType: AuditEventType.STORE_CREATION_APPROVED,
    entityType: AuditEntityType.STORE_CREATION_REQUEST,
    entityId: result.updated.id,
    summary: `Store created: ${result.store.name}`,
    metadata: {
      requestId: result.updated.id,
      storeId: result.store.id,
      ownerUserId: result.owner.id,
      storeName: result.store.name,
    },
  });

  await provisionStoreSubscription(result.store.id);
  await tryEnsureUserOnBusinessWorkspace(result.owner.id);

  const owner = await prisma.user.findUnique({
    where: { id: result.owner.id },
    select: { identityId: true, storeId: true },
  });
  const workspace = owner?.storeId
    ? await prisma.workspace.findUnique({
        where: { storeId: owner.storeId },
        select: { id: true },
      })
    : null;
  if (owner?.identityId && result.request.referralCode) {
    await attributeRegistration({
      referredIdentityId: owner.identityId,
      referredWorkspaceId: workspace?.id ?? null,
      code: result.request.referralCode,
      visitorKey: result.request.visitorKey,
    });
  } else if (owner?.identityId && workspace?.id) {
    await markReferralAccountCreated(owner.identityId, workspace.id);
  }

  return {
    request: storeCreationRepository.toAdminView({
      ...result.updated,
      reviewedBy: result.updated.reviewedBy,
    }),
    store: {
      id: result.store.id,
      name: result.store.name,
      isActive: result.store.isActive,
    },
    owner: {
      id: result.owner.id,
      email: result.owner.email,
      username: result.owner.username,
      fullName: result.owner.fullName,
      role: UserRole.ADMIN,
      storeId: result.owner.storeId,
    },
  };
}

export async function rejectStoreRequest(
  actor: { id: string; role: string; storeId: string },
  requestId: string,
  reason: string,
): Promise<StoreCreationRequestAdmin> {
  assertCanReviewStoreCreationRequests(actor.role);

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw ApiError.validation('Rad etish sababini kiriting', [
      { field: 'reason', message: 'Rad etish sababini kiriting' },
    ]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await storeCreationRepository.loadPendingForUpdate(tx, requestId);
    if (!request) {
      throw ApiError.notFound("Ariza topilmadi");
    }
    if (request.status !== StoreCreationRequestStatus.PENDING) {
      throw ApiError.conflict("Bu ariza allaqachon ko'rib chiqilgan");
    }

    return tx.storeCreationRequest.update({
      where: { id: request.id },
      data: {
        status: StoreCreationRequestStatus.REJECTED,
        rejectionReason: trimmedReason,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        passwordHash: null,
      },
      include: { reviewedBy: { select: { id: true, fullName: true } } },
    });
  });

  await recordAudit({
    storeId: actor.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.STORE_CREATION_REJECTED,
    entityType: AuditEntityType.STORE_CREATION_REQUEST,
    entityId: updated.id,
    summary: `Store creation rejected: ${updated.storeName}`,
    metadata: {
      requestId: updated.id,
      storeName: updated.storeName,
      reason: trimmedReason,
    },
  });

  return storeCreationRepository.toAdminView(updated);
}
