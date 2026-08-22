import type {
  CancelPurchaseRequest,
  CreatePurchaseRequest,
  CreateSupplierPaymentRequest,
  CreateSupplierRequest,
  PurchaseDetail,
  PurchaseDetailResponse,
  PurchaseListApiResponse,
  PurchaseListQuery,
  PurchaseMutationResponse,
  ReportsSupplierPayables,
  SupplierDetail,
  SupplierDetailResponse,
  SupplierListApiResponse,
  SupplierListItem,
  SupplierListQuery,
  SupplierMutationResponse,
  SupplierPaymentMutationResponse,
  UpdateSupplierRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * Supplier catalogue + purchase payables API (ADMIN).
 */
export const purchasingService = {
  async listSuppliers(
    query: SupplierListQuery = {},
    signal?: AbortSignal,
  ): Promise<SupplierListApiResponse> {
    return apiClient.get<SupplierListApiResponse>('/suppliers', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        debtFilter: query.debtFilter,
      },
      signal,
    });
  },

  async getSupplier(id: string, signal?: AbortSignal): Promise<SupplierDetail> {
    const { supplier } = await apiClient.get<SupplierDetailResponse>(`/suppliers/${id}`, {
      signal,
    });
    return supplier;
  },

  async createSupplier(body: CreateSupplierRequest): Promise<SupplierListItem> {
    const { supplier } = await apiClient.post<SupplierMutationResponse>('/suppliers', { body });
    return supplier;
  },

  async updateSupplier(id: string, body: UpdateSupplierRequest): Promise<SupplierListItem> {
    const { supplier } = await apiClient.patch<SupplierMutationResponse>(`/suppliers/${id}`, {
      body,
    });
    return supplier;
  },

  async archiveSupplier(id: string): Promise<SupplierListItem> {
    const { supplier } = await apiClient.post<SupplierMutationResponse>(
      `/suppliers/${id}/archive`,
    );
    return supplier;
  },

  async restoreSupplier(id: string): Promise<SupplierListItem> {
    const { supplier } = await apiClient.post<SupplierMutationResponse>(
      `/suppliers/${id}/restore`,
    );
    return supplier;
  },

  async listPurchases(
    query: PurchaseListQuery = {},
    signal?: AbortSignal,
  ): Promise<PurchaseListApiResponse> {
    return apiClient.get<PurchaseListApiResponse>('/purchases', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        paymentFilter: query.paymentFilter,
        supplierId: query.supplierId,
      },
      signal,
    });
  },

  async getPurchase(id: string, signal?: AbortSignal): Promise<PurchaseDetail> {
    const { purchase } = await apiClient.get<PurchaseDetailResponse>(`/purchases/${id}`, {
      signal,
    });
    return purchase;
  },

  async createPurchase(body: CreatePurchaseRequest): Promise<PurchaseDetail> {
    const { purchase } = await apiClient.post<PurchaseMutationResponse>('/purchases', { body });
    return purchase;
  },

  async addPayment(
    purchaseId: string,
    body: CreateSupplierPaymentRequest,
  ): Promise<SupplierPaymentMutationResponse> {
    return apiClient.post<SupplierPaymentMutationResponse>(
      `/purchases/${purchaseId}/payments`,
      { body },
    );
  },

  async cancelPurchase(
    purchaseId: string,
    body: CancelPurchaseRequest,
  ): Promise<PurchaseDetail> {
    const { purchase } = await apiClient.post<PurchaseMutationResponse>(
      `/purchases/${purchaseId}/cancel`,
      { body },
    );
    return purchase;
  },

  async supplierPayables(signal?: AbortSignal): Promise<ReportsSupplierPayables> {
    const { supplierPayables } = await apiClient.get<{
      supplierPayables: ReportsSupplierPayables;
    }>('/reports/supplier-payables', { signal });
    return supplierPayables;
  },
};
