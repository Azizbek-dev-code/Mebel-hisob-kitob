import type {
  AssemblyTaskStatus,
  FulfilmentStatus,
  WorkerCompensationType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';
import type { SellerActiveRule, SellerReportPaymentItem, SellerSaleOpsItem } from './seller-ops.js';
import type { WorkerFinancialSummary } from './worker-finances.js';

/** Tabs shown on worker profile (only for responsibilities the worker holds). */
export type WorkerProfileModuleTab =
  | 'GENERAL'
  | 'SELLER'
  | 'ASSEMBLER'
  | 'DELIVERY'
  | 'INSTALLER'
  | 'SMM'
  | 'OTHER';

export interface WorkerProfileFinanceSnapshot {
  earned: Money;
  paid: Money;
  outstanding: Money;
  monthEarned: Money;
  monthPaid: Money;
  bonuses: Money;
  advances: Money;
  debt: Money;
  adjustments: Money;
  reversals: Money;
  commissions: Money;
}

export interface WorkerProfileResponsibilityBreakdown {
  responsibility: WorkerResponsibility;
  label: string;
  earned: Money;
  count: number;
  /** Extra context for the general tab. */
  detail?: string | null;
}

export interface WorkerProfileCommissionLine {
  id: string;
  saleId: string | null;
  saleNumber: number | null;
  description: string | null;
  /** PERCENT_OF_SALE | PERCENT_OF_GROSS_PROFIT (yalpi foyda) | FIXED_PER_SALE | … */
  ruleType: string | null;
  /** Human base explanation, e.g. "Yalpi foyda: 3 000 000". */
  baseLabel: string | null;
  rateLabel: string | null;
  amount: Money;
  status: 'OPEN' | 'REVERSED';
  occurredAt: IsoDateString;
}

export interface WorkerProfileSellerModule {
  salesToday: number;
  salesThisMonth: number;
  salesTotal: number;
  salesAmountToday: Money;
  salesAmountMonth: Money;
  salesAmountTotal: Money;
  grossProfitMonth: Money;
  grossProfitTotal: Money;
  netProfitMonth: Money;
  netProfitTotal: Money;
  averageSale: Money;
  largestSaleMonth: Money;
  completedSales: number;
  cancelledSales: number;
  /** Settled seller COMMISSION in ledger (net reversals). */
  earnedTotal: Money;
  earnedMonth: Money;
  pendingTotal: Money;
  pendingMonth: Money;
  calculatedTotal: Money;
  calculatedMonth: Money;
  paidTotal: Money;
  paidMonth: Money;
  outstandingTotal: Money;
  outstandingMonth: Money;
  bonusTotal: Money;
  bonusMonth: Money;
  /** @deprecated Use earnedTotal — kept for existing UI references. */
  commissionTotal: Money;
  activeRules: SellerActiveRule[];
  recentSales: SellerSaleOpsItem[];
  commissions: WorkerProfileCommissionLine[];
  payments: SellerReportPaymentItem[];
}

export interface WorkerProfileAssemblyTaskItem {
  id: string;
  saleId: string;
  saleNumber: number;
  customerName: string;
  productSummary: string;
  status: AssemblyTaskStatus;
  assignedAt: IsoDateString;
  completedAt: IsoDateString | null;
  assemblyFee: Money;
  ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE';
}

export interface WorkerProfileAssemblerModule {
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  completedThisMonth: number;
  feeTotal: Money;
  paid: Money;
  outstanding: Money;
  tasks: WorkerProfileAssemblyTaskItem[];
}

export interface WorkerProfileDeliveryItem {
  id: string;
  saleId: string;
  saleNumber: number;
  customerName: string;
  address: string | null;
  deliveryDate: IsoDateString | null;
  status: FulfilmentStatus;
  fee: Money;
  ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE';
  /** Shown when SCHEDULED with fee > 0. */
  hint: string | null;
}

export interface WorkerProfilePurchaseDeliveryItem {
  id: string;
  purchaseNumber: number;
  supplierName: string;
  driverFee: Money;
  date: IsoDateString;
  status: string;
  ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE';
}

export interface WorkerProfileDeliveryModule {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  feeTotal: Money;
  feeThisMonth: Money;
  paid: Money;
  outstanding: Money;
  saleDeliveries: WorkerProfileDeliveryItem[];
  purchaseDeliveries: WorkerProfilePurchaseDeliveryItem[];
}

export interface WorkerProfileInstallationItem {
  saleId: string;
  saleNumber: number;
  customerName: string;
  fee: Money;
  status: FulfilmentStatus;
  completedAt: IsoDateString | null;
  ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE';
}

export interface WorkerProfileInstallerModule {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  feeTotal: Money;
  paid: Money;
  outstanding: Money;
  installations: WorkerProfileInstallationItem[];
}

export interface WorkerProfileSmmModule {
  monthEarned: Money;
  paid: Money;
  outstanding: Money;
  bonuses: Money;
  advances: Money;
  debt: Money;
  payments: Money;
  adjustments: Money;
}

export interface WorkerProfileModules {
  worker: {
    id: string;
    fullName: string;
    username: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    responsibilities: WorkerResponsibility[];
    createdAt: IsoDateString;
  };
  tabs: WorkerProfileModuleTab[];
  general: {
    finance: WorkerProfileFinanceSnapshot;
    breakdown: WorkerProfileResponsibilityBreakdown[];
  };
  seller: WorkerProfileSellerModule | null;
  assembler: WorkerProfileAssemblerModule | null;
  delivery: WorkerProfileDeliveryModule | null;
  installer: WorkerProfileInstallerModule | null;
  smm: WorkerProfileSmmModule | null;
  other: WorkerProfileSmmModule | null;
  /** Full ledger summary for convenience (same as finances summary). */
  ledgerSummary: WorkerFinancialSummary;
}

export interface WorkerProfileModulesResponse {
  modules: WorkerProfileModules;
}

/** Admin reconciliation: P&L costs vs open worker ledger commissions. */
export interface WorkerFeeReconciliationRow {
  kind: 'ASSEMBLY' | 'DELIVERY' | 'INSTALLER' | 'PURCHASE_DRIVER';
  label: string;
  pnlTotal: Money;
  ledgerTotal: Money;
  difference: Money;
}

export interface WorkerFeeReconciliation {
  storeId: string;
  rows: WorkerFeeReconciliationRow[];
  hasDifferences: boolean;
}

export interface WorkerFeeReconciliationResponse {
  reconciliation: WorkerFeeReconciliation;
}

/** Extended list row for admin workforce table. */
export interface WorkerWorkforceListItem {
  id: string;
  fullName: string;
  username: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  responsibilities: WorkerResponsibility[];
  salesCount: number;
  assemblyCompleted: number;
  deliveryCompleted: number;
  installationCompleted: number;
  earned: Money;
  paid: Money;
  outstanding: Money;
}

export type { WorkerCompensationType, WorkerFinancialTransactionType };
