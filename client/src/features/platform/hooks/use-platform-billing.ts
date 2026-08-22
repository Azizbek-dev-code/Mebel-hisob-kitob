import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePlatformExpenseBody,
  CreateSubscriptionPlanBody,
  PlatformInvoiceListQuery,
  UpdatePlatformExpenseBody,
  UpdatePlatformSettingsBody,
  UpdateSubscriptionPlanBody,
} from '@furniture-erp/shared';

import { platformBillingService } from '@/services/platform-billing.service';
import { platformShopsQueryKeys } from './use-platform-shops';

export const platformBillingQueryKeys = {
  plans: ['platform-plans'] as const,
  invoices: (query: PlatformInvoiceListQuery) => ['platform-invoices', query] as const,
  expenses: ['platform-expenses'] as const,
  settings: ['platform-settings'] as const,
  pnl: (preset: string) => ['platform-pnl', preset] as const,
  analytics: (preset: string) => ['platform-analytics', preset] as const,
  dashboard: ['platform-dashboard'] as const,
  shop: (id: string) => ['platform-shop', id] as const,
  storeAccess: ['store-access'] as const,
  features: ['platform-features'] as const,
  subscriptionRequests: (status?: string) => ['platform-subscription-requests', status] as const,
};

export function usePlatformPlans(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.plans,
    queryFn: ({ signal }) => platformBillingService.listPlans(signal),
    enabled,
  });
}

export function usePlatformInvoices(query: PlatformInvoiceListQuery, enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.invoices(query),
    queryFn: ({ signal }) => platformBillingService.listInvoices(query, signal),
    enabled,
  });
}

export function usePlatformExpenses(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.expenses,
    queryFn: ({ signal }) => platformBillingService.listExpenses(signal),
    enabled,
  });
}

export function usePlatformSettings(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.settings,
    queryFn: ({ signal }) => platformBillingService.getSettings(signal),
    enabled,
  });
}

export function usePlatformPnl(preset: string, enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.pnl(preset),
    queryFn: ({ signal }) => platformBillingService.getPnl(preset, signal),
    enabled,
  });
}

export function usePlatformAnalytics(preset: string, enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.analytics(preset),
    queryFn: ({ signal }) => platformBillingService.getAnalytics(preset, signal),
    enabled,
  });
}

export function usePlatformDashboard(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.dashboard,
    queryFn: ({ signal }) => platformBillingService.getDashboard(signal),
    enabled,
  });
}

export function usePlatformShop(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.shop(id ?? ''),
    queryFn: ({ signal }) => platformBillingService.getShop(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useStoreAccess(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.storeAccess,
    queryFn: ({ signal }) => platformBillingService.getStoreAccess(signal),
    enabled,
  });
}

export function usePlatformFeatures(enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.features,
    queryFn: ({ signal }) => platformBillingService.listFeatures(signal),
    enabled,
  });
}

export function usePlatformSubscriptionRequests(status?: string, enabled = true) {
  return useQuery({
    queryKey: platformBillingQueryKeys.subscriptionRequests(status),
    queryFn: ({ signal }) => platformBillingService.listSubscriptionRequests(status, signal),
    enabled,
  });
}

export function useCreatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubscriptionPlanBody) => platformBillingService.createPlan(body),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.plans }),
  });
}

export function useUpdatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSubscriptionPlanBody }) =>
      platformBillingService.updatePlan(id, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.plans }),
  });
}

export function useRecordPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof platformBillingService.recordPayment>[1];
    }) => platformBillingService.recordPayment(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-invoices'] });
      void client.invalidateQueries({ queryKey: platformBillingQueryKeys.dashboard });
      void client.invalidateQueries({ queryKey: platformShopsQueryKeys.all });
    },
  });
}

export function useApproveSubscriptionRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof platformBillingService.approveSubscriptionRequest>[1];
    }) => platformBillingService.approveSubscriptionRequest(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-subscription-requests'] });
      void client.invalidateQueries({ queryKey: ['platform-invoices'] });
      void client.invalidateQueries({ queryKey: platformBillingQueryKeys.dashboard });
      void client.invalidateQueries({ queryKey: platformShopsQueryKeys.all });
    },
  });
}

export function useRejectSubscriptionRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof platformBillingService.rejectSubscriptionRequest>[1];
    }) => platformBillingService.rejectSubscriptionRequest(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-subscription-requests'] });
      void client.invalidateQueries({ queryKey: platformBillingQueryKeys.dashboard });
    },
  });
}

export function useCreatePlatformExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlatformExpenseBody) => platformBillingService.createExpense(body),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.expenses }),
  });
}

export function useUpdatePlatformExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlatformExpenseBody }) =>
      platformBillingService.updateExpense(id, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.expenses }),
  });
}

export function useCancelPlatformExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformBillingService.cancelExpense(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.expenses }),
  });
}

export function useUpdatePlatformSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePlatformSettingsBody) => platformBillingService.updateSettings(body),
    onSuccess: () => void client.invalidateQueries({ queryKey: platformBillingQueryKeys.settings }),
  });
}
