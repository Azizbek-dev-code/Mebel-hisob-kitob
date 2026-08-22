import type {
  ApproveSubscriptionRequestBody,
  AssignStorePlanBody,
  CreatePlatformExpenseBody,
  CreateSubscriptionPlanBody,
  FeatureDto,
  PlatformAnalyticsResponse,
  PlatformDashboardResponse,
  PlatformExpenseDto,
  PlatformInvoiceListQuery,
  PlatformInvoiceListResponse,
  PlatformPnlResponse,
  PlatformSettingsDto,
  PlatformShopDetail,
  RecordPlatformPaymentBody,
  RejectPlatformPaymentBody,
  ManualActivateSubscriptionBody,
  StoreAccessStatusResponse,
  StoreSubscriptionDto,
  SubscriptionPlanDto,
  SubscriptionRequestDto,
  UpdatePlatformExpenseBody,
  UpdatePlatformSettingsBody,
  UpdateSubscriptionPlanBody,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const platformBillingService = {
  listPlans(signal?: AbortSignal) {
    return apiClient.get<{ items: SubscriptionPlanDto[] }>('/platform/plans', { signal });
  },
  createPlan(body: CreateSubscriptionPlanBody) {
    return apiClient.post<{ plan: SubscriptionPlanDto }>('/platform/plans', { body });
  },
  updatePlan(id: string, body: UpdateSubscriptionPlanBody) {
    return apiClient.patch<{ plan: SubscriptionPlanDto }>(`/platform/plans/${id}`, { body });
  },
  getShop(id: string, signal?: AbortSignal) {
    return apiClient.get<PlatformShopDetail>(`/platform/shops/${id}`, { signal });
  },
  assignPlan(storeId: string, body: AssignStorePlanBody) {
    return apiClient.post<{ subscription: StoreSubscriptionDto }>(`/platform/shops/${storeId}/plan`, {
      body,
    });
  },
  setManualBlock(storeId: string, blocked: boolean) {
    return apiClient.post<{ shop: PlatformShopDetail['shop'] }>(`/platform/shops/${storeId}/block`, {
      body: { blocked },
    });
  },
  listInvoices(query: PlatformInvoiceListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<PlatformInvoiceListResponse>('/platform/invoices', {
      signal,
      searchParams: { ...query },
    });
  },
  recordPayment(id: string, body: RecordPlatformPaymentBody) {
    return apiClient.post<{ invoice: PlatformInvoiceListResponse['items'][number] }>(
      `/platform/invoices/${id}/pay`,
      { body },
    );
  },
  rejectPayment(id: string, body: RejectPlatformPaymentBody) {
    return apiClient.post<{ invoice: PlatformInvoiceListResponse['items'][number] }>(
      `/platform/invoices/${id}/reject`,
      { body },
    );
  },
  activateSubscription(storeId: string, body: ManualActivateSubscriptionBody) {
    return apiClient.post<{ subscription: StoreSubscriptionDto }>(
      `/platform/shops/${storeId}/activate-subscription`,
      { body },
    );
  },
  listExpenses(signal?: AbortSignal) {
    return apiClient.get<{ items: PlatformExpenseDto[] }>('/platform/expenses', { signal });
  },
  createExpense(body: CreatePlatformExpenseBody) {
    return apiClient.post<{ expense: PlatformExpenseDto }>('/platform/expenses', { body });
  },
  updateExpense(id: string, body: UpdatePlatformExpenseBody) {
    return apiClient.patch<{ expense: PlatformExpenseDto }>(`/platform/expenses/${id}`, { body });
  },
  cancelExpense(id: string) {
    return apiClient.post<{ expense: PlatformExpenseDto }>(`/platform/expenses/${id}/cancel`);
  },
  getSettings(signal?: AbortSignal) {
    return apiClient.get<{ settings: PlatformSettingsDto }>('/platform/settings', { signal });
  },
  updateSettings(body: UpdatePlatformSettingsBody) {
    return apiClient.patch<{ settings: PlatformSettingsDto }>('/platform/settings', { body });
  },
  getPnl(preset: string, signal?: AbortSignal) {
    return apiClient.get<PlatformPnlResponse>('/platform/pnl', {
      signal,
      searchParams: { preset },
    });
  },
  getAnalytics(preset: string, signal?: AbortSignal) {
    return apiClient.get<PlatformAnalyticsResponse>('/platform/analytics', {
      signal,
      searchParams: { preset },
    });
  },
  getDashboard(signal?: AbortSignal) {
    return apiClient.get<PlatformDashboardResponse>('/platform/dashboard', { signal });
  },
  getStoreAccess(signal?: AbortSignal) {
    return apiClient.get<{ access: StoreAccessStatusResponse }>('/store-access', { signal });
  },
  listFeatures(signal?: AbortSignal) {
    return apiClient.get<{ items: FeatureDto[] }>('/platform/features', { signal });
  },
  listSubscriptionRequests(status?: string, signal?: AbortSignal) {
    return apiClient.get<{ items: SubscriptionRequestDto[] }>('/platform/subscription-requests', {
      signal,
      searchParams: { status },
    });
  },
  approveSubscriptionRequest(id: string, body: ApproveSubscriptionRequestBody) {
    return apiClient.post<{
      request: SubscriptionRequestDto;
      invoice: PlatformInvoiceListResponse['items'][number];
    }>(`/platform/subscription-requests/${id}/approve`, { body });
  },
  rejectSubscriptionRequest(id: string, body: RejectPlatformPaymentBody) {
    return apiClient.post<{ request: SubscriptionRequestDto }>(
      `/platform/subscription-requests/${id}/reject`,
      { body },
    );
  },
};
