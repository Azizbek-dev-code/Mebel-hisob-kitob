import type {
  GrowthFriendStreaksResponse,
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
  GrowthLeaderboardResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthSocialService = {
  leaderboard(
    period: GrowthLeaderboardPeriod,
    metric: GrowthLeaderboardMetric,
    signal?: AbortSignal,
  ) {
    return apiClient.get<GrowthLeaderboardResponse>('/personal/growth/leaderboard', {
      signal,
      searchParams: { period, metric },
    });
  },
  friendStreaks(signal?: AbortSignal) {
    return apiClient.get<GrowthFriendStreaksResponse>('/personal/growth/friend-streaks', {
      signal,
    });
  },
};
