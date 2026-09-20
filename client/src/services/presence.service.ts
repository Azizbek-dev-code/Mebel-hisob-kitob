import type {
  AnalyticsEventsBatchRequest,
  PresenceHeartbeatRequest,
  PresenceHeartbeatResponse,
  PresenceStatusDto,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const presenceService = {
  heartbeat(body: PresenceHeartbeatRequest) {
    return apiClient.post<PresenceHeartbeatResponse>('/presence/heartbeat', { body });
  },
  status(identityId: string, signal?: AbortSignal) {
    return apiClient.get<PresenceStatusDto>(`/presence/status/${identityId}`, { signal });
  },
  events(body: AnalyticsEventsBatchRequest) {
    return apiClient.post<{ stored: number }>('/presence/events', { body });
  },
};
