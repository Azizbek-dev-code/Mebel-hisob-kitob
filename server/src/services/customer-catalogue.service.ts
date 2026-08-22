import {
  AuditEntityType,
  AuditEventType,
  FeatureKey,
  LimitResourceKey,
  CustomerStatus,
  UserRole,
  isNormalizedUzMobile,
  normalizeUzPhone,
  type CreateCustomerCatalogueRequest,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerListQuery,
  type CustomerListResponse,
  type UpdateCustomerRequest,
} from '@furniture-erp/shared';

import * as catalogueRepository from '../repositories/customer-catalogue.repository.js';
import * as debtRepository from '../repositories/debt.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';

const CUSTOMER_ARCHIVERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canArchiveCustomers(role: string): boolean {
  return CUSTOMER_ARCHIVERS.has(role);
}

export function assertCanArchiveCustomers(role: string): void {
  if (!canArchiveCustomers(role)) {
    throw ApiError.forbidden('Only store administrators can archive customers');
  }
}

function validatePhoneOrThrow(phone: string): string {
  const normalised = normalizeUzPhone(phone);
  if (!isNormalizedUzMobile(normalised)) {
    throw ApiError.validation('Phone number looks invalid', [
      { field: 'phone', message: 'Use a Uzbekistan mobile number (+998 XX XXX XX XX)' },
    ]);
  }
  return normalised;
}

function mapUniquePhone(error: unknown): never {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    throw ApiError.validation('A customer with this phone number already exists', [
      { field: 'phone', message: 'Phone must be unique within the store' },
    ]);
  }
  throw error;
}

export async function listCustomers(
  storeId: string,
  _actorRole: string,
  query: CustomerListQuery = {},
): Promise<CustomerListResponse> {
  return catalogueRepository.listCustomers(storeId, query);
}

export async function getCustomer(
  storeId: string,
  _actorRole: string,
  customerId: string,
): Promise<CustomerDetail> {
  const customer = await catalogueRepository.getCustomerDetail(storeId, customerId);
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

export async function createCustomer(
  storeId: string,
  _actorRole: string,
  input: CreateCustomerCatalogueRequest,
  actorUserId?: string | null,
): Promise<CustomerListItem> {
  await assertCanUseFeature(storeId, FeatureKey.CUSTOMERS);
  await assertCanCreateResource(storeId, LimitResourceKey.CUSTOMERS);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) {
    throw ApiError.validation('First name is required', [
      { field: 'firstName', message: 'First name is required' },
    ]);
  }
  if (!lastName) {
    throw ApiError.validation('Last name is required', [
      { field: 'lastName', message: 'Last name is required' },
    ]);
  }

  const phone = validatePhoneOrThrow(input.phone);
  const existing = await catalogueRepository.findCustomerByPhoneVariants(storeId, phone);
  if (existing) {
    throw ApiError.validation('A customer with this phone number already exists', [
      { field: 'phone', message: 'Phone must be unique within the store' },
    ]);
  }

  try {
    const customer = await catalogueRepository.createCatalogueCustomer(storeId, {
      ...input,
      firstName,
      lastName,
      phone,
    });
    await recordAudit({
      storeId,
      actorUserId: actorUserId ?? null,
      eventType: AuditEventType.CUSTOMER_CREATED,
      entityType: AuditEntityType.CUSTOMER,
      entityId: customer.id,
      summary: `Customer created: ${customer.firstName} ${customer.lastName}`,
      metadata: { phone: customer.phone },
    });
    return customer;
  } catch (error) {
    return mapUniquePhone(error);
  }
}

export async function updateCustomer(
  storeId: string,
  _actorRole: string,
  customerId: string,
  input: UpdateCustomerRequest,
  actorUserId?: string | null,
): Promise<CustomerListItem> {
  if (input.phone !== undefined) {
    const phone = validatePhoneOrThrow(input.phone);
    const clash = await catalogueRepository.findCustomerByPhoneVariants(storeId, phone);
    if (clash && clash.id !== customerId) {
      throw ApiError.validation('A customer with this phone number already exists', [
        { field: 'phone', message: 'Phone must be unique within the store' },
      ]);
    }
    input = { ...input, phone };
  }

  try {
    const updated = await catalogueRepository.updateCatalogueCustomer(
      storeId,
      customerId,
      input,
    );
    if (!updated) throw ApiError.notFound('Customer not found');
    await recordAudit({
      storeId,
      actorUserId: actorUserId ?? null,
      eventType: AuditEventType.CUSTOMER_UPDATED,
      entityType: AuditEntityType.CUSTOMER,
      entityId: updated.id,
      summary: `Customer updated: ${updated.firstName} ${updated.lastName}`,
    });
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return mapUniquePhone(error);
  }
}

export async function archiveCustomer(
  storeId: string,
  actorRole: string,
  customerId: string,
  actorUserId?: string | null,
): Promise<CustomerListItem> {
  assertCanArchiveCustomers(actorRole);
  const updated = await catalogueRepository.setCustomerStatus(
    storeId,
    customerId,
    CustomerStatus.ARCHIVED,
  );
  if (!updated) throw ApiError.notFound('Customer not found');
  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.CUSTOMER_ARCHIVED,
    entityType: AuditEntityType.CUSTOMER,
    entityId: updated.id,
    summary: `Customer archived: ${updated.firstName} ${updated.lastName}`,
  });
  return updated;
}

export async function restoreCustomer(
  storeId: string,
  actorRole: string,
  customerId: string,
  actorUserId?: string | null,
): Promise<CustomerListItem> {
  assertCanArchiveCustomers(actorRole);
  const updated = await catalogueRepository.setCustomerStatus(
    storeId,
    customerId,
    CustomerStatus.ACTIVE,
  );
  if (!updated) throw ApiError.notFound('Customer not found');
  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.CUSTOMER_RESTORED,
    entityType: AuditEntityType.CUSTOMER,
    entityId: updated.id,
    summary: `Customer restored: ${updated.firstName} ${updated.lastName}`,
  });
  return updated;
}

/**
 * Store-wide debt totals for reconciliation against /api/debts and reports.
 * Read-only; same source as debt.repository.summarizeDebts.
 */
export async function getStoreDebtSummary(storeId: string) {
  return debtRepository.summarizeDebts(storeId, new Date());
}
