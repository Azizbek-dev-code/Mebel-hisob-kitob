import { apiClient } from '@/lib/api-client';

export interface HealthPayload {
  status: 'ok' | 'degraded';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  database?: 'up' | 'down';
  /** Telegram bot status only — never a token or secret. */
  telegram?: {
    configured: boolean;
    connected: boolean;
  };
}

export const healthService = {
  check: () => apiClient.get<HealthPayload>('/health'),
};
