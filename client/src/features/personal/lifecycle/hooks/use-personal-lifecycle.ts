import type {
  CreatePersonalDebtPaymentRequest,
  CreatePersonalDebtRequest,
  CreatePersonalRecurringRuleRequest,
  UpdatePersonalDebtRequest,
  UpdatePersonalNotificationPrefsRequest,
  UpdatePersonalRecurringRuleRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalLifecycleService } from '@/services/personal-lifecycle.service';

export const personalLifecycleKeys = {
  recurring: ['personal', 'recurring'] as const,
  debts: ['personal', 'debts'] as const,
  notifications: ['personal', 'notifications'] as const,
};

function invalidateLifecycle(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function usePersonalRecurring() {
  return useQuery({
    queryKey: personalLifecycleKeys.recurring,
    queryFn: ({ signal }) => personalLifecycleService.recurring(signal),
  });
}

export function useCreatePersonalRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalRecurringRuleRequest) =>
      personalLifecycleService.createRecurring(body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function useUpdatePersonalRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalRecurringRuleRequest }) =>
      personalLifecycleService.updateRecurring(id, body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function useAcknowledgePersonalRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalLifecycleService.acknowledgeRecurring(id),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function useLogPersonalRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalLifecycleService.logRecurring(id),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function usePersonalDebts() {
  return useQuery({
    queryKey: personalLifecycleKeys.debts,
    queryFn: ({ signal }) => personalLifecycleService.debts(signal),
  });
}

export function useCreatePersonalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalDebtRequest) => personalLifecycleService.createDebt(body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function useUpdatePersonalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalDebtRequest }) =>
      personalLifecycleService.updateDebt(id, body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function usePayPersonalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreatePersonalDebtPaymentRequest }) =>
      personalLifecycleService.payDebt(id, body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}

export function usePersonalNotifications() {
  return useQuery({
    queryKey: personalLifecycleKeys.notifications,
    queryFn: ({ signal }) => personalLifecycleService.notifications(signal),
  });
}

export function useUpdatePersonalNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePersonalNotificationPrefsRequest) =>
      personalLifecycleService.updateNotificationPrefs(body),
    onSuccess: () => invalidateLifecycle(queryClient),
  });
}
