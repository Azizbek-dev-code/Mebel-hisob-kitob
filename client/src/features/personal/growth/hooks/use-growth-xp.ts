import { useQuery } from '@tanstack/react-query';

import { personalGrowthXpService } from '@/services/personal-growth-xp.service';

export const personalGrowthXpKeys = {
  all: ['personal', 'growth', 'xp'] as const,
  progress: () => [...personalGrowthXpKeys.all, 'progress'] as const,
};

export function useGrowthProgress() {
  return useQuery({
    queryKey: personalGrowthXpKeys.progress(),
    queryFn: async ({ signal }) => {
      const data = await personalGrowthXpService.progress(signal);
      return data.progress;
    },
  });
}
