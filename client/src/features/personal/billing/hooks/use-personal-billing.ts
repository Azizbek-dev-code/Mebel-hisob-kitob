import {
  isPersonalAuth,
  type AuthPrincipal,
  type PersonalBillingResponse,
  type PersonalPlanKey,
  type RequestPersonalSubscriptionBody,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { authQueryKeys } from '@/features/auth/hooks/use-auth';
import { personalBillingService } from '@/services/personal-billing.service';

export const personalBillingQueryKey = ['personal', 'billing'] as const;

export function usePersonalBilling() {
  return useQuery({
    queryKey: personalBillingQueryKey,
    queryFn: ({ signal }) => personalBillingService.get(signal),
  });
}

export function usePersonalPaymentInstructions(enabled: boolean) {
  return useQuery({
    queryKey: ['personal', 'billing', 'payment-instructions'],
    queryFn: ({ signal }) => personalBillingService.getPaymentInstructions(signal),
    enabled,
  });
}

function patchPersonalSubscription(queryClient: QueryClient, data: PersonalBillingResponse) {
  queryClient.setQueryData(personalBillingQueryKey, data);
  queryClient.setQueryData<AuthPrincipal | null>(authQueryKeys.currentUser, (prev) => {
    if (!prev || !isPersonalAuth(prev)) return prev;
    return { ...prev, subscription: data.subscription };
  });
  void queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
}

export function useSelectPersonalPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planKey: PersonalPlanKey) => personalBillingService.select(planKey),
    onSuccess: (data) => {
      patchPersonalSubscription(queryClient, data);
    },
  });
}

export function useRequestPersonalPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestPersonalSubscriptionBody) => personalBillingService.requestPayment(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personalBillingQueryKey });
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
    },
  });
}

export function useMarkPersonalTrialWelcomeSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => personalBillingService.markTrialWelcomeSeen(),
    onSuccess: (data) => {
      patchPersonalSubscription(queryClient, data);
    },
  });
}
