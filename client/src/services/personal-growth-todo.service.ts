import type {
  CreateGrowthTodoRequest,
  GrowthTodayTodosResponse,
  GrowthTodoListResponse,
  SuggestGrowthTodoRequest,
  SuggestGrowthTodoResponse,
  UpdateGrowthTodoRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthTodoService = {
  list(status?: string, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const q = params.toString();
    return apiClient.get<GrowthTodoListResponse>(
      `/personal/growth/todos${q ? `?${q}` : ''}`,
      { signal },
    );
  },
  today(signal?: AbortSignal) {
    return apiClient.get<GrowthTodayTodosResponse>('/personal/growth/todos/today', { signal });
  },
  suggest(body: SuggestGrowthTodoRequest) {
    return apiClient.post<SuggestGrowthTodoResponse>('/personal/growth/todos/suggest', { body });
  },
  create(body: CreateGrowthTodoRequest) {
    return apiClient.post<{ todo: GrowthTodoListResponse['items'][number] }>(
      '/personal/growth/todos',
      { body },
    );
  },
  update(id: string, body: UpdateGrowthTodoRequest) {
    return apiClient.patch<{ todo: GrowthTodoListResponse['items'][number] }>(
      `/personal/growth/todos/${id}`,
      { body },
    );
  },
};
