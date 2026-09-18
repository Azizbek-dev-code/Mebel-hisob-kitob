import {
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
  type GrowthLeaderboardMetric as Metric,
  type GrowthLeaderboardPeriod as Period,
} from '@furniture-erp/shared';
import { useQuery } from '@tanstack/react-query';

import { personalGrowthSocialService } from '@/services/personal-growth-social.service';

export const personalGrowthSocialKeys = {
  all: ['personal', 'growth', 'social'] as const,
  leaderboard: (period: Period, metric: Metric) =>
    [...personalGrowthSocialKeys.all, 'leaderboard', period, metric] as const,
  friendStreaks: () => [...personalGrowthSocialKeys.all, 'friend-streaks'] as const,
};

export function useGrowthLeaderboard(period: Period, metric: Metric) {
  return useQuery({
    queryKey: personalGrowthSocialKeys.leaderboard(period, metric),
    queryFn: ({ signal }) =>
      personalGrowthSocialService.leaderboard(period, metric, signal),
  });
}

export function useGrowthFriendStreaks() {
  return useQuery({
    queryKey: personalGrowthSocialKeys.friendStreaks(),
    queryFn: ({ signal }) => personalGrowthSocialService.friendStreaks(signal),
  });
}

export { GrowthLeaderboardMetric, GrowthLeaderboardPeriod };
