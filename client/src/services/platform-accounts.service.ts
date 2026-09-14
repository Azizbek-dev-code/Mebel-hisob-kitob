import type {
  PlatformAccountDetailResponse,
  PlatformAccountListQuery,
  PlatformAccountListResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

function queryString(query: PlatformAccountListQuery): string {
  const params = new URLSearchParams();
  if (query.accountType) params.set('accountType', query.accountType);
  if (query.status) params.set('status', query.status);
  if (query.businessType) params.set('businessType', query.businessType);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const platformAccountsService = {
  list(query: PlatformAccountListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<PlatformAccountListResponse>(`/platform/accounts${queryString(query)}`, {
      signal,
    });
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.get<PlatformAccountDetailResponse>(
      `/platform/accounts/${encodeURIComponent(id)}`,
      { signal },
    );
  },
};
