import type {
  CreateWorkerRequest,
  CreateWorkerResponse,
  MyProfileResponse,
  MyStatsResponse,
  ResetWorkerPasswordRequest,
  ResetWorkerPasswordResponse,
  UpdateWorkerRequest,
  UpdateWorkerResponse,
  WorkerActivityItem,
  WorkerActivityResponse,
  WorkerDetail,
  WorkerDetailResponse,
  WorkerListItem,
  WorkerListQuery,
  WorkerListResponse,
  WorkerSaleItem,
  WorkerSalesResponse,
  WorkerStats,
  WorkerStatsResponse,
  WorkerTaskItem,
  WorkerTasksResponse,
  WorkerResponsibility,
  AssemblyTaskStatus,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const workersService = {
  async list(params: WorkerListQuery = {}, signal?: AbortSignal): Promise<WorkerListResponse> {
    return apiClient.get<WorkerListResponse>('/workers', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        responsibility: params.responsibility,
      },
      signal,
    });
  },

  async get(id: string, signal?: AbortSignal): Promise<WorkerDetail> {
    const { worker } = await apiClient.get<WorkerDetailResponse>(`/workers/${id}`, { signal });
    return worker;
  },

  async create(body: CreateWorkerRequest): Promise<WorkerDetail> {
    const { worker } = await apiClient.post<CreateWorkerResponse>('/workers', { body });
    return worker;
  },

  async update(id: string, body: UpdateWorkerRequest): Promise<WorkerDetail> {
    const { worker } = await apiClient.patch<UpdateWorkerResponse>(`/workers/${id}`, { body });
    return worker;
  },

  async resetPassword(id: string, body: ResetWorkerPasswordRequest): Promise<void> {
    await apiClient.post<ResetWorkerPasswordResponse>(`/workers/${id}/reset-password`, { body });
  },

  async stats(id: string, signal?: AbortSignal): Promise<WorkerStats> {
    const { stats } = await apiClient.get<WorkerStatsResponse>(`/workers/${id}/stats`, { signal });
    return stats;
  },

  async sales(
    id: string,
    params: { page?: number; pageSize?: number; search?: string; from?: string; to?: string } = {},
    signal?: AbortSignal,
  ): Promise<WorkerSalesResponse> {
    return apiClient.get<WorkerSalesResponse>(`/workers/${id}/sales`, {
      searchParams: params,
      signal,
    });
  },

  async tasks(
    id: string,
    status?: AssemblyTaskStatus,
    signal?: AbortSignal,
  ): Promise<WorkerTaskItem[]> {
    const { items } = await apiClient.get<WorkerTasksResponse>(`/workers/${id}/tasks`, {
      searchParams: { status },
      signal,
    });
    return items;
  },

  async activity(id: string, signal?: AbortSignal): Promise<WorkerActivityItem[]> {
    const { items } = await apiClient.get<WorkerActivityResponse>(`/workers/${id}/activity`, {
      signal,
    });
    return items;
  },

  async myProfile(signal?: AbortSignal): Promise<WorkerDetail> {
    const { worker } = await apiClient.get<MyProfileResponse>('/me/profile', { signal });
    return worker;
  },

  async myStats(signal?: AbortSignal): Promise<WorkerStats> {
    const { stats } = await apiClient.get<MyStatsResponse>('/me/stats', { signal });
    return stats;
  },

  async mySales(
    params: { page?: number; pageSize?: number; search?: string; from?: string; to?: string } = {},
    signal?: AbortSignal,
  ): Promise<{ items: WorkerSaleItem[]; meta: WorkerSalesResponse['meta'] }> {
    return apiClient.get<WorkerSalesResponse>('/me/sales', { searchParams: params, signal });
  },

  async myActivity(signal?: AbortSignal): Promise<WorkerActivityItem[]> {
    const { items } = await apiClient.get<WorkerActivityResponse>('/me/activity', { signal });
    return items;
  },
};

export type { WorkerResponsibility, WorkerListItem, WorkerDetail, WorkerStats };
