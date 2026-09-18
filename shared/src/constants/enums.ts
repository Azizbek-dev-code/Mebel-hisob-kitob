/**
 * Domain enumerations shared by the API and the UI.
 *
 * These mirror the Prisma enums one-for-one. Keeping them here means the client
 * never has to import from the server and both sides fail to compile if a value
 * is added on only one side.
 */

export const UserRole = {
  /** Reserved for the future SaaS control plane (V3). */
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  /** Owner of a single store: full access to that store's data. */
  ADMIN: 'ADMIN',
  /** Cash-desk operator: can create sales, customers and take payments. */
  CASHIER: 'CASHIER',
  /** Worker account: scope is driven by WorkerResponsibility rows. */
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Business work capabilities. Independent of UserRole.
 * One worker may hold several responsibilities at once.
 */
export const WorkerResponsibility = {
  SELLER: 'SELLER',
  ASSEMBLER: 'ASSEMBLER',
  DELIVERY: 'DELIVERY',
  INSTALLER: 'INSTALLER',
  SMM: 'SMM',
  OTHER: 'OTHER',
} as const;
export type WorkerResponsibility =
  (typeof WorkerResponsibility)[keyof typeof WorkerResponsibility];

export const WORKER_RESPONSIBILITIES = Object.values(WorkerResponsibility);

export const WorkerActivityType = {
  WORKER_CREATED: 'WORKER_CREATED',
  WORKER_UPDATED: 'WORKER_UPDATED',
  WORKER_ACTIVATED: 'WORKER_ACTIVATED',
  WORKER_DEACTIVATED: 'WORKER_DEACTIVATED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  SALE_CREATED: 'SALE_CREATED',
  SALE_CANCELLED: 'SALE_CANCELLED',
  ASSEMBLY_ASSIGNED: 'ASSEMBLY_ASSIGNED',
  ASSEMBLY_STARTED: 'ASSEMBLY_STARTED',
  ASSEMBLY_COMPLETED: 'ASSEMBLY_COMPLETED',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
} as const;
export type WorkerActivityType =
  (typeof WorkerActivityType)[keyof typeof WorkerActivityType];

export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * Inventory quantity change kinds.
 * StockMovement.quantity is signed: positive = in, negative = out.
 */
export const StockMovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  SALE_CANCEL: 'SALE_CANCEL',
  MANUAL_IN: 'MANUAL_IN',
  MANUAL_OUT: 'MANUAL_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type StockMovementType =
  (typeof StockMovementType)[keyof typeof StockMovementType];

export const STOCK_MOVEMENT_TYPES = Object.values(StockMovementType);

export const StockReferenceType = {
  SALE: 'SALE',
  MANUAL: 'MANUAL',
  PURCHASE: 'PURCHASE',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type StockReferenceType =
  (typeof StockReferenceType)[keyof typeof StockReferenceType];

export const STOCK_REFERENCE_TYPES = Object.values(StockReferenceType);

/** Derived stock availability for UI and filters. */
export const StockStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NOT_TRACKED: 'NOT_TRACKED',
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export const STOCK_STATUSES = Object.values(StockStatus);

export const PaymentType = {
  FULL_PAYMENT: 'FULL_PAYMENT',
  DEPOSIT: 'DEPOSIT',
  INSTALLMENT: 'INSTALLMENT',
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const SaleStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const SalePaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
} as const;
export type SalePaymentStatus = (typeof SalePaymentStatus)[keyof typeof SalePaymentStatus];

export const InstallmentStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus];

export const InstallmentPlanStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type InstallmentPlanStatus =
  (typeof InstallmentPlanStatus)[keyof typeof InstallmentPlanStatus];

export const FulfilmentStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type FulfilmentStatus = (typeof FulfilmentStatus)[keyof typeof FulfilmentStatus];

export const AssemblyTaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AssemblyTaskStatus = (typeof AssemblyTaskStatus)[keyof typeof AssemblyTaskStatus];

/** Assembly task rows that still belong to the current assignee. */
export const ACTIVE_ASSEMBLY_TASK_STATUSES = [
  AssemblyTaskStatus.PENDING,
  AssemblyTaskStatus.IN_PROGRESS,
] as const;

export const CustomerStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const SupplierStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus];

