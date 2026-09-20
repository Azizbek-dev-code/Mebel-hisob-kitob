import type {
  GlobalLeaderboardPeriod,
  GlobalRankingListResponse,
  GlobalRankingProfileDto,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthRankingService = {
  list: (period: GlobalLeaderboardPeriod, page: number, signal?: AbortSignal) =>
    apiClient.get<GlobalRankingListResponse>('/personal/growth/global-ranking', {
      signal,
      searchParams: { period, page, pageSize: 20 },
    }),
  profile: (id: string, signal?: AbortSignal) =>
    apiClient.get<{ profile: GlobalRankingProfileDto }>(`/personal/growth/global-ranking/${id}`, { signal }),
  like: (id: string) => apiClient.post<{ liked: boolean; likeCount: number }>(`/personal/growth/feedback/${id}/like`),
};
