import type { PersonalPlatformStatsResponse } from '@furniture-erp/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function usePersonalPlatformStats(enabled = true) {
  return useQuery({
    queryKey: ['platform', 'personal-stats'],
    queryFn: ({ signal }) =>
      apiClient.get<PersonalPlatformStatsResponse>('/platform/personal/stats', { signal }),
    enabled,
  });
}
