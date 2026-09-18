import type {
  CreateGrowthChallengeRequest,
  GrowthChallengeDto,
  GrowthChallengesListResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthChallengesService = {
  list(signal?: AbortSignal) {
    return apiClient.get<GrowthChallengesListResponse>('/personal/growth/challenges', {
      signal,
    });
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.get<{ challenge: GrowthChallengeDto }>(
      `/personal/growth/challenges/${id}`,
      { signal },
    );
  },
  create(body: CreateGrowthChallengeRequest) {
    return apiClient.post<{ challenge: GrowthChallengeDto }>('/personal/growth/challenges', {
      body,
    });
  },
  accept(id: string) {
    return apiClient.post<{ challenge: GrowthChallengeDto }>(
      `/personal/growth/challenges/${id}/accept`,
    );
  },
  decline(id: string) {
    return apiClient.post<{ challenge: GrowthChallengeDto }>(
      `/personal/growth/challenges/${id}/decline`,
    );
  },
  cancel(id: string) {
    return apiClient.post<{ challenge: GrowthChallengeDto }>(
      `/personal/growth/challenges/${id}/cancel`,
    );
  },
};
