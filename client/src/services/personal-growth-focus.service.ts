import type {
  CompleteGrowthFocusRequest,
  GrowthFocusSessionDto,
  GrowthFocusStatsResponse,
  StartGrowthFocusRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthFocusService = {
  stats(signal?: AbortSignal) {
    return apiClient.get<GrowthFocusStatsResponse>('/personal/growth/focus/stats', { signal });
  },
  active(signal?: AbortSignal) {
    return apiClient.get<{ session: GrowthFocusSessionDto | null }>(
      '/personal/growth/focus/active',
      { signal },
    );
  },
  start(body: StartGrowthFocusRequest) {
    return apiClient.post<{ session: GrowthFocusSessionDto }>('/personal/growth/focus/start', {
      body,
    });
  },
  complete(id: string, body: CompleteGrowthFocusRequest = {}) {
    return apiClient.post<{ session: GrowthFocusSessionDto }>(
      `/personal/growth/focus/${id}/complete`,
      { body },
    );
  },
};
