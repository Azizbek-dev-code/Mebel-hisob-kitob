import type {
  StoreProfile,
  StoreProfileMutationResponse,
  StoreProfileResponse,
  UpdateStoreProfileRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const settingsService = {
  async getStore(signal?: AbortSignal): Promise<StoreProfile> {
    const { store } = await apiClient.get<StoreProfileResponse>('/settings/store', { signal });
    return store;
  },

  async updateStore(body: UpdateStoreProfileRequest): Promise<StoreProfile> {
    const { store } = await apiClient.patch<StoreProfileMutationResponse>('/settings/store', {
      body,
    });
    return store;
  },
};
