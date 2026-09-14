import type { PersonalAnalyticsQuery, PersonalAnalyticsResponse } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalAnalyticsService = {
  get(query: PersonalAnalyticsQuery = {}, signal?: AbortSignal) {
    return apiClient.get<PersonalAnalyticsResponse>('/personal/analytics', {
      signal,
      searchParams: { months: query.months },
    });
  },
};
