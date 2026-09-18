import type { GrowthQuotaSnapshot } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthPremiumService = {
  async quotas(signal?: AbortSignal) {
    return apiClient.get<{ quotas: GrowthQuotaSnapshot }>('/personal/growth/quotas', {
      signal,
    });
  },
};
