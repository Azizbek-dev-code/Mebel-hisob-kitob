import {
  AuditEntityType,
  AuditEventType,
  UserRole,
  WorkerActivityType,
  type CreateWorkerRequest,
  type ResetWorkerPasswordRequest,
  type UpdateWorkerRequest,
  type WorkerActivityItem,
  type WorkerAttributedFeesSummary,
  type WorkerDetail,
  type WorkerListItem,
  type WorkerResponsibility,
  type WorkerSaleItem,
  type WorkerStats,
  type WorkerTaskItem,
  type AssemblyTaskStatus,
} from '@furniture-erp/shared';
import type { PaginationMeta } from '@furniture-erp/shared';

import { FeatureKey, LimitResourceKey } from '@furniture-erp/shared';

import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import * as workerRepository from '../repositories/worker.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertAccountNotDeleted } from './account-deletion.service.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';
import * as sellerCommissionService from './seller-commission.service.js';

const WORKER_MANAGERS: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.PLATFORM_ADMIN]);

export function canManageWorkers(role: string): boolean {
  return WORKER_MANAGERS.has(role);
}

export function assertCanManageWorkers(role: string): void {
  if (!canManageWorkers(role)) {
    throw ApiError.forbidden('Only store administrators can manage workers');
  }
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(' ');
  if (space === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}

function deriveEmail(storeId: string, username: string, email?: string): string {
  if (email?.trim()) return email.trim().toLowerCase();
  return `${normaliseUsername(username)}.${storeId.slice(-8)}@workers.local`;
}

export async function listWorkers(options: {
  storeId: string;
  actorRole: string;
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  responsibility?: WorkerResponsibility;
}): Promise<{ items: WorkerListItem[]; meta: PaginationMeta }> {
  assertCanManageWorkers(options.actorRole);
  return workerRepository.listWorkers({
    storeId: options.storeId,
    page: options.page,
    pageSize: options.pageSize,
    search: options.search,
    isActive: options.isActive,
    responsibility: options.responsibility,
  });
}

export async function getWorker(
  storeId: string,
  actorRole: string,
  workerId: string,
): Promise<WorkerDetail> {
  assertCanManageWorkers(actorRole);
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  const stats = await workerRepository.computeWorkerStats(storeId, workerId);
  return workerRepository.toWorkerDetail(record, stats);
}

export async function getWorkerStats(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
): Promise<WorkerStats> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  return workerRepository.computeWorkerStats(storeId, workerId);
}

export async function createWorker(
  storeId: string,
  actor: { id: string; role: string },
  input: CreateWorkerRequest,
): Promise<WorkerDetail> {
  assertCanManageWorkers(actor.role);
  await assertCanUseFeature(storeId, FeatureKey.WORKERS);
  await assertCanCreateResource(storeId, LimitResourceKey.WORKERS);

  if (!input.responsibilities.length) {
    throw ApiError.validation('Select at least one responsibility');
  }

  const username = normaliseUsername(input.username);
  const email = deriveEmail(storeId, username, input.email);

  const [usernameTaken, emailTaken] = await Promise.all([
    workerRepository.findWorkerByUsername(storeId, username),
    workerRepository.findWorkerByEmail(storeId, email),
  ]);
  if (usernameTaken) {
    throw ApiError.conflict('A worker with this username already exists');
  }
  if (emailTaken) {
    throw ApiError.conflict('A worker with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const fullName = buildFullName(input.firstName, input.lastName);

  const record = await prisma.$transaction(async (tx) => {
    const created = await workerRepository.createWorkerTx(tx, {
      storeId,
      email,
      username,
      passwordHash,
      fullName,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive ?? true,
      responsibilities: input.responsibilities,
    });

    await workerRepository.recordActivity(
      {
        storeId,
        workerId: created.id,
        actorId: actor.id,
        type: WorkerActivityType.WORKER_CREATED,
        message: `Created worker ${fullName}`,
      },
      tx,
    );

    return created;
  });

  const stats = await workerRepository.computeWorkerStats(storeId, record.id);
  const detail = workerRepository.toWorkerDetail(record, stats);

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.WORKER_CREATED,
    entityType: AuditEntityType.WORKER,
    entityId: detail.id,
    summary: `Worker created: ${detail.fullName}`,
    metadata: { username: detail.username, responsibilities: detail.responsibilities },
  });

  return detail;
}

