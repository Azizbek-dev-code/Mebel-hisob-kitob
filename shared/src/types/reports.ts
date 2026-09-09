import type { AnalyticsPeriod, FinancialSummary, FinancialTrend, ExpenseAnalytics } from './analytics.js';
import type { DebtListItem, DebtSummary } from './debts.js';
import type { InventorySummary } from './inventory.js';
import type { IsoDateString, Money } from './api.js';
import type { PaymentMethod } from '../constants/enums.js';
import type { ReportsSupplierPayables } from './purchasing.js';

/**
 * Financial reports API contract.
 *
 * Totals reuse analytics / debt / inventory / worker-ledger aggregates.
 * Money is whole so'm. `storeId` is never accepted from the client.
 *
 * Accounting sources (authoritative):
 * - Revenue / COGS / Gross / Net: `Sale` stored columns + ACTIVE expenses
 *   via analytics (`netProfit = grossProfit − operatingExpenses`).
 * - Settled compensation: `WorkerFinancialTransaction` COMMISSION + COMPENSATION
 *   reference (not subtracted again from netProfit — not an Expense row).
 * - Cash in: `Payment` with paidAt in range on revenue sales.
 * - Cash out (supported): ACTIVE expenses by expenseDate; worker PAYMENT rows.
 * - Debt: unsettled ACTIVE/COMPLETED sales remainingAmount.
 * - Inventory: Product stockQty + StockMovement period deltas.
 */

export interface ReportMetricSources {
  revenue: 'Sale.totalSalePrice (ACTIVE|COMPLETED)';
  cogs: 'Sale.totalCostPrice (ACTIVE|COMPLETED)';
  grossProfit: 'Sale.grossProfit';
  operatingExpenses: 'Expense.amount (ACTIVE)';
  netProfit: 'grossProfit − operatingExpenses';
  cashCollected: 'Payment.amount (paidAt in range, revenue sales)';
  settledCompensation: 'WorkerFinancialTransaction COMMISSION + COMPENSATION ref';
  receivables: 'Sale.remainingAmount > 0 (ACTIVE|COMPLETED)';
}

export interface ReportsSummaryExtras {
  /** COMMISSION rows posted via compensation settle in the period. */
  settledCompensation: Money;
  settledCompensationCount: number;
  /** Cancelled sales in the period (excluded from revenue). */
  cancelledSalesCount: number;
  /** Cancelled expenses in the period (excluded from opex). */
  cancelledExpenseCount: number;
  cancelledExpenseAmount: Money;
  /**
   * Completed worker service fees kept on cancelled sales / purchases.
   * The work was performed, so the fee is a real cost even though the document
   * no longer contributes revenue. Informational — netProfit does not subtract
   * COMMISSION rows, so this is never double counted.
   */
  retainedWorkerFeesOnCancelled: Money;
  retainedWorkerFeesOnCancelledCount: number;
  /** Point-in-time receivables (not period-scoped). */
  debt: DebtSummary;
  /**
   * Settled commission is ledger earnings, not Expense rows.
   * Net profit formula does NOT subtract this again.
   */
  compensationInNetProfit: false;
}

export interface ReportsSummary {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  financial: FinancialSummary;
  extras: ReportsSummaryExtras;
  sources: ReportMetricSources;
}

export interface ReportsSalesSellerRow {
  sellerId: string | null;
  sellerName: string;
  salesCount: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  discounts: Money;
  averageOrderValue: Money;
  customerCount: number;
  settledCompensation: Money;
}

export interface ReportsSalesProductRow {
  productId: string | null;
  productName: string;
  quantity: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
}

export interface ReportsSalesCategoryRow {
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  marginPercent: number | null;
}

export interface ReportsSalesDayRow {
  date: string;
  label: string;
  salesCount: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
}

export interface ReportsSalesReport {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  totals: {
    salesCount: number;
    revenue: Money;
    cogs: Money;
    grossProfit: Money;
    discounts: Money;
    averageOrderValue: Money;
    grossMarginPercent: number | null;
    cancelledSalesCount: number;
  };
  byDay: ReportsSalesDayRow[];
  bySeller: ReportsSalesSellerRow[];
  byProduct: ReportsSalesProductRow[];
  byCategory: ReportsSalesCategoryRow[];
}

