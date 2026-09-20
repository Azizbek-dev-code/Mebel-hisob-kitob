import type {
  AppFeedbackListResponse,
  AppFeedbackPromptStatus,
  CreateAppFeedbackRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalFeedbackService = {
  list: (signal?: AbortSignal) => apiClient.get<AppFeedbackListResponse>('/personal/feedback', { signal }),
  status: (signal?: AbortSignal) =>
    apiClient.get<{ prompts: AppFeedbackPromptStatus }>('/personal/feedback/status', { signal }),
  create: (body: CreateAppFeedbackRequest) =>
    apiClient.post<{ feedback: unknown }>('/personal/feedback', { body }),
  dismiss: (kind: 'onboarding' | 'outcome') =>
    apiClient.post<void>('/personal/feedback/dismiss', { body: { kind } }),
};
