import { useQuery } from '@tanstack/react-query';

import { personalGrowthPremiumService } from '@/services/personal-growth-premium.service';

export const personalGrowthPremiumKeys = {
  all: ['personal', 'growth', 'premium'] as const,
  quotas: () => [...personalGrowthPremiumKeys.all, 'quotas'] as const,
};

export function useGrowthQuotas() {
  return useQuery({
    queryKey: personalGrowthPremiumKeys.quotas(),
    queryFn: async ({ signal }) => {
      const data = await personalGrowthPremiumService.quotas(signal);
      return data.quotas;
    },
  });
}
