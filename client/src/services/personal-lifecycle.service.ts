import type {
  CreatePersonalDebtPaymentRequest,
  CreatePersonalDebtRequest,
  CreatePersonalRecurringRuleRequest,
  PersonalDebtListResponse,
  PersonalNotificationListResponse,
  PersonalRecurringListResponse,
  UpdatePersonalDebtRequest,
  UpdatePersonalNotificationPrefsRequest,
  UpdatePersonalRecurringRuleRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalLifecycleService = {
  recurring(signal?: AbortSignal) {
    return apiClient.get<PersonalRecurringListResponse>('/personal/recurring', { signal });
  },
  createRecurring(body: CreatePersonalRecurringRuleRequest) {
    return apiClient.post<{ rule: PersonalRecurringListResponse['items'][number] }>(
      '/personal/recurring',
      { body },
    );
  },
  updateRecurring(id: string, body: UpdatePersonalRecurringRuleRequest) {
    return apiClient.patch<{ rule: PersonalRecurringListResponse['items'][number] }>(
      `/personal/recurring/${id}`,
      { body },
    );
  },
  acknowledgeRecurring(id: string) {
    return apiClient.post<{ rule: PersonalRecurringListResponse['items'][number] }>(
      `/personal/recurring/${id}/acknowledge`,
    );
  },
  logRecurring(id: string) {
    return apiClient.post<{ rule: PersonalRecurringListResponse['items'][number] }>(
      `/personal/recurring/${id}/log`,
    );
  },
  debts(signal?: AbortSignal) {
    return apiClient.get<PersonalDebtListResponse>('/personal/debts', { signal });
  },
  createDebt(body: CreatePersonalDebtRequest) {
    return apiClient.post<{ debt: PersonalDebtListResponse['items'][number] }>('/personal/debts', {
      body,
    });
  },
  updateDebt(id: string, body: UpdatePersonalDebtRequest) {
    return apiClient.patch<{ debt: PersonalDebtListResponse['items'][number] }>(
      `/personal/debts/${id}`,
      { body },
    );
  },
  payDebt(id: string, body: CreatePersonalDebtPaymentRequest) {
    return apiClient.post<{ debt: PersonalDebtListResponse['items'][number] }>(
      `/personal/debts/${id}/payments`,
      { body },
    );
  },
  notifications(signal?: AbortSignal) {
    return apiClient.get<PersonalNotificationListResponse>('/personal/notifications', { signal });
  },
  updateNotificationPrefs(body: UpdatePersonalNotificationPrefsRequest) {
    return apiClient.patch<{ prefs: PersonalNotificationListResponse['prefs'] }>(
      '/personal/notifications/prefs',
      { body },
    );
  },
};
