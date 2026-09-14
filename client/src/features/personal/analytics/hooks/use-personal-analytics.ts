import type { PersonalAnalyticsQuery } from '@furniture-erp/shared';
import { useQuery } from '@tanstack/react-query';

import { personalAnalyticsService } from '@/services/personal-analytics.service';

export const personalAnalyticsKey = (months?: number) => ['personal', 'analytics', months ?? 1] as const;

export function usePersonalAnalytics(query: PersonalAnalyticsQuery = {}) {
  return useQuery({
    queryKey: personalAnalyticsKey(query.months),
    queryFn: ({ signal }) => personalAnalyticsService.get(query, signal),
  });
}