export const PurchaseStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export const PurchasePaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
} as const;
export type PurchasePaymentStatus =
  (typeof PurchasePaymentStatus)[keyof typeof PurchasePaymentStatus];

export const ExpenseStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

/**
 * Worker ledger movement kinds.
 * Amounts are always positive; credit/debit semantics come from shared helpers.
 */
export const WorkerFinancialTransactionType = {
  BONUS: 'BONUS',
  COMMISSION: 'COMMISSION',
  ADVANCE: 'ADVANCE',
  DEBT: 'DEBT',
  PAYMENT: 'PAYMENT',
  ADJUSTMENT: 'ADJUSTMENT',
  /** Offsets a prior ledger row; amount stays positive. */
  REVERSAL: 'REVERSAL',
} as const;
export type WorkerFinancialTransactionType =
  (typeof WorkerFinancialTransactionType)[keyof typeof WorkerFinancialTransactionType];

/** Types that may be posted via create (REVERSAL is reverse-endpoint only). */
export const WORKER_FINANCIAL_CREATABLE_TYPES = [
  WorkerFinancialTransactionType.BONUS,
  WorkerFinancialTransactionType.COMMISSION,
  WorkerFinancialTransactionType.ADVANCE,
  WorkerFinancialTransactionType.DEBT,
  WorkerFinancialTransactionType.PAYMENT,
  WorkerFinancialTransactionType.ADJUSTMENT,
] as const;
export type WorkerFinancialCreatableType =
  (typeof WORKER_FINANCIAL_CREATABLE_TYPES)[number];

export const WORKER_FINANCIAL_TRANSACTION_TYPES = Object.values(
  WorkerFinancialTransactionType,
);

/** Optional business-record link for a worker financial row (no FK yet). */
export const WorkerFinancialReferenceType = {
  MANUAL: 'MANUAL',
  SALE: 'SALE',
  ASSEMBLY: 'ASSEMBLY',
  PAYROLL: 'PAYROLL',
  /**
   * Posted from worker compensation settle.
   * referenceId = stable compensation breakdown line id (e.g. `${saleId}:PERCENT_OF_SALE`).
   */
  COMPENSATION: 'COMPENSATION',
  /**
   * Purchase-sourced operational fees (e.g. shopir / freight on a kirim).
   * referenceId = `${purchaseId}:DRIVER_FEE`.
   */
  PURCHASE: 'PURCHASE',
  /** referenceId = original WorkerFinancialTransaction id. */
  REVERSAL: 'REVERSAL',
} as const;
export type WorkerFinancialReferenceType =
  (typeof WorkerFinancialReferenceType)[keyof typeof WorkerFinancialReferenceType];

export const WORKER_FINANCIAL_REFERENCE_TYPES = Object.values(
  WorkerFinancialReferenceType,
);

/**
 * How a worker is normally compensated for a responsibility.
 * Configuration only — does not post ledger rows.
 */
export const WorkerCompensationType = {
  PERCENT_OF_SALE: 'PERCENT_OF_SALE',
  PERCENT_OF_GROSS_PROFIT: 'PERCENT_OF_GROSS_PROFIT',
  FIXED_PER_SALE: 'FIXED_PER_SALE',
  FIXED_PER_ASSEMBLY: 'FIXED_PER_ASSEMBLY',
  FIXED_PER_DELIVERY: 'FIXED_PER_DELIVERY',
  FIXED_PER_INSTALLATION: 'FIXED_PER_INSTALLATION',
} as const;
export type WorkerCompensationType =
  (typeof WorkerCompensationType)[keyof typeof WorkerCompensationType];

export const WORKER_COMPENSATION_TYPES = Object.values(WorkerCompensationType);

export const WORKER_COMPENSATION_PERCENT_TYPES = [
  WorkerCompensationType.PERCENT_OF_SALE,
  WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
] as const;
export type WorkerCompensationPercentType =
  (typeof WORKER_COMPENSATION_PERCENT_TYPES)[number];

