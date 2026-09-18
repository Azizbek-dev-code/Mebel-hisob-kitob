import type { Money, IsoDateString, PaginatedResult, DateRangeQuery } from './api.js';
import type {
  PlanAudience,
  PlatformBillingCycle,
  PlatformBillingStatus,
  PlatformExpenseCategory,
  PlatformExpenseStatus,
  PlatformPaymentMethod,
  StoreAccessStatus,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  WorkspaceType,
} from '../constants/enums.js';

export interface SubscriptionPlanFeatures {
  highlights?: string[];
  maxUsers?: number | null;
  maxProducts?: number | null;
  /** Personal paid period length in days (admin-editable). */
  periodDays?: number;
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
  ownerEmail: string | null;
  createdAt: IsoDateString;
  /** Whole days the store has existed — "dasturdan qanchadan beri foydalanmoqda". */
  daysSinceCreated: number;
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
  rank: number;
  audience: PlanAudience;
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
  rank?: number;
  /** Defaults to STORE. PERSONAL plans must not use store ERP feature catalogs. */
  audience?: PlanAudience;
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
  rank?: number;
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
  planRank: number;
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
  storeId: string | null;
  workspaceId: string | null;
  accountKind: typeof WorkspaceType.PERSONAL | typeof WorkspaceType.BUSINESS;
  storeName: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
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
  paymentMethod: PlatformPaymentMethod | null;
  payerReference: string | null;
  proofUrl: string | null;
  createdInvoiceId: string | null;
  createdSubscriptionId: string | null;
}

export interface ApproveSubscriptionRequestBody {
  /** Defaults to now when omitted. */
  startDate?: IsoDateString;
  /** Defaults to one month after the start when omitted. */
  endDate?: IsoDateString;
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
  paymentMethod: PlatformPaymentMethod;
  payerReference?: string;
  proofUrl: string;
  proofKey: string;
}

export interface RequestPersonalSubscriptionBody {
  note?: string;
  paymentMethod: PlatformPaymentMethod;
  payerReference?: string;
  proofUrl: string;
  proofKey: string;
}

export interface PlatformPaymentInstructionsDto {
  platformName: string;
  paymentCardNumber: string;
  paymentAccountNumber: string;
  paymentInstructions: string;
}

export interface BillingProofDto {
  url: string;
  key: string;
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

/** Live ERP usage for one store, counted from its own rows. Never estimated. */
export interface PlatformStoreStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalSales: number;
  /** Sum of totalSalePrice over non-cancelled sales. */
  totalRevenue: Money;
  /** Most recent sale, payment or login — whichever happened last. */
  lastActivityAt: IsoDateString | null;
}

/** Subscription payment ledger for one store. Store ERP payments are not here. */
export interface PlatformStorePaymentsDto {
  totalPaid: Money;
  paidCount: number;
  lastPaymentAt: IsoDateString | null;
  history: PlatformInvoiceDto[];
}

export interface PlatformShopDetail {
  shop: PlatformShopSummary;
  subscription: StoreSubscriptionDto | null;
  latestInvoice: PlatformInvoiceDto | null;
  stats: PlatformStoreStatsDto;
  payments: PlatformStorePaymentsDto;
  /** Full subscription-change request history, newest first. Never deleted. */
  requests: SubscriptionRequestDto[];
}

/** A store reading its own subscription payment ledger. */
export interface StoreBillingPaymentsResponse {
  totalPaid: Money;
  paidCount: number;
  lastPaymentAt: IsoDateString | null;
  items: PlatformInvoiceDto[];
}

/** A store reading its own subscription-change requests. */
export interface StoreBillingRequestsResponse {
  items: SubscriptionRequestDto[];
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
  paymentCardNumber: string;
  paymentAccountNumber: string;
  paymentInstructions: string;
  referralCommissionPercent: number;
  referralMinWithdrawalSom: number;
  referralProgramActive: boolean;
}

export interface UpdatePlatformSettingsBody {
  platformName?: string;
  defaultCurrency?: string;
  gracePeriodDays?: number;
  billingCycle?: PlatformBillingCycle;
  paymentRemindersEnabled?: boolean;
  reminderDaysBeforeDue?: number;
  paymentCardNumber?: string;
  paymentAccountNumber?: string;
  paymentInstructions?: string;
  referralCommissionPercent?: number;
  referralMinWithdrawalSom?: number;
  referralProgramActive?: boolean;
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

export interface PlatformAccountGrowthPoint {
  month: string;
  personal: number;
  business: number;
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
  accounts: {
    personal: number;
    business: number;
    growth: PlatformAccountGrowthPoint[];
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
  /** Stores waiting for a tariff change to be accepted or rejected. */
  pendingSubscriptionRequests: number;
  /** All subscription money ever collected (PAID invoices, every period). */
  subscriptionRevenueTotal: Money;
  /** Subscription money collected in the current calendar month. */
  subscriptionRevenueThisMonth: Money;
  pendingPayments: number;
  pendingPaymentAmount: Money;
  overduePayments: number;
  overduePaymentAmount: Money;
  monthRevenue: Money;
  monthExpenses: Money;
  monthNetProfit: number;
  /** Always 0 until a non-subscription platform revenue ledger exists. */
  otherRevenue: Money;
  personalWorkspaces: number;
  personalActive: number;
  personalTrial: number;
  personalExpired: number;
  pendingPersonalSubscriptionRequests: number;
  pendingBusinessSubscriptionRequests: number;
  pendingWithdrawals: number;
  referralSignups: number;
  accountGrowth: PlatformAccountGrowthPoint[];
  subscriptionByPlan: PlatformPlanMixPoint[];
  pnlSeries: PlatformPnlPoint[];
  storeSeries: PlatformStoreAnalyticsPoint[];
  latestPayments: PlatformInvoiceDto[];
  latestStoreRequests: Array<{
    id: string;
    storeName: string;
    status: string;
    createdAt: IsoDateString;
  }>;
  period: { from: IsoDateString; to: IsoDateString; label: string };
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
