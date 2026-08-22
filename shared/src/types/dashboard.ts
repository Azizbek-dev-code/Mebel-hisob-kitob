import type { DateRangePreset, SalePaymentStatus, UserRole } from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

/**
 * The dashboard contract.
 *
 * Every figure below is calculated on the server from the signed-in user's store
 * and arrives ready to display: the client never adds up money itself, so a
 * total on screen cannot disagree with the same total in a report.
 *
 * Values that can legitimately be negative — profit — are typed `number` rather
 * than `Money`, mirroring `accounting/sale-totals.ts`. A loss-making month has to
 * be visible on the very screen that exists to reveal one.
 */

/** How the sales series is bucketed, chosen from the length of the period. */
export const DashboardGranularity = {
  HOUR: 'HOUR',
  DAY: 'DAY',
  MONTH: 'MONTH',
} as const;
export type DashboardGranularity = (typeof DashboardGranularity)[keyof typeof DashboardGranularity];

export interface DashboardRange {
  preset: DateRangePreset;
  /** Inclusive start of the period. */
  from: IsoDateString;
  /** Exclusive end of the period, so consecutive periods never double-count a sale. */
  to: IsoDateString;
  granularity: DashboardGranularity;
  /** Ready-to-display description of the period, formatted in the store's timezone. */
  label: string;
  /** IANA zone the period boundaries were resolved in. */
  timeZone: string;
}

export interface DashboardKpis {
  /** Always today in the store's timezone, whichever period is selected. */
  todayRevenue: Money;
  todaySalesCount: number;
  /** Always the current calendar month. */
  monthRevenue: Money;
  monthSalesCount: number;
  /** Scoped to the selected period. */
  periodRevenue: Money;
  periodSalesCount: number;
  /** A balance as of now, not a figure for the period. */
  outstandingDebt: Money;
  customersInDebt: number;
}

/**
 * The period's result, built only from figures the accounting model already
 * stores. Each line states which stored columns it sums so the numbers can be
 * reconciled against the sales themselves.
 */
export interface DashboardFinancials {
  /** Sum of `Sale.totalSalePrice`. */
  revenue: Money;
  /** Sum of `Sale.totalCostPrice` — what the store paid its suppliers. */
  costOfGoods: Money;
  /** Sum of `Sale.grossProfit` (revenue - cost of goods). May be negative. */
  grossProfit: number;
  /** Seller bonuses, installation, delivery and other per-sale costs. */
  additionalCosts: Money;
  /** Sum of `Sale.netProfit` (gross profit - additional costs). May be negative. */
  netProfit: number;
  /** Sum of `Expense.amount` — running costs, which sit outside any single sale. */
  expenses: Money;
  /** Net profit less business expenses. May be negative. */
  netResult: number;
}

export interface DashboardSalesPoint {
  bucketStart: IsoDateString;
  /** Axis label, formatted in the store's timezone. */
  label: string;
  revenue: Money;
  grossProfit: number;
  salesCount: number;
}

export interface DashboardRecentSale {
  id: string;
  saleNumber: number;
  saleDate: IsoDateString;
  customerName: string;
  /** The first line, plus a count of the rest: `Corner Sofa "Comfort" +2`. */
  productSummary: string;
  itemCount: number;
  /** Null when the sale was recorded without a seller, or the account has been removed. */
  sellerName: string | null;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
}

export interface DashboardDebtor {
  customerId: string;
  customerName: string;
  phone: string;
  outstanding: Money;
  /** How many unsettled sales make up the balance. */
  saleCount: number;
}

export interface DashboardDebt {
  /** Sum of `Sale.remainingAmount` across every unsettled sale, as of now. */
  totalOutstanding: Money;
  customersInDebt: number;
  /** Scheduled installments past their due date and still unpaid. */
  overdueInstallmentCount: number;
  overdueAmount: Money;
  topDebtors: DashboardDebtor[];
}

export interface DashboardSeller {
  userId: string;
  fullName: string;
  role: UserRole;
  salesCount: number;
  revenue: Money;
}

export interface DashboardWorkforce {
  /** Active accounts in the store. Staff management itself is a later phase. */
  activeStaff: number;
  /** Only accounts credited with at least one sale in the period, best first. */
  sellers: DashboardSeller[];
  /** Sales in the period with no seller recorded against them. */
  unassignedSalesCount: number;
}

export interface DashboardStore {
  id: string;
  name: string;
  timeZone: string;
  currency: string;
}

export interface DashboardSummary {
  store: DashboardStore;
  range: DashboardRange;
  generatedAt: IsoDateString;
  kpis: DashboardKpis;
  financials: DashboardFinancials;
  salesSeries: DashboardSalesPoint[];
  recentSales: DashboardRecentSale[];
  debt: DashboardDebt;
  workforce: DashboardWorkforce;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
}

export interface DashboardSummaryQuery {
  preset?: DateRangePreset;
  /** Calendar date `YYYY-MM-DD`, read in the store's timezone. Custom periods only. */
  from?: string;
  /** Inclusive calendar date `YYYY-MM-DD`. Custom periods only. */
  to?: string;
}

/** Longest custom period the summary will build, guarding against a runaway query. */
export const DASHBOARD_MAX_RANGE_DAYS = 732;