export const WORKER_COMPENSATION_FIXED_TYPES = [
  WorkerCompensationType.FIXED_PER_SALE,
  WorkerCompensationType.FIXED_PER_ASSEMBLY,
  WorkerCompensationType.FIXED_PER_DELIVERY,
  WorkerCompensationType.FIXED_PER_INSTALLATION,
] as const;
export type WorkerCompensationFixedType =
  (typeof WORKER_COMPENSATION_FIXED_TYPES)[number];

/**
 * Role for a sale-form manual worker pay row (Ish haqlari).
 * DASTAFCHI / SHOPIR require the DELIVERY responsibility on the worker.
 */
export const SaleWorkerPayRole = {
  SELLER: 'SELLER',
  ASSEMBLER: 'ASSEMBLER',
  DASTAFCHI: 'DASTAFCHI',
  SHOPIR: 'SHOPIR',
} as const;
export type SaleWorkerPayRole =
  (typeof SaleWorkerPayRole)[keyof typeof SaleWorkerPayRole];

export const SALE_WORKER_PAY_ROLES = Object.values(SaleWorkerPayRole);

/** Origin of a sale worker compensation line. Form rows are always MANUAL. */
export const SaleWorkerPaySource = {
  MANUAL: 'MANUAL',
  RULE: 'RULE',
} as const;
export type SaleWorkerPaySource =
  (typeof SaleWorkerPaySource)[keyof typeof SaleWorkerPaySource];

export const SALE_WORKER_PAY_SOURCES = Object.values(SaleWorkerPaySource);

/** Lifecycle of an administrator-triggered backup export. */
export const BackupJobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;
export type BackupJobStatus = (typeof BackupJobStatus)[keyof typeof BackupJobStatus];

/**
 * Physical shape of a backup artefact.
 *
 * LOGICAL_JSON is the portable store-scoped export; PG_CUSTOM is a full-database
 * `pg_dump -Fc` and is only available when the server enables it.
 */
export const BackupFormat = {
  LOGICAL_JSON: 'LOGICAL_JSON',
  PG_CUSTOM: 'PG_CUSTOM',
} as const;
export type BackupFormat = (typeof BackupFormat)[keyof typeof BackupFormat];

export const DateRangePreset = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  CUSTOM: 'CUSTOM',
} as const;
export type DateRangePreset = (typeof DateRangePreset)[keyof typeof DateRangePreset];

/** Platform admin P&L / dashboard only. Store ERP `DateRangePreset` stays unchanged. */
export const PlatformDatePreset = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
  LAST_6_MONTHS: 'LAST_6_MONTHS',
  LAST_YEAR: 'LAST_YEAR',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  CUSTOM: 'CUSTOM',
} as const;
export type PlatformDatePreset = (typeof PlatformDatePreset)[keyof typeof PlatformDatePreset];

export const PLATFORM_DATE_PRESETS = [
  PlatformDatePreset.LAST_7_DAYS,
  PlatformDatePreset.LAST_30_DAYS,
  PlatformDatePreset.LAST_3_MONTHS,
  PlatformDatePreset.LAST_6_MONTHS,
  PlatformDatePreset.LAST_YEAR,
  PlatformDatePreset.THIS_MONTH,
  PlatformDatePreset.LAST_MONTH,
  PlatformDatePreset.THIS_YEAR,
  PlatformDatePreset.CUSTOM,
] as const;

/**
 * Lifecycle of a public "open a store" application.
 * A request stays PENDING until a PLATFORM_ADMIN approves or rejects it.
 * Approval is what creates the Store and its ADMIN owner — never the submit.
 */
export const StoreCreationRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type StoreCreationRequestStatus =
  (typeof StoreCreationRequestStatus)[keyof typeof StoreCreationRequestStatus];

export const STORE_CREATION_REQUEST_STATUSES = Object.values(StoreCreationRequestStatus);

/** Uzbek labels shown on the status page and the platform inbox. */
export const STORE_CREATION_STATUS_LABELS = {
  PENDING: 'KUTILMOQDA',
  APPROVED: 'QABUL QILINDI',
  REJECTED: 'RAD ETILDI',
} as const satisfies Record<StoreCreationRequestStatus, string>;

