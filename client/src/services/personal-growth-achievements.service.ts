import type { GrowthAchievementsResponse } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthAchievementsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<GrowthAchievementsResponse>('/personal/growth/achievements', {
      signal,
    });
  },
  evaluate() {
    return apiClient.post<GrowthAchievementsResponse>('/personal/growth/achievements/evaluate');
  },
};
