import type { IsoDateString, Money } from './api.js';
import type { DashboardGranularity } from './dashboard.js';

/**
 * Financial analytics API contract (Phase 7 Step 3).
 *
 * All totals are computed server-side from stored sale columns and Expense rows.
 * Money is whole so'm. `storeId` is never accepted from the client.
 */

export interface AnalyticsPeriod {
  /** Inclusive calendar start `YYYY-MM-DD` (store timezone). */
  from: string;
  /** Inclusive calendar end `YYYY-MM-DD` (store timezone). */
  to: string;
  /** Inclusive start instant (ISO). */
  fromInstant: IsoDateString;
  /** Exclusive end instant (ISO). */
  toInstant: IsoDateString;
  label: string;
  timeZone: string;
}

export interface MetricChange {
  current: Money;
  previous: Money;
  /** Null when previous is zero (undefined percentage). */
  changePercent: number | null;
}

export interface FinancialSummaryMetrics {
  /** Sum of `Sale.totalSalePrice` for ACTIVE/COMPLETED sales in the period. */
  revenue: Money;
  /** Sum of `Payment.amount` with `paidAt` in the period (cash basis). */
  cashCollected: Money;
  /** Sum of `Sale.remainingAmount` for period sales still owing. */
  remainingReceivables: Money;
  /** Sum of `Sale.totalCostPrice` (supplier cost / COGS). */
  costOfGoodsSold: Money;
  /** Sum of `Sale.grossProfit` (= revenue − COGS at the sale level). */
  grossProfit: Money;
  /**
   * Per-sale operating add-ons already deducted into `Sale.netProfit`
   * (seller bonus, installation, delivery, other).
   */
  additionalCosts: Money;
  /** Sum of `Sale.netProfit` (gross − additional costs). */
  saleNetProfit: Money;
  /** Sum of `Expense.amount` for `expenseDate` in the period. */
  operatingExpenses: Money;
  /**
   * Period bottom line for this API:
   * `grossProfit − operatingExpenses`.
   *
   * Distinct from `saleNetProfit` (which already deducts per-sale add-ons) and
   * from the dashboard's `netResult` (`saleNetProfit − operatingExpenses`).
   */
  netProfit: Money;
  /** Count of expense rows in the period. */
  expenseCount: number;
  /** Count of revenue sales in the period. */
  salesCount: number;
}

export interface FinancialSummaryPrevious extends FinancialSummaryMetrics {
  period: AnalyticsPeriod;
  changes: {
    revenue: MetricChange;
    cashCollected: MetricChange;
    costOfGoodsSold: MetricChange;
    grossProfit: MetricChange;
    operatingExpenses: MetricChange;
    netProfit: MetricChange;
  };
}

export interface FinancialSummary {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  metrics: FinancialSummaryMetrics;
  previousPeriod: FinancialSummaryPrevious | null;
}

export interface ExpenseCategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: Money;
  /** Share of period expense total, 0–100, one decimal. Null if total is 0. */
  percentage: number | null;
  count: number;
}

export interface ExpenseDailyPoint {
  /** Calendar date `YYYY-MM-DD` in the store timezone. */
  date: string;
  /** Display label, e.g. `9 Aug`. */
  label: string;
  amount: Money;
}

export interface ExpenseAnalytics {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  total: Money;
  count: number;
  byCategory: ExpenseCategoryBreakdownItem[];
  dailyTrend: ExpenseDailyPoint[];
}

/**
 * One bucket on the financial performance chart (day / hour / month).
 *
 * `netProfit` is grossProfit − operatingExpenses for the bucket — same rule as
 * the Step 3 financial summary, not `Sale.netProfit`.
 */
export interface FinancialTrendPoint {
  /** Calendar date `YYYY-MM-DD` of the bucket start in the store timezone. */
  date: string;
  /** Inclusive bucket start instant (ISO). */
  bucketStart: IsoDateString;
  /** Axis / tooltip label from the shared date-range helper. */
  label: string;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  operatingExpenses: Money;
  netProfit: Money;
}

export interface FinancialTrendTotals {
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  operatingExpenses: Money;
  netProfit: Money;
}

export interface FinancialTrend {
  period: AnalyticsPeriod;
  generatedAt: IsoDateString;
  /** DAY | HOUR | MONTH — matches `resolveDashboardRange` granularity. */
  granularity: DashboardGranularity;
  points: FinancialTrendPoint[];
  /** Sum of points — must reconcile with financial-summary KPIs for the same range. */
  totals: FinancialTrendTotals;
}

export type FinancialSummaryResponse = { summary: FinancialSummary };
export type ExpenseAnalyticsResponse = { analytics: ExpenseAnalytics };
export type FinancialTrendResponse = { trend: FinancialTrend };