/** Store ERP access. Independent of SubscriptionStatus. */
export const StoreAccessStatus = {
  ACTIVE: 'ACTIVE',
  PAYMENT_BLOCKED: 'PAYMENT_BLOCKED',
  MANUALLY_BLOCKED: 'MANUALLY_BLOCKED',
} as const;
export type StoreAccessStatus = (typeof StoreAccessStatus)[keyof typeof StoreAccessStatus];

export const STORE_ACCESS_STATUSES = Object.values(StoreAccessStatus);

export const STORE_ACCESS_STATUS_LABELS = {
  ACTIVE: 'FAOL',
  PAYMENT_BLOCKED: "TO'LOV BLOKI",
  MANUALLY_BLOCKED: 'QO‘LDA BLOK',
} as const satisfies Record<StoreAccessStatus, string>;

export const SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  EXPIRED: 'EXPIRED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus);

export const SUBSCRIPTION_STATUS_LABELS = {
  TRIAL: 'SINOV',
  ACTIVE: 'FAOL',
  PAST_DUE: "MUDDATI O'TGAN",
  EXPIRED: 'TUGAGAN',
  PENDING_PAYMENT: "TO'LOV KUTILMOQDA",
  BLOCKED: 'BLOKLANGAN',
  CANCELLED: 'BEKOR',
} as const satisfies Record<SubscriptionStatus, string>;

export const PlatformBillingStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type PlatformBillingStatus =
  (typeof PlatformBillingStatus)[keyof typeof PlatformBillingStatus];

export const PLATFORM_BILLING_STATUSES = Object.values(PlatformBillingStatus);

export const PLATFORM_BILLING_STATUS_LABELS = {
  PENDING: 'KUTILMOQDA',
  PAID: "TO'LANGAN",
  OVERDUE: "MUDDATI O'TGAN",
  REJECTED: 'RAD ETILDI',
  CANCELLED: 'BEKOR',
} as const satisfies Record<PlatformBillingStatus, string>;

export const PlatformPaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  OTHER: 'OTHER',
} as const;
export type PlatformPaymentMethod =
  (typeof PlatformPaymentMethod)[keyof typeof PlatformPaymentMethod];

export const PLATFORM_PAYMENT_METHODS = Object.values(PlatformPaymentMethod);

export const PLATFORM_PAYMENT_METHOD_LABELS = {
  CASH: 'Naqd',
  CARD: 'Karta',
  BANK_TRANSFER: "Bank o'tkazmasi",
  OTHER: 'Boshqa',
} as const satisfies Record<PlatformPaymentMethod, string>;

export const PlatformExpenseCategory = {
  SERVER: 'SERVER',
  HOSTING: 'HOSTING',
  DOMAIN: 'DOMAIN',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  SOFTWARE: 'SOFTWARE',
  ADVERTISING: 'ADVERTISING',
  MARKETING: 'MARKETING',
  DEVELOPMENT: 'DEVELOPMENT',
  SALARY: 'SALARY',
  OTHER: 'OTHER',
} as const;
export type PlatformExpenseCategory =
  (typeof PlatformExpenseCategory)[keyof typeof PlatformExpenseCategory];

export const PLATFORM_EXPENSE_CATEGORIES = Object.values(PlatformExpenseCategory);

export const PLATFORM_EXPENSE_CATEGORY_LABELS = {
  SERVER: 'Server',
  HOSTING: 'Hosting',
  DOMAIN: 'Domen',
  SMS: 'SMS',
  EMAIL: 'Email',
  SOFTWARE: 'Dastur',
  ADVERTISING: "Reklama",
  MARKETING: 'Marketing',
  DEVELOPMENT: 'Dasturlash',
  SALARY: 'Maosh',
  OTHER: 'Boshqa',
} as const satisfies Record<PlatformExpenseCategory, string>;

export const PlatformExpenseStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type PlatformExpenseStatus =
  (typeof PlatformExpenseStatus)[keyof typeof PlatformExpenseStatus];

export const PlatformBillingCycle = {
  MONTHLY: 'MONTHLY',
} as const;
export type PlatformBillingCycle =
  (typeof PlatformBillingCycle)[keyof typeof PlatformBillingCycle];

