import type {
  GlobalMonthlyCompetitionDto,
  GlobalRewardDeliveryStatus,
  PlatformGlobalCompetitionDetailDto,
  PlatformGlobalCompetitionListResponse,
  UpsertGlobalMonthlyCompetitionBody,
  UpsertGlobalMonthlyRewardBody,
  UpdateGlobalWinnerDeliveryBody,
  GlobalMonthlyRewardDto,
  GlobalMonthlyWinnerDto,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const platformGlobalRankingService = {
  list: (signal?: AbortSignal) =>
    apiClient.get<PlatformGlobalCompetitionListResponse>('/platform/global-ranking/competitions', { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<{ competition: PlatformGlobalCompetitionDetailDto }>(
      `/platform/global-ranking/competitions/${id}`,
      { signal },
    ),
  upsert: (body: UpsertGlobalMonthlyCompetitionBody) =>
    apiClient.post<{ competition: GlobalMonthlyCompetitionDto }>('/platform/global-ranking/competitions', {
      body,
    }),
  upsertReward: (competitionId: string, body: UpsertGlobalMonthlyRewardBody) =>
    apiClient.put<{ reward: GlobalMonthlyRewardDto }>(
      `/platform/global-ranking/competitions/${competitionId}/rewards`,
      { body },
    ),
  finalize: (id: string) =>
    apiClient.post<{ competition: PlatformGlobalCompetitionDetailDto }>(
      `/platform/global-ranking/competitions/${id}/finalize`,
    ),
  updateDelivery: (winnerId: string, body: UpdateGlobalWinnerDeliveryBody) =>
    apiClient.patch<{ winner: GlobalMonthlyWinnerDto }>(
      `/platform/global-ranking/winners/${winnerId}/delivery`,
      { body },
    ),
};

export type { GlobalRewardDeliveryStatus };
