import type {
  BillingProofDto,
  PersonalBillingResponse,
  PersonalPlanKey,
  PlatformPaymentInstructionsDto,
  RequestPersonalSubscriptionBody,
  StoreBillingRequestsResponse,
  SubscriptionRequestDto,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalBillingService = {
  get(signal?: AbortSignal) {
    return apiClient.get<PersonalBillingResponse>('/personal/billing', { signal });
  },
  getPaymentInstructions(signal?: AbortSignal) {
    return apiClient.get<PlatformPaymentInstructionsDto>('/personal/billing/payment-instructions', {
      signal,
    });
  },
  async uploadProof(file: File) {
    const form = new FormData();
    form.append('image', file);
    const { proof } = await apiClient.post<{ proof: BillingProofDto }>(
      '/personal/billing/payment-proof',
      { body: form },
    );
    return proof;
  },
  requestPayment(body: RequestPersonalSubscriptionBody) {
    return apiClient.post<{ request: SubscriptionRequestDto }>('/personal/billing/payment-requests', {
      body,
    });
  },
  listRequests(signal?: AbortSignal) {
    return apiClient.get<StoreBillingRequestsResponse>('/personal/billing/requests', { signal });
  },
  cancelRequest(id: string) {
    return apiClient.post<{ request: SubscriptionRequestDto }>(
      `/personal/billing/requests/${id}/cancel`,
    );
  },
  select(planKey: PersonalPlanKey) {
    return apiClient.post<PersonalBillingResponse>('/personal/billing/select', {
      body: { planKey },
    });
  },
  markTrialWelcomeSeen() {
    return apiClient.post<PersonalBillingResponse>('/personal/billing/trial-welcome-seen');
  },
};
