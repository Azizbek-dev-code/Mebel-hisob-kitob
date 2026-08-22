/**
 * Every store-scoped table, in an order that satisfies the foreign keys.
 *
 * This list is the contract between the exporter and the restorer, and the
 * order is load-bearing in both directions:
 *
 * * Inserting walks it forwards, so a row's parents already exist. `createMany`
 *   issues one statement per collection with no constraint deferral, which is
 *   why "sales before saleItems" is a correctness requirement, not a
 *   preference.
 * * Deleting walks it backwards. Several relations are `onDelete: Restrict`
 *   (a worker's ledger, a product's stock movements, a supplier's purchases),
 *   so deleting a parent before its children fails outright rather than
 *   cascading.
 *
 * `BackupJob` is deliberately absent: the record of which backups exist must
 * survive restoring the data those backups describe.
 *
 * `AuditLog` is absent for a stronger reason. A restore purges the store by
 * walking this list backwards, so listing the trail here would let anyone erase
 * the evidence of what they did simply by restoring an older backup. The trail
 * outlives the data it describes, and the restore itself is appended to it.
 *
 * Adding a store-scoped model to `schema.prisma` without adding it here means
 * its rows are silently dropped from every export. The guard test in
 * `models.test.ts` compares this list against the Prisma DMMF and fails when
 * the two drift apart.
 *
 * StoreCreationRequest is platform-level (no `storeId` column) and is therefore
 * not part of a store export. Existing stores are never forced through the
 * approval flow by a restore.
 *
 * StoreSubscription, PlatformInvoice and SubscriptionRequest are SaaS billing
 * history: a store restore must not wipe or rewrite platform billing.
 */
export interface BackupModel {
  /** Collection name inside the export document. */
  readonly key: string;
  /** Prisma client delegate, e.g. `prisma.userResponsibility`. */
  readonly delegate: string;
}

export const BACKUP_MODELS: readonly BackupModel[] = [
  { key: 'users', delegate: 'user' },
  { key: 'userResponsibilities', delegate: 'userResponsibility' },
  { key: 'productCategories', delegate: 'productCategory' },
  { key: 'products', delegate: 'product' },
  { key: 'customers', delegate: 'customer' },
  { key: 'suppliers', delegate: 'supplier' },
  { key: 'purchases', delegate: 'purchase' },
  { key: 'purchaseItems', delegate: 'purchaseItem' },
  { key: 'supplierPayments', delegate: 'supplierPayment' },
  { key: 'sales', delegate: 'sale' },
  { key: 'saleItems', delegate: 'saleItem' },
  { key: 'saleWorkerCompensations', delegate: 'saleWorkerCompensation' },
  { key: 'installmentPlans', delegate: 'installmentPlan' },
  // Payments carry an optional FK to an installment row, so the schedule is
  // written first even though the plan is what owns it.
  { key: 'installmentPayments', delegate: 'installmentPayment' },
  { key: 'payments', delegate: 'payment' },
  { key: 'assemblyTasks', delegate: 'assemblyTask' },
  { key: 'expenseCategories', delegate: 'expenseCategory' },
  { key: 'expenses', delegate: 'expense' },
  { key: 'stockMovements', delegate: 'stockMovement' },
  { key: 'workerFinancialTransactions', delegate: 'workerFinancialTransaction' },
  { key: 'workerCompensationRules', delegate: 'workerCompensationRule' },
  { key: 'workerActivities', delegate: 'workerActivity' },
] as const;

/** Insert order: parents before children. */
export const BACKUP_INSERT_ORDER: readonly BackupModel[] = BACKUP_MODELS;

/** Delete order: children before parents. */
export const BACKUP_DELETE_ORDER: readonly BackupModel[] = [...BACKUP_MODELS].reverse();

export const BACKUP_MODEL_KEYS: readonly string[] = BACKUP_MODELS.map((model) => model.key);
