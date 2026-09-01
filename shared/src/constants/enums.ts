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
