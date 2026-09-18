import type { GrowthProgressDto } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthXpService = {
  progress(signal?: AbortSignal) {
    return apiClient.get<{ progress: GrowthProgressDto }>('/personal/growth/progress', {
      signal,
    });
  },
};
