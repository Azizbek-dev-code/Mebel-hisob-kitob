import type {
  PlatformUsageFeaturesResponse,
  PlatformUsageOverviewDto,
  PlatformUsageRetentionDto,
  PlatformUsageUserDetailDto,
  PlatformUsageUsersResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const platformUsageAnalyticsService = {
  overview(signal?: AbortSignal) {
    return apiClient.get<PlatformUsageOverviewDto>('/platform/usage/overview', { signal });
  },
  users(page: number, signal?: AbortSignal) {
    return apiClient.get<PlatformUsageUsersResponse>('/platform/usage/users', {
      signal,
      searchParams: { page, pageSize: 20 },
    });
  },
  user(id: string, signal?: AbortSignal) {
    return apiClient.get<{ user: PlatformUsageUserDetailDto }>(`/platform/usage/users/${id}`, {
      signal,
    });
  },
  features(signal?: AbortSignal) {
    return apiClient.get<PlatformUsageFeaturesResponse>('/platform/usage/features', { signal });
  },
  retention(signal?: AbortSignal) {
    return apiClient.get<PlatformUsageRetentionDto>('/platform/usage/retention', { signal });
  },
};
