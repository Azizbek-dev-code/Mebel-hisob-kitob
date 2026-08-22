import type {
  ApproveStoreCreationResponse,
  CreateStoreRequestBody,
  CreateStoreRequestResponse,
  RejectStoreCreationResponse,
  StoreCreationPendingSummary,
  StoreCreationRequestDetailResponse,
  StoreCreationRequestListQuery,
  StoreCreationRequestListResponse,
  StoreCreationRequestStatusResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const storeCreationService = {
  create(body: CreateStoreRequestBody, signal?: AbortSignal) {
    return apiClient.post<CreateStoreRequestResponse>('/store-requests', { body, signal });
  },

  getPublic(id: string, signal?: AbortSignal) {
    return apiClient.get<StoreCreationRequestStatusResponse>(`/store-requests/${id}`, { signal });
  },

  list(query: StoreCreationRequestListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<StoreCreationRequestListResponse>('/platform/store-requests', {
      searchParams: {
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    });
  },

  get(id: string, signal?: AbortSignal) {
    return apiClient.get<StoreCreationRequestDetailResponse>(`/platform/store-requests/${id}`, {
      signal,
    });
  },

  summary(signal?: AbortSignal) {
    return apiClient.get<StoreCreationPendingSummary>('/platform/store-requests/summary', {
      signal,
    });
  },

  approve(id: string) {
    return apiClient.post<ApproveStoreCreationResponse>(`/platform/store-requests/${id}/approve`);
  },

  reject(id: string, reason: string) {
    return apiClient.post<RejectStoreCreationResponse>(`/platform/store-requests/${id}/reject`, {
      body: { reason },
    });
  },
};
