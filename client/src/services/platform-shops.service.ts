import type { PlatformShopListResponse } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const platformShopsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<PlatformShopListResponse>('/platform/shops', { signal });
  },
};