export interface ReportsProfitLossLine {
  key: string;
  label: string;
  amount: Money;
  /** Share of revenue, 0–100. Null if revenue is 0. */
  percentOfRevenue: number | null;
  previousAmount: Money | null;
  changePercent: number | null;
}

export interface ReportsProfitLoss {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  lines: ReportsProfitLossLine[];
  /** Settled commission shown informationally — not a P&L subtraction. */
  settledCompensationNote: {
    amount: Money;
    count: number;
    includedInNetProfit: false;
  };
}

export interface ReportsCashFlowMethodRow {
  method: PaymentMethod;
  amount: Money;
}

export interface ReportsCashFlow {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  /** Opening/closing cash balances are not modeled — omitted intentionally. */
  openingBalanceSupported: false;
  closingBalanceSupported: false;
  inflow: {
    total: Money;
    byMethod: ReportsCashFlowMethodRow[];
  };
  outflow: {
    /** ACTIVE expenses in period. */
    operatingExpenses: Money;
    /** Worker PAYMENT ledger rows (cash to workers). */
    workerPayments: Money;
    /** SupplierPayment.amount in period (cash to suppliers — not opex). */
    supplierPayments: Money;
    total: Money;
  };
  netCashFlow: Money;
  notes: string[];
}

export interface ReportsDebtsReport {
  generatedAt: IsoDateString;
  summary: DebtSummary;
  /** Top unsettled debtors (capped). */
  items: DebtListItem[];
  periodPaymentsCollected: Money;
}

export interface ReportsWorkersReport {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  sellers: ReportsSalesSellerRow[];
  compensation: {
    settledTotal: Money;
    settledCount: number;
    byWorker: Array<{
      workerId: string;
      workerName: string;
      settledAmount: Money;
      settledCount: number;
    }>;
  };
}

export interface ReportsProductsReport {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  limit: number;
  items: ReportsSalesProductRow[];
  byCategory: ReportsSalesCategoryRow[];
}

export interface ReportsInventoryMovementTotals {
  stockIn: number;
  stockOut: number;
  soldQuantity: number;
  cancelledSaleQuantity: number;
}

export interface ReportsInventoryReport {
  generatedAt: IsoDateString;
  snapshot: InventorySummary;
  movements: ReportsInventoryMovementTotals;
  period: AnalyticsPeriod;
}

export interface ReportsExpensesReport {
  analytics: ExpenseAnalytics;
  cancelledExpenseCount: number;
  cancelledExpenseAmount: Money;
}

export interface ReportsBundle {
  summary: ReportsSummary;
  profitLoss: ReportsProfitLoss;
  cashFlow: ReportsCashFlow;
  sales: ReportsSalesReport;
  expenses: ReportsExpensesReport;
  debts: ReportsDebtsReport;
  /** Supplier payables — Purchase.remainingAmount (ACTIVE). Not customer debts. */
  supplierPayables: ReportsSupplierPayables;
  workers: ReportsWorkersReport;
  products: ReportsProductsReport;
  inventory: ReportsInventoryReport;
  trend: FinancialTrend;
}

export type ReportsSummaryResponse = { summary: ReportsSummary };
export type ReportsSalesResponse = { sales: ReportsSalesReport };
export type ReportsProfitLossResponse = { profitLoss: ReportsProfitLoss };
export type ReportsCashFlowResponse = { cashFlow: ReportsCashFlow };
export type ReportsDebtsResponse = { debts: ReportsDebtsReport };
export type ReportsSupplierPayablesResponse = {
  supplierPayables: ReportsSupplierPayables;
};
export type ReportsWorkersResponse = { workers: ReportsWorkersReport };
export type ReportsProductsResponse = { products: ReportsProductsReport };
export type ReportsInventoryResponse = { inventory: ReportsInventoryReport };
export type ReportsExpensesResponse = { expenses: ReportsExpensesReport };
export type ReportsTrendResponse = { trend: FinancialTrend };
export type ReportsBundleResponse = { reports: ReportsBundle };
