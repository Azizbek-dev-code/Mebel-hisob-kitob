/**
 * Audit trail vocabulary.
 *
 * `AuditLog.eventType` and `AuditLog.entityType` are plain `String` columns in
 * Postgres rather than database enums. An audit row is a historical fact: once
 * written it must stay readable even after the code that produced it is gone,
 * and a database enum would force a migration (and a rewrite of the type) every
 * time a new event is added — the one thing an append-only table must never
 * need. The values below are therefore the *writing* contract; readers must
 * tolerate a string they do not recognise.
 */

export const AuditEventType = {
  // --- Session -------------------------------------------------------------
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FAILED_LOGIN: 'FAILED_LOGIN',

  // --- Users / workers -----------------------------------------------------
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_DISABLED: 'USER_DISABLED',

  // --- Customers -----------------------------------------------------------
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  CUSTOMER_ARCHIVED: 'CUSTOMER_ARCHIVED',
  CUSTOMER_RESTORED: 'CUSTOMER_RESTORED',

  // --- Catalogue -----------------------------------------------------------
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_ARCHIVED: 'PRODUCT_ARCHIVED',
  PRODUCT_RESTORED: 'PRODUCT_RESTORED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_IMAGE_CHANGED: 'PRODUCT_IMAGE_CHANGED',

  // --- Inventory -----------------------------------------------------------
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',

  // --- Sales ---------------------------------------------------------------
  SALE_CREATED: 'SALE_CREATED',
  SALE_UPDATED: 'SALE_UPDATED',
  SALE_CANCELLED: 'SALE_CANCELLED',
  SALE_DELETED: 'SALE_DELETED',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  INSTALLMENT_CREATED: 'INSTALLMENT_CREATED',
  INSTALLMENT_PAYMENT_CREATED: 'INSTALLMENT_PAYMENT_CREATED',

  // --- Expenses ------------------------------------------------------------
  EXPENSE_CREATED: 'EXPENSE_CREATED',
  EXPENSE_CANCELLED: 'EXPENSE_CANCELLED',

  // --- Workers & compensation ----------------------------------------------
  WORKER_CREATED: 'WORKER_CREATED',
  WORKER_UPDATED: 'WORKER_UPDATED',
  COMPENSATION_RULE_CREATED: 'COMPENSATION_RULE_CREATED',
  COMPENSATION_RULE_UPDATED: 'COMPENSATION_RULE_UPDATED',
  COMPENSATION_SETTLED: 'COMPENSATION_SETTLED',

  // --- Purchasing ----------------------------------------------------------
  PURCHASE_CREATED: 'PURCHASE_CREATED',
  PURCHASE_CANCELLED: 'PURCHASE_CANCELLED',
  SUPPLIER_PAYMENT_CREATED: 'SUPPLIER_PAYMENT_CREATED',
  SUPPLIER_CREATED: 'SUPPLIER_CREATED',
  SUPPLIER_UPDATED: 'SUPPLIER_UPDATED',
  SUPPLIER_ARCHIVED: 'SUPPLIER_ARCHIVED',
  SUPPLIER_RESTORED: 'SUPPLIER_RESTORED',

  // --- Administration ------------------------------------------------------
  STORE_SETTINGS_UPDATED: 'STORE_SETTINGS_UPDATED',
  STORE_DATA_RESET: 'STORE_DATA_RESET',
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_RESTORED: 'BACKUP_RESTORED',

  // --- Platform store onboarding -------------------------------------------
  STORE_CREATION_REQUESTED: 'STORE_CREATION_REQUESTED',
  STORE_CREATION_APPROVED: 'STORE_CREATION_APPROVED',
  STORE_CREATION_REJECTED: 'STORE_CREATION_REJECTED',

  SUBSCRIPTION_PLAN_CREATED: 'SUBSCRIPTION_PLAN_CREATED',
  SUBSCRIPTION_PLAN_UPDATED: 'SUBSCRIPTION_PLAN_UPDATED',
  SUBSCRIPTION_ASSIGNED: 'SUBSCRIPTION_ASSIGNED',
  SUBSCRIPTION_TRIAL_STARTED: 'SUBSCRIPTION_TRIAL_STARTED',
  SUBSCRIPTION_PAYMENT_REQUESTED: 'SUBSCRIPTION_PAYMENT_REQUESTED',
  SUBSCRIPTION_REQUEST_CREATED: 'SUBSCRIPTION_REQUEST_CREATED',
  SUBSCRIPTION_REQUEST_APPROVED: 'SUBSCRIPTION_REQUEST_APPROVED',
  SUBSCRIPTION_REQUEST_REJECTED: 'SUBSCRIPTION_REQUEST_REJECTED',
  SUBSCRIPTION_PAYMENT_RECORDED: 'SUBSCRIPTION_PAYMENT_RECORDED',
  SUBSCRIPTION_PAYMENT_APPROVED: 'SUBSCRIPTION_PAYMENT_APPROVED',
  SUBSCRIPTION_PAYMENT_REJECTED: 'SUBSCRIPTION_PAYMENT_REJECTED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_MANUALLY_ACTIVATED: 'SUBSCRIPTION_MANUALLY_ACTIVATED',
  SUBSCRIPTION_PLAN_CHANGED: 'SUBSCRIPTION_PLAN_CHANGED',
  STORE_PAYMENT_BLOCKED: 'STORE_PAYMENT_BLOCKED',
  STORE_MANUALLY_BLOCKED: 'STORE_MANUALLY_BLOCKED',
  STORE_UNBLOCKED: 'STORE_UNBLOCKED',
  PLATFORM_EXPENSE_CREATED: 'PLATFORM_EXPENSE_CREATED',
  PLATFORM_EXPENSE_UPDATED: 'PLATFORM_EXPENSE_UPDATED',
  PLATFORM_EXPENSE_CANCELLED: 'PLATFORM_EXPENSE_CANCELLED',
  PLATFORM_SETTINGS_UPDATED: 'PLATFORM_SETTINGS_UPDATED',
} as const;
export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export const AUDIT_EVENT_TYPES = Object.values(AuditEventType);

