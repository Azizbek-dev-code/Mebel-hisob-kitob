import {
  AuditEntityType,
  AuditEventType,
  STORE_RESET_CONFIRMATION,
  UserRole,
  isAllowedStoreTimezone,
  isNormalizedUzMobile,
  normalizeUzPhone,
  type ResetStoreResponse,
  type StoreProfile,
  type UpdateStoreProfileRequest,
} from '@furniture-erp/shared';

import * as backupRepository from '../repositories/backup.repository.js';
import * as settingsRepository from '../repositories/settings.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';

const STORE_SETTINGS_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManageStoreSettings(role: string): boolean {
  return STORE_SETTINGS_MANAGERS.has(role);
}

export function assertCanManageStoreSettings(role: string): void {
  if (!canManageStoreSettings(role)) {
    throw ApiError.forbidden('Only store administrators can update store settings');
  }
}

function normalizeOptionalPhone(phone: string | null | undefined): string | null {
  if (phone === undefined || phone === null) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  const normalised = normalizeUzPhone(trimmed);
  if (!isNormalizedUzMobile(normalised)) {
    throw ApiError.validation('Phone number looks invalid', [
      { field: 'phone', message: 'Use a Uzbekistan mobile number (+998 XX XXX XX XX)' },
    ]);
  }
  return normalised;
}

export async function getStoreProfile(
  storeId: string,
  _actorRole: string,
): Promise<StoreProfile> {
  const store = await settingsRepository.findStoreProfile(storeId);
  if (!store) throw ApiError.notFound('Store not found');
  return store;
}

export async function updateStoreProfile(
  storeId: string,
  actorRole: string,
  input: UpdateStoreProfileRequest,
  actorUserId?: string | null,
): Promise<StoreProfile> {
  assertCanManageStoreSettings(actorRole);

  const payload: settingsRepository.UpdateStoreProfileData = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw ApiError.validation('Store name is required', [
        { field: 'name', message: 'Name is required' },
      ]);
    }
    payload.name = name;
  }

  if (input.phone !== undefined) {
    payload.phone = normalizeOptionalPhone(input.phone);
  }

  if (input.address !== undefined) {
    const address = input.address?.trim() ?? '';
    payload.address = address ? address : null;
  }

  if (input.timezone !== undefined) {
    if (!isAllowedStoreTimezone(input.timezone)) {
      throw ApiError.validation('Timezone is not supported', [
        { field: 'timezone', message: 'Choose a supported timezone' },
      ]);
    }
    payload.timezone = input.timezone;
  }

  if (Object.keys(payload).length === 0) {
    throw ApiError.validation('At least one field is required', [
      { field: 'body', message: 'Provide at least one field to update' },
    ]);
  }

  const existing = await settingsRepository.findStoreProfile(storeId);
  if (!existing) throw ApiError.notFound('Store not found');

  const updated = await settingsRepository.updateStoreProfile(storeId, payload);

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.STORE_SETTINGS_UPDATED,
    entityType: AuditEntityType.STORE,
    entityId: storeId,
    summary: `Store settings updated (${Object.keys(payload).join(', ')})`,
    metadata: { fields: Object.keys(payload) },
  });

  return updated;
}

/**
 * Wipe all store business data (sales, stock, customers, worker finances, …)
 * while keeping the acting admin login, store row, subscription, and audit trail.
 */
export async function resetStoreProfile(
  storeId: string,
  actor: { id: string; role: string },
  confirmation: string,
): Promise<ResetStoreResponse> {
  assertCanManageStoreSettings(actor.role);

  if (confirmation !== STORE_RESET_CONFIRMATION) {
    throw ApiError.validation('Confirmation phrase is required', [
      {
        field: 'confirmation',
        message: `Type ${STORE_RESET_CONFIRMATION} exactly to confirm`,
      },
    ]);
  }

  const result = await backupRepository.resetStoreData({
    storeId,
    actorId: actor.id,
  });

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.STORE_DATA_RESET,
    entityType: AuditEntityType.STORE,
    entityId: storeId,
    summary: 'Store data factory reset — business rows wiped, admin retained',
    metadata: {
      totalDeletedRows: result.totalDeletedRows,
      retainedUserId: result.retainedUserId,
    },
  });

  return {
    deletedCounts: result.deletedCounts,
    totalDeletedRows: result.totalDeletedRows,
    retainedUserId: result.retainedUserId,
  };
}
