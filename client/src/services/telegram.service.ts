import type {
  TelegramConnectionStatus,
  TelegramLinkStartResponse,
  UpdateTelegramPrefsRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const telegramService = {
  status(signal?: AbortSignal) {
    return apiClient.get<TelegramConnectionStatus>('/telegram/status', { signal });
  },
  startLink() {
    return apiClient.post<TelegramLinkStartResponse>('/telegram/link/start');
  },
  unlink() {
    return apiClient.post<TelegramConnectionStatus>('/telegram/unlink');
  },
  updatePrefs(body: UpdateTelegramPrefsRequest) {
    return apiClient.patch<TelegramConnectionStatus>('/telegram/prefs', { body });
  },
};
