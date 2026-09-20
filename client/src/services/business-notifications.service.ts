import type {
  BusinessNotificationListResponse,
  MarkBusinessNotificationsReadRequest,
  UpdateBusinessNotificationPrefsRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const businessNotificationsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<BusinessNotificationListResponse>('/notifications', { signal });
  },
  updatePrefs(body: UpdateBusinessNotificationPrefsRequest) {
    return apiClient.patch<{ prefs: BusinessNotificationListResponse['prefs'] }>('/notifications/prefs', {
      body,
    });
  },
  markRead(body: MarkBusinessNotificationsReadRequest = {}) {
    return apiClient.post<{ unreadCount: number }>('/notifications/read', { body });
  },
};