/** The kind of record an event is about — the second axis of the UI filter. */
export const AuditEntityType = {
  SESSION: 'SESSION',
  USER: 'USER',
  CUSTOMER: 'CUSTOMER',
  PRODUCT: 'PRODUCT',
  STOCK: 'STOCK',
  SALE: 'SALE',
  PAYMENT: 'PAYMENT',
  INSTALLMENT: 'INSTALLMENT',
  EXPENSE: 'EXPENSE',
  WORKER: 'WORKER',
  COMPENSATION_RULE: 'COMPENSATION_RULE',
  PURCHASE: 'PURCHASE',
  SUPPLIER: 'SUPPLIER',
  SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',
  STORE: 'STORE',
  BACKUP: 'BACKUP',
  STORE_CREATION_REQUEST: 'STORE_CREATION_REQUEST',
  SUBSCRIPTION_PLAN: 'SUBSCRIPTION_PLAN',
  STORE_SUBSCRIPTION: 'STORE_SUBSCRIPTION',
  SUBSCRIPTION_REQUEST: 'SUBSCRIPTION_REQUEST',
  PLATFORM_INVOICE: 'PLATFORM_INVOICE',
  PLATFORM_EXPENSE: 'PLATFORM_EXPENSE',
  PLATFORM_SETTINGS: 'PLATFORM_SETTINGS',
} as const;
export type AuditEntityType = (typeof AuditEntityType)[keyof typeof AuditEntityType];

export const AUDIT_ENTITY_TYPES = Object.values(AuditEntityType);

/**
 * Metadata keys that are dropped before an audit row is written.
 *
 * Matched case-insensitively as a substring, so `passwordHash`, `newPassword`
 * and `PASSWORD` are all caught by `password`. The audit trail records that a
 * password was reset; it must never record the password.
 */
export const AUDIT_SENSITIVE_KEY_PATTERNS: readonly string[] = [
  'password',
  'secret',
  'token',
  'hash',
  'salt',
  'credential',
  'authorization',
  'apikey',
  'privatekey',
  'sessionid',
  'cookie',
  // Matches DATABASE_URL / databaseUrl without redacting every key that contains "url".
  'databaseurl',
];

/**
 * Keys matched in full rather than as a substring.
 *
 * `pin` and `otp` are too short to match safely inside a longer word — `pin`
 * alone would redact `shipping`.
 */
export const AUDIT_SENSITIVE_KEY_EXACT: readonly string[] = ['pin', 'otp', 'cvv', 'auth'];

/** Placeholder written in place of a stripped value, so the shape stays legible. */
export const AUDIT_REDACTED = '[redacted]';
