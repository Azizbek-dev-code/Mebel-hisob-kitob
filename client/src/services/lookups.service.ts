import type {
  CreateCustomerRequest,
  CreateCustomerResponse,
  CustomerLookupItem,
  CustomerLookupResponse,
  ProductLookupItem,
  ProductLookupResponse,
  WorkerLookupItem,
  WorkerLookupResponse,
  WorkerResponsibility,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const lookupsService = {
  async customers(q?: string, signal?: AbortSignal): Promise<CustomerLookupItem[]> {
    const { items } = await apiClient.get<CustomerLookupResponse>('/customers/options', {
      searchParams: { q, limit: 20 },
      signal,
    });
    return items;
  },

  async createCustomer(body: CreateCustomerRequest): Promise<CustomerLookupItem> {
    const { customer } = await apiClient.post<CreateCustomerResponse>('/customers', { body });
    return customer;
  },

  async products(q?: string, signal?: AbortSignal): Promise<ProductLookupItem[]> {
    const { items } = await apiClient.get<ProductLookupResponse>('/products/options', {
      searchParams: { q, limit: 20 },
      signal,
    });
    return items;
  },

  async workers(
    q?: string,
    signal?: AbortSignal,
    responsibility?: WorkerResponsibility,
  ): Promise<WorkerLookupItem[]> {
    const { items } = await apiClient.get<WorkerLookupResponse>('/workers/options', {
      searchParams: { q, limit: 50, responsibility },
      signal,
    });
    return items;
  },
};
