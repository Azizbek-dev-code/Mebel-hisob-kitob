import type {
  CreateGrowthAimRequest,
  GrowthAimDto,
  GrowthAimListResponse,
  UpdateGrowthAimRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthAimsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<GrowthAimListResponse>('/personal/growth/aims', { signal });
  },
  create(body: CreateGrowthAimRequest) {
    return apiClient.post<{ aim: GrowthAimDto }>('/personal/growth/aims', { body }).then((data) => data.aim);
  },
  update(id: string, body: UpdateGrowthAimRequest) {
    return apiClient
      .patch<{ aim: GrowthAimDto }>(`/personal/growth/aims/${id}`, { body })
      .then((data) => data.aim);
  },
};
