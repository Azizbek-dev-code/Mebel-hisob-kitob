import type { Money, IsoDateString, PaginatedResult, DateRangeQuery } from './api.js';
import type {
  PlatformBillingCycle,
  PlatformBillingStatus,
  PlatformExpenseCategory,
  PlatformExpenseStatus,
  PlatformPaymentMethod,
  StoreAccessStatus,
  SubscriptionRequestStatus,
  SubscriptionStatus,
} from '../constants/enums.js';

export interface SubscriptionPlanFeatures {
  highlights?: string[];
  maxUsers?: number | null;
  maxProducts?: number | null;
}

export interface FeatureDto {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PlanLimitDto {
  resourceKey: string;
  name: string;
  unlimited: boolean;
  limitValue: number | null;
}

export interface PlanLimitInput {
  resourceKey: string;
  unlimited: boolean;
  limitValue?: number | null;
}

export interface ResourceUsageDto {
  resourceKey: string;
  name: string;
  used: number;
  unlimited: boolean;
  limitValue: number | null;
}

/** Platform-admin directory row. */
export interface PlatformShopSummary {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  accessStatus: StoreAccessStatus;
  planName: string | null;
  monthlyPrice: Money | null;
  nextPaymentDue: IsoDateString | null;
  hasPendingPayment: boolean;
  ownerName: string | null;
  ownerPhone: string | null;
  createdAt: IsoDateString;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: IsoDateString | null;
  currentPeriodEnd: IsoDateString | null;
  lastPaymentAt: IsoDateString | null;
}

export interface PlatformShopListResponse {
  items: PlatformShopSummary[];
}

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  description: string;
  monthlyPrice: Money;
  currency: string;
  trialDays: number;
  isActive: boolean;
  isDefaultTrial: boolean;
  features: SubscriptionPlanFeatures;
  featureKeys: string[];
  featuresRestricted: boolean;
  enabledFeatures: FeatureDto[];
  limits: PlanLimitDto[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateSubscriptionPlanBody {
  name: string;
  description?: string;
  monthlyPrice: Money;
  currency?: string;
  trialDays?: number;
  isDefaultTrial?: boolean;
  featureKeys?: string[];
  limits?: PlanLimitInput[];
  features?: SubscriptionPlanFeatures;
}

export interface UpdateSubscriptionPlanBody {
  name?: string;
  description?: string;
  monthlyPrice?: Money;
  trialDays?: number;
  isActive?: boolean;
  isDefaultTrial?: boolean;
  featureKeys?: string[];
  limits?: PlanLimitInput[];
  features?: SubscriptionPlanFeatures;
}

export interface StoreSubscriptionDto {
  id: string;
  storeId: string;
  planId: string;
  planName: string;
  monthlyPrice: Money;
  currency: string;
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  startedAt: IsoDateString;
  currentPeriodStart: IsoDateString;
  currentPeriodEnd: IsoDateString;
  expiresAt: IsoDateString;
  nextPaymentDue: IsoDateString;
  trialStartedAt: IsoDateString | null;
  trialEndsAt: IsoDateString | null;
  trialWelcomeSeenAt: IsoDateString | null;
  pendingPlanId: string | null;
  pendingPlanName: string | null;
  cancelledAt: IsoDateString | null;
  endedAt: IsoDateString | null;
  isCurrent: boolean;
  canWrite: boolean;
  daysRemaining: number | null;
  featureKeys: string[];
  featuresRestricted: boolean;
  enabledFeatures: FeatureDto[];
  limits: PlanLimitDto[];
  usage: ResourceUsageDto[];
}

export interface StoreEntitlementsDto {
  subscription: StoreSubscriptionDto | null;
  featureKeys: string[];
  featuresRestricted: boolean;
  canWrite: boolean;
  usage: ResourceUsageDto[];
}

export interface PlatformInvoiceDto {
  id: string;
  storeId: string;
  storeName: string;
  ownerName: string | null;
  ownerPhone: string | null;
  subscriptionId: string;
  planId: string;
  planName: string;
  amount: Money;
  currency: string;
  billingPeriodStart: IsoDateString;
  billingPeriodEnd: IsoDateString;
  dueDate: IsoDateString;
  status: PlatformBillingStatus;
  paidAt: IsoDateString | null;
  paymentMethod: PlatformPaymentMethod | null;
  reference: string | null;
  note: string | null;
  durationMonths: number;
  rejectionReason: string | null;
  daysOverdue: number;
  recordedByName: string | null;
  createdAt: IsoDateString;
}

export interface SubscriptionRequestDto {
  id: string;
  storeId: string;
  storeName: string;
  ownerName: string | null;
  ownerPhone: string | null;
  planId: string;
  planName: string;
  currentPlanName: string | null;
  currentStatus: SubscriptionStatus | null;
  requestedPriceSnapshot: Money;
  currency: string;
  status: SubscriptionRequestStatus;
  requestedAt: IsoDateString;
  reviewedAt: IsoDateString | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  note: string | null;
  createdInvoiceId: string | null;
  createdSubscriptionId: string | null;
}

export interface ApproveSubscriptionRequestBody {
  startDate: IsoDateString;
  endDate: IsoDateString;
  paymentMethod: PlatformPaymentMethod;
  note?: string;
}

export interface PlatformInvoiceListQuery {
  status?: PlatformBillingStatus;
  storeId?: string;
  planId?: string;
  search?: string;
  month?: string;
  from?: IsoDateString;
  to?: IsoDateString;
  page?: number;
  pageSize?: number;
}

export interface PlatformInvoiceListResponse extends PaginatedResult<PlatformInvoiceDto> {
  totalAmount: Money;
  storeCount: number;
}

export interface RejectPlatformPaymentBody {
  reason: string;
}

export interface RequestStoreSubscriptionBody {
  planId: string;
  note?: string;
}

export interface ManualActivateSubscriptionBody {
  planId: string;
  startDate: IsoDateString;
  endDate: IsoDateString;
}

export interface RecordPlatformPaymentBody {
  paidAt: IsoDateString;
  paymentMethod: PlatformPaymentMethod;
  reference?: string;
  note?: string;
}

export interface AssignStorePlanBody {
  planId: string;
}

export interface PlatformShopDetail {
  shop: PlatformShopSummary;
  subscription: StoreSubscriptionDto | null;
  latestInvoice: PlatformInvoiceDto | null;
}

export interface PlatformExpenseDto {
  id: string;
  category: PlatformExpenseCategory;
  amount: Money;
  currency: string;
  date: IsoDateString;
  description: string;
  vendor: string | null;
  reference: string | null;
  status: PlatformExpenseStatus;
  createdByName: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreatePlatformExpenseBody {
  category: PlatformExpenseCategory;
  amount: Money;
  date: IsoDateString;
  description?: string;
  vendor?: string;
  reference?: string;
}

export interface UpdatePlatformExpenseBody {
  category?: PlatformExpenseCategory;
  amount?: Money;
  date?: IsoDateString;
  description?: string;
  vendor?: string;
  reference?: string;
}

export interface PlatformSettingsDto {
  platformName: string;
  defaultCurrency: string;
  gracePeriodDays: number;
  billingCycle: PlatformBillingCycle;
  paymentRemindersEnabled: boolean;
  reminderDaysBeforeDue: number;
}

export interface UpdatePlatformSettingsBody {
  platformName?: string;
  defaultCurrency?: string;
  gracePeriodDays?: number;
  billingCycle?: PlatformBillingCycle;
  paymentRemindersEnabled?: boolean;
  reminderDaysBeforeDue?: number;
}

export interface PlatformPnlPoint {
  month: string;
  revenue: Money;
  expenses: Money;
  netProfit: number;
}

export interface PlatformPnlResponse {
  revenue: Money;
  expenses: Money;
  netProfit: number;
  series: PlatformPnlPoint[];
  period: { from: IsoDateString; to: IsoDateString; label: string };
}

export interface PlatformStoreAnalyticsPoint {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
  active: number;
  blocked: number;
}

export interface PlatformPlanMixPoint {
  planName: string;
  storeCount: number;
}

export interface PlatformAnalyticsResponse {
  stores: {
    submitted: number;
    approved: number;
    rejected: number;
    active: number;
    blocked: number;
    trial: number;
    paidActive: number;
    expired: number;
    pendingPayment: number;
    series: PlatformStoreAnalyticsPoint[];
  };
  finance: PlatformPnlResponse;
  subscriptions: {
    trial: number;
    active: number;
    expired: number;
    pendingPayment: number;
    byPlan: PlatformPlanMixPoint[];
    monthlyRevenue: Money;
    trialToPaid: number;
    churned: number;
  };
}

export interface PlatformDashboardResponse {
  totalStores: number;
  activeStores: number;
  blockedStores: number;
  trialStores: number;
  activeSubscriptions: number;
  pendingPaymentStores: number;
  expiredStores: number;
  pendingStoreRequests: number;
  pendingPayments: number;
  pendingPaymentAmount: Money;
  overduePayments: number;
  overduePaymentAmount: Money;
  monthRevenue: Money;
  monthExpenses: Money;
  monthNetProfit: number;
  pnlSeries: PlatformPnlPoint[];
  storeSeries: PlatformStoreAnalyticsPoint[];
  latestPayments: PlatformInvoiceDto[];
  latestStoreRequests: Array<{
    id: string;
    storeName: string;
    status: string;
    createdAt: IsoDateString;
  }>;
}

export interface StoreAccessStatusResponse {
  storeName: string;
  accessStatus: StoreAccessStatus;
  planName: string | null;
  outstandingAmount: Money;
  dueDate: IsoDateString | null;
  daysOverdue: number;
}

export type { DateRangeQuery };
