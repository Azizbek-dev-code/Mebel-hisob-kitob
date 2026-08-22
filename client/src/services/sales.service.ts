import type {
  AddPaymentRequest,
  AddPaymentResponse,
  AssemblyTaskListResponse,
  AssemblyTaskResponse,
  CancelSaleRequest,
  CancelSaleResponse,
  CreateSaleRequest,
  CreateSaleResponse,
  PaymentDto,
  SaleDetail,
  SaleDetailResponse,
  SaleListItem,
  SaleListQuery,
  SaleListResponse,
  UpdateAssemblyTaskRequest,
  UpdateSaleRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const salesService = {
  async list(params: SaleListQuery = {}, signal?: AbortSignal): Promise<SaleListResponse> {
    return apiClient.get<SaleListResponse>('/sales', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        paymentStatus: params.paymentStatus,
        sellerId: params.sellerId,
        assemblyStatus: params.assemblyStatus,
        deliveryStatus: params.deliveryStatus,
        status: params.status,
        from: params.from,
        to: params.to,
      },
      signal,
    });
  },

  async get(id: string, signal?: AbortSignal): Promise<SaleDetail> {
    const { sale } = await apiClient.get<SaleDetailResponse>(`/sales/${id}`, { signal });
    return sale;
  },

  async create(body: CreateSaleRequest): Promise<SaleDetail> {
    const { sale } = await apiClient.post<CreateSaleResponse>('/sales', { body });
    return sale;
  },

  async update(id: string, body: UpdateSaleRequest): Promise<SaleDetail> {
    const { sale } = await apiClient.patch<SaleDetailResponse>(`/sales/${id}`, { body });
    return sale;
  },

  async cancel(id: string, body: CancelSaleRequest): Promise<SaleDetail> {
    const { sale } = await apiClient.post<CancelSaleResponse>(`/sales/${id}/cancel`, { body });
    return sale;
  },

  async addPayment(id: string, body: AddPaymentRequest): Promise<AddPaymentResponse> {
    return apiClient.post<AddPaymentResponse>(`/sales/${id}/payments`, { body });
  },

  async listPayments(id: string, signal?: AbortSignal): Promise<PaymentDto[]> {
    const { payments } = await apiClient.get<{ payments: PaymentDto[] }>(`/sales/${id}/payments`, {
      signal,
    });
    return payments;
  },

  async myAssemblyTasks(signal?: AbortSignal) {
    const { items } = await apiClient.get<AssemblyTaskListResponse>('/sales/assembly-tasks/mine', {
      signal,
    });
    return items;
  },

  async updateAssemblyTask(id: string, body: UpdateAssemblyTaskRequest) {
    return apiClient.patch<AssemblyTaskResponse>(`/assembly-tasks/${id}`, { body });
  },
};

export type { SaleListItem, SaleDetail };
