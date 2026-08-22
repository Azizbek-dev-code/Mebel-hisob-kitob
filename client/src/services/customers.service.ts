import type {
  CreateCustomerCatalogueRequest,
  CustomerDetail,
  CustomerDetailResponse,
  CustomerListApiResponse,
  CustomerListItem,
  CustomerListQuery,
  CustomerMutationResponse,
  UpdateCustomerRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * Customer catalogue API — list/detail/CRUD.
 * POS lookup stays on lookupsService.customers → GET /customers/options.
 */
export const customersService = {
  async list(
    query: CustomerListQuery = {},
    signal?: AbortSignal,
  ): Promise<CustomerListApiResponse> {
    return apiClient.get<CustomerListApiResponse>('/customers', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        debtFilter: query.debtFilter,
        sort: query.sort,
      },
      signal,
    });
  },

  async get(id: string, signal?: AbortSignal): Promise<CustomerDetail> {
    const { customer } = await apiClient.get<CustomerDetailResponse>(`/customers/${id}`, {
      signal,
    });
    return customer;
  },

  async create(body: CreateCustomerCatalogueRequest): Promise<CustomerListItem> {
    const { customer } = await apiClient.post<CustomerMutationResponse>('/customers', { body });
    return customer;
  },

  async update(id: string, body: UpdateCustomerRequest): Promise<CustomerListItem> {
    const { customer } = await apiClient.patch<CustomerMutationResponse>(`/customers/${id}`, {
      body,
    });
    return customer;
  },

  async archive(id: string): Promise<CustomerListItem> {
    const { customer } = await apiClient.post<CustomerMutationResponse>(`/customers/${id}/archive`);
    return customer;
  },

  async restore(id: string): Promise<CustomerListItem> {
    const { customer } = await apiClient.post<CustomerMutationResponse>(`/customers/${id}/restore`);
    return customer;
  },
};
