import { apiClient } from '@/lib/api-client';

export interface HealthPayload {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}

export const healthService = {
  check: () => apiClient.get<HealthPayload>('/health'),
};