export const SubscriptionRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionRequestStatus =
  (typeof SubscriptionRequestStatus)[keyof typeof SubscriptionRequestStatus];

export const SUBSCRIPTION_REQUEST_STATUSES = Object.values(SubscriptionRequestStatus);

export const SUBSCRIPTION_REQUEST_STATUS_LABELS = {
  PENDING: 'KUTILMOQDA',
  APPROVED: 'QABUL QILINDI',
  REJECTED: 'RAD ETILDI',
  CANCELLED: 'BEKOR',
} as const satisfies Record<SubscriptionRequestStatus, string>;

/**
 * Who a `SubscriptionPlan` row is for. Store ERP tariffs stay STORE.
 * PERSONAL_PAID is seeded as PERSONAL so it never appears in the shop catalogue.
 */
export const PlanAudience = {
  STORE: 'STORE',
  PERSONAL: 'PERSONAL',
} as const;
export type PlanAudience = (typeof PlanAudience)[keyof typeof PlanAudience];

export const PLAN_AUDIENCES = Object.values(PlanAudience);

export const PLAN_AUDIENCE_LABELS = {
  STORE: 'Biznes',
  PERSONAL: 'Shaxsiy',
} as const satisfies Record<PlanAudience, string>;

/** Overlay workspace kind. BUSINESS maps 1:1 onto an existing Store. */
export const WorkspaceType = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
} as const;

/**
 * Store vertical. Only values that exist in the database should appear in admin
 * filters — do not render unused members as if they had accounts.
 */
export const BusinessType = {
  FURNITURE: 'FURNITURE',
  CARPET: 'CARPET',
  CLOTHING: 'CLOTHING',
  ELECTRONICS: 'ELECTRONICS',
  OTHER: 'OTHER',
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

export const BUSINESS_TYPES = Object.values(BusinessType);

export const BUSINESS_TYPE_LABELS = {
  FURNITURE: 'Mebel',
  CARPET: 'Gilam',
  CLOTHING: 'Kiyim',
  ELECTRONICS: 'Telefon/Elektronika',
  OTHER: 'Boshqa',
} as const satisfies Record<BusinessType, string>;

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string' && (BUSINESS_TYPES as readonly string[]).includes(value);
}

/** Unknown / missing values fall back to furniture so legacy clients keep working. */
export function parseBusinessType(value: unknown): BusinessType {
  return isBusinessType(value) ? value : BusinessType.FURNITURE;
}

/**
 * Admin-facing account row status. Derived from Workspace / Store access /
 * SubscriptionStatus / StoreCreationRequest — not a Prisma enum.
 */
export const PlatformAccountDisplayStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
} as const;
export type PlatformAccountDisplayStatus =
  (typeof PlatformAccountDisplayStatus)[keyof typeof PlatformAccountDisplayStatus];

export const PLATFORM_ACCOUNT_DISPLAY_STATUSES = Object.values(PlatformAccountDisplayStatus);

export const PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS = {
  PENDING: 'Kutilmoqda',
  ACTIVE: 'Faol',
  TRIAL: 'Sinov',
  EXPIRED: 'Muddati o‘tgan',
  BLOCKED: 'Bloklangan',
  CANCELLED: 'Bekor',
} as const satisfies Record<PlatformAccountDisplayStatus, string>;

export const PlatformAccountSource = {
  WORKSPACE: 'WORKSPACE',
  PENDING_REQUEST: 'PENDING_REQUEST',
} as const;
export type PlatformAccountSource =
  (typeof PlatformAccountSource)[keyof typeof PlatformAccountSource];
export type WorkspaceType = (typeof WorkspaceType)[keyof typeof WorkspaceType];

export const WorkspaceStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type WorkspaceStatus = (typeof WorkspaceStatus)[keyof typeof WorkspaceStatus];

export const WorkspaceMembershipRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;
export type WorkspaceMembershipRole =
  (typeof WorkspaceMembershipRole)[keyof typeof WorkspaceMembershipRole];

export const OnboardingSubmissionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;
export type OnboardingSubmissionStatus =
  (typeof OnboardingSubmissionStatus)[keyof typeof OnboardingSubmissionStatus];

