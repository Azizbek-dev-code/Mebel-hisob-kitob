import type {
  AddPaymentRequest,
  AddPaymentResponse,
  DebtListQuery,
  DebtListResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const debtsService = {
  async list(params: DebtListQuery = {}, signal?: AbortSignal): Promise<DebtListResponse> {
    return apiClient.get<DebtListResponse>('/debts', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        filter: params.filter,
      },
      signal,
    });
  },

  async recordPayment(saleId: string, body: AddPaymentRequest): Promise<AddPaymentResponse> {
    return apiClient.post<AddPaymentResponse>(`/debts/${saleId}/payments`, { body });
  },
};
