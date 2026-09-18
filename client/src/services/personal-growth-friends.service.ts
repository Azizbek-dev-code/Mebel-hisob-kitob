import type {
  GrowthFriendsListResponse,
  GrowthFriendSearchResponse,
  GrowthSocialPrivacyDto,
  GrowthFriendshipDto,
  SendFriendRequestBody,
  UpdateGrowthSocialPrivacyRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthFriendsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<GrowthFriendsListResponse>('/personal/growth/friends', { signal });
  },
  search(q: string, signal?: AbortSignal) {
    return apiClient.get<GrowthFriendSearchResponse>('/personal/growth/friends/search', {
      signal,
      searchParams: { q },
    });
  },
  request(body: SendFriendRequestBody) {
    return apiClient.post<{ friendship: GrowthFriendshipDto }>(
      '/personal/growth/friends/request',
      { body },
    );
  },
  accept(id: string) {
    return apiClient.post<{ friendship: GrowthFriendshipDto }>(
      `/personal/growth/friends/${id}/accept`,
    );
  },
  decline(id: string) {
    return apiClient.post<{ friendship: GrowthFriendshipDto }>(
      `/personal/growth/friends/${id}/decline`,
    );
  },
  remove(id: string) {
    return apiClient.post<{ ok: boolean }>(`/personal/growth/friends/${id}/remove`);
  },
  block(id: string) {
    return apiClient.post<{ friendship: GrowthFriendshipDto }>(
      `/personal/growth/friends/${id}/block`,
    );
  },
  privacy(signal?: AbortSignal) {
    return apiClient.get<{ privacy: GrowthSocialPrivacyDto }>(
      '/personal/growth/friends/privacy',
      { signal },
    );
  },
  updatePrivacy(body: UpdateGrowthSocialPrivacyRequest) {
    return apiClient.patch<{ privacy: GrowthSocialPrivacyDto }>(
      '/personal/growth/friends/privacy',
      { body },
    );
  },
};
