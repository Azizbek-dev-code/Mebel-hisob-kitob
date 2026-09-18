import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthAchievementsService } from '@/services/personal-growth-achievements.service';

export const personalGrowthAchievementsKeys = {
  all: ['personal', 'growth', 'achievements'] as const,
  list: () => [...personalGrowthAchievementsKeys.all, 'list'] as const,
};

export function useGrowthAchievements() {
  return useQuery({
    queryKey: personalGrowthAchievementsKeys.list(),
    queryFn: ({ signal }) => personalGrowthAchievementsService.list(signal),
  });
}

export function useEvaluateGrowthAchievements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => personalGrowthAchievementsService.evaluate(),
    onSuccess: (data) => {
      queryClient.setQueryData(personalGrowthAchievementsKeys.list(), data);
      void queryClient.invalidateQueries({ queryKey: ['personal', 'growth', 'xp'] });
    },
  });
}