export const OnboardingAudience = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
} as const;
export type OnboardingAudience = (typeof OnboardingAudience)[keyof typeof OnboardingAudience];

export const OnboardingAnswerType = {
  SINGLE: 'SINGLE',
  MULTI: 'MULTI',
  TEXT: 'TEXT',
} as const;
export type OnboardingAnswerType =
  (typeof OnboardingAnswerType)[keyof typeof OnboardingAnswerType];

/** Personal cash/card/bank wallets. Independent of store PaymentMethod. */
export const PersonalWalletKind = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK: 'BANK',
  OTHER: 'OTHER',
  UZCARD: 'UZCARD',
  HUMO: 'HUMO',
  PAYME: 'PAYME',
  CLICK: 'CLICK',
  SAVINGS: 'SAVINGS',
} as const;
export type PersonalWalletKind = (typeof PersonalWalletKind)[keyof typeof PersonalWalletKind];

export const PersonalCategoryKind = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type PersonalCategoryKind =
  (typeof PersonalCategoryKind)[keyof typeof PersonalCategoryKind];

export const PersonalEntryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type PersonalEntryType = (typeof PersonalEntryType)[keyof typeof PersonalEntryType];

/** History list filter. TRANSFER is not an entry type. */
export const PersonalHistoryKind = {
  ALL: 'ALL',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
} as const;
export type PersonalHistoryKind = (typeof PersonalHistoryKind)[keyof typeof PersonalHistoryKind];

/** Monthly spend cap. TOTAL covers every expense category. */
export const PersonalBudgetKind = {
  TOTAL: 'TOTAL',
  CATEGORY: 'CATEGORY',
} as const;
export type PersonalBudgetKind = (typeof PersonalBudgetKind)[keyof typeof PersonalBudgetKind];

/**
 * Derived month-to-date budget state. Not stored; spend vs limit only.
 * NEAR = at least 80%, LIMIT = exactly 100%, OVER = above the cap.
 */
export const BudgetWarningLevel = {
  NONE: 'NONE',
  NEAR: 'NEAR',
  LIMIT: 'LIMIT',
  OVER: 'OVER',
} as const;
export type BudgetWarningLevel = (typeof BudgetWarningLevel)[keyof typeof BudgetWarningLevel];

/** Savings target. Independent of onboarding `PersonalGoal` preference tags. */
export const PersonalSavingGoalStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type PersonalSavingGoalStatus =
  (typeof PersonalSavingGoalStatus)[keyof typeof PersonalSavingGoalStatus];

/**
 * How estimatedReachAt was chosen. Not stored.
 * MONTHLY beats TARGET_DATE; HISTORY only after a month of contributions.
 */
export const GoalEtaKind = {
  MET: 'MET',
  MONTHLY: 'MONTHLY',
  TARGET_DATE: 'TARGET_DATE',
  HISTORY: 'HISTORY',
} as const;
export type GoalEtaKind = (typeof GoalEtaKind)[keyof typeof GoalEtaKind];

/** Recurring reminder cadence. Does not auto-post a ledger entry. */
export const PersonalRecurringFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  CUSTOM: 'CUSTOM',
} as const;
export type PersonalRecurringFrequency =
  (typeof PersonalRecurringFrequency)[keyof typeof PersonalRecurringFrequency];

/** Whether the next occurrence is overdue, inside the upcoming window, or later. */
export const PersonalRecurringDueState = {
  OVERDUE: 'OVERDUE',
  DUE: 'DUE',
  LATER: 'LATER',
} as const;
export type PersonalRecurringDueState =
  (typeof PersonalRecurringDueState)[keyof typeof PersonalRecurringDueState];

/** Lent = I gave money; borrowed = I owe someone. Not store customer debt. */
export const PersonalDebtDirection = {
  LENT: 'LENT',
  BORROWED: 'BORROWED',
} as const;
export type PersonalDebtDirection =
  (typeof PersonalDebtDirection)[keyof typeof PersonalDebtDirection];

/** Plan / calendar event priority (O'sish). */
export const GrowthEventPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type GrowthEventPriority = (typeof GrowthEventPriority)[keyof typeof GrowthEventPriority];

