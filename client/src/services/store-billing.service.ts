import type {
  BillingProofDto,
  PlatformPaymentInstructionsDto,
  RequestStoreSubscriptionBody,
  StoreBillingPaymentsResponse,
  StoreBillingRequestsResponse,
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
  getPaymentInstructions(signal?: AbortSignal) {
    return apiClient.get<PlatformPaymentInstructionsDto>('/billing/payment-instructions', { signal });
  },
  async uploadProof(file: File) {
    const form = new FormData();
    form.append('image', file);
    const { proof } = await apiClient.post<{ proof: BillingProofDto }>('/billing/payment-proof', {
      body: form,
    });
    return proof;
  },
  markTrialWelcomeSeen() {
    return apiClient.post<{ subscription: StoreSubscriptionDto }>('/billing/trial-welcome-seen');
  },
  requestPayment(body: RequestStoreSubscriptionBody) {
    return apiClient.post<{ request: SubscriptionRequestDto }>('/billing/payment-requests', {
      body,
    });
  },
  listRequests(signal?: AbortSignal) {
    return apiClient.get<StoreBillingRequestsResponse>('/billing/requests', { signal });
  },
  cancelRequest(id: string) {
    return apiClient.post<{ request: SubscriptionRequestDto }>(`/billing/requests/${id}/cancel`);
  },
  listPayments(signal?: AbortSignal) {
    return apiClient.get<StoreBillingPaymentsResponse>('/billing/payments', { signal });
  },
};
