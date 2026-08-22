import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_EXPENSE_CATEGORIES,
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
  validateStoreCreationDraft,
  type ApproveStoreCreationResponse,
  type CreateStoreRequestBody,
  type PaginatedResult,
  type StoreCreationPendingSummary,
  type StoreCreationRequestAdmin,
  type StoreCreationRequestPublic,
} from '@furniture-erp/shared';

import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import * as storeCreationRepository from '../repositories/store-creation.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import {
  assertCanReviewStoreCreationRequests,
  canReviewStoreCreationRequests,
} from './platform-authorization.js';
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

export async function createStoreRequest(
  input: CreateStoreRequestBody,
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