export const GROWTH_EVENT_PRIORITIES = Object.values(GrowthEventPriority);

/** Plan event recurrence. NONE = one-shot. */
export const GrowthEventRecurrence = {
  NONE: 'NONE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
} as const;
export type GrowthEventRecurrence =
  (typeof GrowthEventRecurrence)[keyof typeof GrowthEventRecurrence];

export const GROWTH_EVENT_RECURRENCES = Object.values(GrowthEventRecurrence);

/** O'sish todo lifecycle. */
export const GrowthTodoStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;
export type GrowthTodoStatus = (typeof GrowthTodoStatus)[keyof typeof GrowthTodoStatus];

export const GROWTH_TODO_STATUSES = Object.values(GrowthTodoStatus);

/** Pomodoro block type. */
export const GrowthFocusKind = {
  FOCUS: 'FOCUS',
  BREAK: 'BREAK',
} as const;
export type GrowthFocusKind = (typeof GrowthFocusKind)[keyof typeof GrowthFocusKind];

export const GROWTH_FOCUS_KINDS = Object.values(GrowthFocusKind);

export const GrowthFocusStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  INTERRUPTED: 'INTERRUPTED',
  DISCARDED: 'DISCARDED',
} as const;
export type GrowthFocusStatus = (typeof GrowthFocusStatus)[keyof typeof GrowthFocusStatus];

export const GROWTH_FOCUS_STATUSES = Object.values(GrowthFocusStatus);

/** How often a habit is expected. */
export const GrowthHabitFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  CUSTOM: 'CUSTOM',
} as const;
export type GrowthHabitFrequency =
  (typeof GrowthHabitFrequency)[keyof typeof GrowthHabitFrequency];

export const GROWTH_HABIT_FREQUENCIES = Object.values(GrowthHabitFrequency);

/** Learning / study category for O'sish. */
export const GrowthLearningCategory = {
  READING: 'READING',
  COURSE: 'COURSE',
  BOOK: 'BOOK',
  IELTS: 'IELTS',
  PROGRAMMING: 'PROGRAMMING',
  LANGUAGE: 'LANGUAGE',
  SKILL: 'SKILL',
  CUSTOM: 'CUSTOM',
} as const;
export type GrowthLearningCategory =
  (typeof GrowthLearningCategory)[keyof typeof GrowthLearningCategory];

export const GROWTH_LEARNING_CATEGORIES = Object.values(GrowthLearningCategory);

export const GrowthLearningGoalStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type GrowthLearningGoalStatus =
  (typeof GrowthLearningGoalStatus)[keyof typeof GrowthLearningGoalStatus];

export const GROWTH_LEARNING_GOAL_STATUSES = Object.values(GrowthLearningGoalStatus);

/** XP ledger source for O'sish gamification. */
export const GrowthXpSource = {
  TODO_COMPLETED: 'TODO_COMPLETED',
  HABIT_CHECK_IN: 'HABIT_CHECK_IN',
  FOCUS_COMPLETED: 'FOCUS_COMPLETED',
  LEARNING_SESSION: 'LEARNING_SESSION',
  DAILY_GOAL_DONE: 'DAILY_GOAL_DONE',
  MILESTONE_REACHED: 'MILESTONE_REACHED',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  FINANCE_DISCIPLINE: 'FINANCE_DISCIPLINE',
} as const;
export type GrowthXpSource = (typeof GrowthXpSource)[keyof typeof GrowthXpSource];

export const GROWTH_XP_SOURCES = Object.values(GrowthXpSource);

export const GrowthFriendshipStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  BLOCKED: 'BLOCKED',
} as const;
export type GrowthFriendshipStatus =
  (typeof GrowthFriendshipStatus)[keyof typeof GrowthFriendshipStatus];

export const GROWTH_FRIENDSHIP_STATUSES = Object.values(GrowthFriendshipStatus);

export const GrowthChallengeKind = {
  FIGHT: 'FIGHT',
  GROUP: 'GROUP',
} as const;
export type GrowthChallengeKind =
  (typeof GrowthChallengeKind)[keyof typeof GrowthChallengeKind];

