import type {
  CreateCustomerRequest,
  CustomerLookupItem,
  ProductLookupItem,
  WorkerLookupItem,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { FeatureKey, LimitResourceKey, normalizeUzPhone } from '@furniture-erp/shared';

import * as catalogueRepository from '../repositories/customer-catalogue.repository.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as productRepository from '../repositories/product.repository.js';
import * as workerRepository from '../repositories/worker.repository.js';
import { ApiError } from '../utils/api-error.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';

/** Minimal store-scoped lookups used by the sale form. Full modules come later. */

export function searchCustomers(
  storeId: string,
  query: string | undefined,
  limit?: number,
): Promise<CustomerLookupItem[]> {
  return customerRepository.searchCustomers(storeId, query, limit);
}

export function searchProducts(
  storeId: string,
  query: string | undefined,
  limit?: number,
): Promise<ProductLookupItem[]> {
  return productRepository.searchProducts(storeId, query, limit);
}

export function searchWorkers(
  storeId: string,
  query: string | undefined,
  limit?: number,
  responsibility?: WorkerResponsibility,
): Promise<WorkerLookupItem[]> {
  return workerRepository.searchWorkers(storeId, query, limit, responsibility);
}

export async function createCustomer(
  storeId: string,
  input: CreateCustomerRequest,
): Promise<CustomerLookupItem> {
  await assertCanUseFeature(storeId, FeatureKey.CUSTOMERS);
  await assertCanCreateResource(storeId, LimitResourceKey.CUSTOMERS);
  const phone = normalizeUzPhone(input.phone);
  const existing = await catalogueRepository.findCustomerByPhoneVariants(storeId, phone);
  if (existing) {
    throw ApiError.conflict('A customer with this phone number already exists');
  }

  return customerRepository.createCustomer(storeId, { ...input, phone });
}
