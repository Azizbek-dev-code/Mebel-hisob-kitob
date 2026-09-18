import type {
  GrowthNotificationsListResponse,
  MarkGrowthNotificationsRequest,
  UpdateGrowthNotificationPrefsRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthNotificationsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<GrowthNotificationsListResponse>('/personal/growth/notifications', {
      signal,
    });
  },
  markRead(body: MarkGrowthNotificationsRequest = {}) {
    return apiClient.post<{ updated: number }>('/personal/growth/notifications/read', { body });
  },
  dismiss(id: string) {
    return apiClient.post<{ ok: boolean }>(`/personal/growth/notifications/${id}/dismiss`);
  },
  updatePrefs(body: UpdateGrowthNotificationPrefsRequest) {
    return apiClient.patch<{ prefs: GrowthNotificationsListResponse['prefs'] }>(
      '/personal/growth/notifications/prefs',
      { body },
    );
  },
};