export async function updateWorker(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  input: UpdateWorkerRequest,
): Promise<WorkerDetail> {
  assertCanManageWorkers(actor.role);

  const existing = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!existing) {
    throw ApiError.notFound('Worker not found');
  }

  if (input.isActive === false && workerId === actor.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  if (input.isActive === true) {
    await assertAccountNotDeleted(storeId, workerId);
  }

  if (input.responsibilities && input.responsibilities.length === 0) {
    throw ApiError.validation('Select at least one responsibility');
  }

  let fullName: string | undefined;
  if (input.firstName !== undefined || input.lastName !== undefined) {
    const current = splitFullName(existing.fullName);
    fullName = buildFullName(
      input.firstName ?? current.firstName,
      input.lastName ?? current.lastName,
    );
  }

  const wasActive = existing.isActive;
  const willBeActive = input.isActive ?? wasActive;

  const record = await prisma.$transaction(async (tx) => {
    const updated = await workerRepository.updateWorkerTx(tx, storeId, workerId, {
      fullName,
      phone: input.phone,
      notes: input.notes,
      isActive: input.isActive,
      responsibilities: input.responsibilities,
    });

    if (wasActive !== willBeActive) {
      await workerRepository.recordActivity(
        {
          storeId,
          workerId,
          actorId: actor.id,
          type: willBeActive
            ? WorkerActivityType.WORKER_ACTIVATED
            : WorkerActivityType.WORKER_DEACTIVATED,
          message: willBeActive ? 'Worker activated' : 'Worker deactivated',
        },
        tx,
      );
    } else {
      await workerRepository.recordActivity(
        {
          storeId,
          workerId,
          actorId: actor.id,
          type: WorkerActivityType.WORKER_UPDATED,
          message: 'Worker profile updated',
        },
        tx,
      );
    }

    return updated;
  });

  const stats = await workerRepository.computeWorkerStats(storeId, workerId);
  const detail = workerRepository.toWorkerDetail(record, stats);

  if (wasActive && !willBeActive) {
    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.USER_DISABLED,
      entityType: AuditEntityType.USER,
      entityId: detail.id,
      summary: `Worker deactivated: ${detail.fullName}`,
    });
  }

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.WORKER_UPDATED,
    entityType: AuditEntityType.WORKER,
    entityId: detail.id,
    summary: `Worker updated: ${detail.fullName}`,
    metadata: {
      isActive: detail.isActive,
      responsibilitiesChanged: Boolean(input.responsibilities),
    },
  });

  return detail;
}

export async function resetWorkerPassword(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  input: ResetWorkerPasswordRequest,
): Promise<void> {
  assertCanManageWorkers(actor.role);

  const existing = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!existing) {
    throw ApiError.notFound('Worker not found');
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: workerId }, data: { passwordHash } });
    await workerRepository.recordActivity(
      {
        storeId,
        workerId,
        actorId: actor.id,
        type: WorkerActivityType.PASSWORD_RESET,
        message: 'Password reset by administrator',
      },
      tx,
    );
  });
}

export async function getMyProfile(storeId: string, workerId: string): Promise<WorkerDetail> {
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  const stats = await workerRepository.computeWorkerStats(storeId, workerId);
  return workerRepository.toWorkerDetail(record, stats);
}

export async function listWorkerSales(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  } = {},
): Promise<{ items: WorkerSaleItem[]; meta: PaginationMeta }> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  const { rows, meta } = await workerRepository.listWorkerSales(storeId, workerId, options);
  const items = await sellerCommissionService.decorateSellerSales(storeId, workerId, rows);
  return { items, meta };
}

export async function listWorkerTasks(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  status?: AssemblyTaskStatus,
): Promise<WorkerTaskItem[]> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  return workerRepository.listWorkerTasks(storeId, workerId, status);
}

export async function listWorkerActivity(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
): Promise<WorkerActivityItem[]> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  return workerRepository.listWorkerActivity(storeId, workerId);
}

export async function listMySales(
  storeId: string,
  workerId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  } = {},
): Promise<{ items: WorkerSaleItem[]; meta: PaginationMeta }> {
  const { rows, meta } = await workerRepository.listWorkerSales(storeId, workerId, options);
  const items = await sellerCommissionService.decorateSellerSales(storeId, workerId, rows);
  return { items, meta };
}

export async function listMyActivity(storeId: string, workerId: string) {
  return workerRepository.listWorkerActivity(storeId, workerId);
}

/**
 * Fees attributed from Sale / Purchase documents for the worker profile.
 * Admin can view any worker; workers can view their own.
 */
export async function listWorkerAttributedFees(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
): Promise<WorkerAttributedFeesSummary> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  return workerRepository.listWorkerAttributedFees(storeId, workerId);
}

export async function listMyAttributedFees(
  storeId: string,
  workerId: string,
): Promise<WorkerAttributedFeesSummary> {
  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) {
    throw ApiError.notFound('Worker not found');
  }
  return workerRepository.listWorkerAttributedFees(storeId, workerId);
}