export const GROWTH_CHALLENGE_KINDS = Object.values(GrowthChallengeKind);

export const GrowthChallengeMetric = {
  FOCUS_MINUTES: 'FOCUS_MINUTES',
  TASKS_COMPLETED: 'TASKS_COMPLETED',
  LEARNING_MINUTES: 'LEARNING_MINUTES',
  XP_GAINED: 'XP_GAINED',
} as const;
export type GrowthChallengeMetric =
  (typeof GrowthChallengeMetric)[keyof typeof GrowthChallengeMetric];

export const GROWTH_CHALLENGE_METRICS = Object.values(GrowthChallengeMetric);

export const GrowthChallengeStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type GrowthChallengeStatus =
  (typeof GrowthChallengeStatus)[keyof typeof GrowthChallengeStatus];

export const GROWTH_CHALLENGE_STATUSES = Object.values(GrowthChallengeStatus);

export const GrowthChallengeParticipantStatus = {
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  LEFT: 'LEFT',
} as const;
export type GrowthChallengeParticipantStatus =
  (typeof GrowthChallengeParticipantStatus)[keyof typeof GrowthChallengeParticipantStatus];

export const GROWTH_CHALLENGE_PARTICIPANT_STATUSES = Object.values(
  GrowthChallengeParticipantStatus,
);

export const GrowthNotificationKind = {
  REMINDER: 'REMINDER',
  ACHIEVEMENT: 'ACHIEVEMENT',
  FRIEND: 'FRIEND',
  FIGHT: 'FIGHT',
  STREAK: 'STREAK',
  RESULT: 'RESULT',
} as const;
export type GrowthNotificationKind =
  (typeof GrowthNotificationKind)[keyof typeof GrowthNotificationKind];

export const GROWTH_NOTIFICATION_KINDS = Object.values(GrowthNotificationKind);

/** Derived from principal, payments and due date. Not stored. */
export const PersonalDebtStatus = {
  ACTIVE: 'ACTIVE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type PersonalDebtStatus = (typeof PersonalDebtStatus)[keyof typeof PersonalDebtStatus];

export const PersonalNotificationKind = {
  BUDGET_NEAR: 'BUDGET_NEAR',
  BUDGET_OVER: 'BUDGET_OVER',
  RECURRING_DUE: 'RECURRING_DUE',
  RECURRING_OVERDUE: 'RECURRING_OVERDUE',
  GOAL_DUE_SOON: 'GOAL_DUE_SOON',
  GOAL_BEHIND: 'GOAL_BEHIND',
  DEBT_OVERDUE: 'DEBT_OVERDUE',
} as const;
export type PersonalNotificationKind =
  (typeof PersonalNotificationKind)[keyof typeof PersonalNotificationKind];

export const PersonalNotificationSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  DANGER: 'DANGER',
} as const;
export type PersonalNotificationSeverity =
  (typeof PersonalNotificationSeverity)[keyof typeof PersonalNotificationSeverity];

/** Referral wallet / commission row. Isolated from PersonalEntry and store Expense. */
export const ReferralCommissionStatus = {
  PENDING: 'PENDING',
  AVAILABLE: 'AVAILABLE',
  WITHDRAW_REQUESTED: 'WITHDRAW_REQUESTED',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
} as const;
export type ReferralCommissionStatus =
  (typeof ReferralCommissionStatus)[keyof typeof ReferralCommissionStatus];

export const ReferralWithdrawalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
} as const;
export type ReferralWithdrawalStatus =
  (typeof ReferralWithdrawalStatus)[keyof typeof ReferralWithdrawalStatus];

export const ReferralPaymentSourceType = {
  PLATFORM_INVOICE: 'PLATFORM_INVOICE',
  SUBSCRIPTION_REQUEST: 'SUBSCRIPTION_REQUEST',
} as const;
export type ReferralPaymentSourceType =
  (typeof ReferralPaymentSourceType)[keyof typeof ReferralPaymentSourceType];

export const DEFAULT_REFERRAL_COMMISSION_PERCENT = 10;
export const DEFAULT_REFERRAL_MIN_WITHDRAWAL_SOM = 100_000;
