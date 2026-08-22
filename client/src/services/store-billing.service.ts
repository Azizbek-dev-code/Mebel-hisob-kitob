import type {
  RequestStoreSubscriptionBody,
  StoreSubscriptionDto,
  SubscriptionPlanDto,
  SubscriptionRequestDto,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const storeBillingService = {
  listPlans(signal?: AbortSignal) {
    return apiClient.get<{ items: SubscriptionPlanDto[] }>('/billing/plans', { signal });
  },
  getSubscription(signal?: AbortSignal) {
    return apiClient.get<{ subscription: StoreSubscriptionDto | null }>('/billing/subscription', {
      signal,
    });
  },
  markTrialWelcomeSeen() {
    return apiClient.post<{ subscription: StoreSubscriptionDto }>('/billing/trial-welcome-seen');
  },
  requestPayment(body: RequestStoreSubscriptionBody) {
    return apiClient.post<{ request: SubscriptionRequestDto }>('/billing/payment-requests', {
      body,
    });
  },
};
