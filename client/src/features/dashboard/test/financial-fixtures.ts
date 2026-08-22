import type {
  ExpenseAnalytics,
  FinancialSummary,
  FinancialTrend,
} from '@furniture-erp/shared';
import { DashboardGranularity } from '@furniture-erp/shared';

/** Empty August period — no sales, no expenses. */
export const EMPTY_FINANCIAL_SUMMARY: FinancialSummary = {
  period: {
    from: '2026-08-01',
    to: '2026-08-31',
    fromInstant: '2026-07-31T19:00:00.000Z',
    toInstant: '2026-08-31T19:00:00.000Z',
    label: 'This month',
    timeZone: 'Asia/Tashkent',
  },
  generatedAt: '2026-08-09T05:00:00.000Z',
  metrics: {
    revenue: 0,
    cashCollected: 0,
    remainingReceivables: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    additionalCosts: 0,
    saleNetProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
    expenseCount: 0,
    salesCount: 0,
  },
  previousPeriod: {
    period: {
      from: '2026-07-01',
      to: '2026-07-31',
      fromInstant: '2026-06-30T19:00:00.000Z',
      toInstant: '2026-07-31T19:00:00.000Z',
      label: 'Previous · This month',
      timeZone: 'Asia/Tashkent',
    },
    revenue: 0,
    cashCollected: 0,
    remainingReceivables: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    additionalCosts: 0,
    saleNetProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
    expenseCount: 0,
    salesCount: 0,
    changes: {
      revenue: { current: 0, previous: 0, changePercent: null },
      cashCollected: { current: 0, previous: 0, changePercent: null },
      costOfGoodsSold: { current: 0, previous: 0, changePercent: null },
      grossProfit: { current: 0, previous: 0, changePercent: null },
      operatingExpenses: { current: 0, previous: 0, changePercent: null },
      netProfit: { current: 0, previous: 0, changePercent: null },
    },
  },
};

/** Matches the known Step 3 PostgreSQL sanity check for August 2026. */
export const POPULATED_FINANCIAL_SUMMARY: FinancialSummary = {
  period: {
    from: '2026-08-01',
    to: '2026-08-31',
    fromInstant: '2026-07-31T19:00:00.000Z',
    toInstant: '2026-08-31T19:00:00.000Z',
    label: 'This month',
    timeZone: 'Asia/Tashkent',
  },
  generatedAt: '2026-08-09T05:00:00.000Z',
  metrics: {
    revenue: 20_450_000,
    cashCollected: 3_000_000,
    remainingReceivables: 17_450_000,
    costOfGoodsSold: 14_900_000,
    grossProfit: 5_550_000,
    additionalCosts: 200_000,
    saleNetProfit: 5_350_000,
    operatingExpenses: 2_100_000,
    netProfit: 3_450_000,
    expenseCount: 3,
    salesCount: 3,
  },
  previousPeriod: {
    period: {
      from: '2026-07-01',
      to: '2026-07-31',
      fromInstant: '2026-06-30T19:00:00.000Z',
      toInstant: '2026-07-31T19:00:00.000Z',
      label: 'Previous · This month',
      timeZone: 'Asia/Tashkent',
    },
    revenue: 10_000_000,
    cashCollected: 2_000_000,
    remainingReceivables: 5_000_000,
    costOfGoodsSold: 7_000_000,
    grossProfit: 3_000_000,
    additionalCosts: 0,
    saleNetProfit: 3_000_000,
    operatingExpenses: 1_000_000,
    netProfit: 2_000_000,
    expenseCount: 1,
    salesCount: 1,
    changes: {
      revenue: { current: 20_450_000, previous: 10_000_000, changePercent: 104.5 },
      cashCollected: { current: 3_000_000, previous: 2_000_000, changePercent: 50 },
      costOfGoodsSold: { current: 14_900_000, previous: 7_000_000, changePercent: 112.9 },
      grossProfit: { current: 5_550_000, previous: 3_000_000, changePercent: 85 },
      operatingExpenses: { current: 2_100_000, previous: 1_000_000, changePercent: 110 },
      netProfit: { current: 3_450_000, previous: 2_000_000, changePercent: 72.5 },
    },
  },
};

export const EMPTY_FINANCIAL_TREND: FinancialTrend = {
  period: EMPTY_FINANCIAL_SUMMARY.period,
  generatedAt: EMPTY_FINANCIAL_SUMMARY.generatedAt,
  granularity: DashboardGranularity.DAY,
  points: [
    {
      date: '2026-08-01',
      bucketStart: '2026-07-31T19:00:00.000Z',
      label: '1 Aug',
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
    },
    {
      date: '2026-08-02',
      bucketStart: '2026-08-01T19:00:00.000Z',
      label: '2 Aug',
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
    },
  ],
  totals: {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
  },
};

/** Chart series that reconciles with POPULATED_FINANCIAL_SUMMARY totals. */
export const POPULATED_FINANCIAL_TREND: FinancialTrend = {
  period: POPULATED_FINANCIAL_SUMMARY.period,
  generatedAt: POPULATED_FINANCIAL_SUMMARY.generatedAt,
  granularity: DashboardGranularity.DAY,
  points: [
    {
      date: '2026-08-08',
      bucketStart: '2026-08-07T19:00:00.000Z',
      label: '8 Aug',
      revenue: 9_500_000,
      cogs: 7_000_000,
      grossProfit: 2_500_000,
      operatingExpenses: 850_000,
      netProfit: 1_650_000,
    },
    {
      date: '2026-08-09',
      bucketStart: '2026-08-08T19:00:00.000Z',
      label: '9 Aug',
      revenue: 10_950_000,
      cogs: 7_900_000,
      grossProfit: 3_050_000,
      operatingExpenses: 1_250_000,
      netProfit: 1_800_000,
    },
  ],
  totals: {
    revenue: 20_450_000,
    cogs: 14_900_000,
    grossProfit: 5_550_000,
    operatingExpenses: 2_100_000,
    netProfit: 3_450_000,
  },
};

/** Negative net profit period for tone / accessibility checks. */
export const NEGATIVE_NET_SUMMARY: FinancialSummary = {
  ...POPULATED_FINANCIAL_SUMMARY,
  metrics: {
    ...POPULATED_FINANCIAL_SUMMARY.metrics,
    revenue: 1_000_000,
    costOfGoodsSold: 800_000,
    grossProfit: 200_000,
    operatingExpenses: 500_000,
    netProfit: -300_000,
    cashCollected: 200_000,
    remainingReceivables: 800_000,
    expenseCount: 2,
    salesCount: 1,
  },
  previousPeriod: {
    ...POPULATED_FINANCIAL_SUMMARY.previousPeriod!,
    changes: {
      ...POPULATED_FINANCIAL_SUMMARY.previousPeriod!.changes,
      netProfit: { current: -300_000, previous: 0, changePercent: null },
      revenue: { current: 1_000_000, previous: 0, changePercent: null },
    },
  },
};

export const EMPTY_EXPENSE_ANALYTICS: ExpenseAnalytics = {
  period: EMPTY_FINANCIAL_SUMMARY.period,
  generatedAt: EMPTY_FINANCIAL_SUMMARY.generatedAt,
  total: 0,
  count: 0,
  byCategory: [],
  dailyTrend: [
    { date: '2026-08-01', label: '1 Aug', amount: 0 },
    { date: '2026-08-02', label: '2 Aug', amount: 0 },
    { date: '2026-08-03', label: '3 Aug', amount: 0 },
  ],
};

/** Reconciles with August operating expenses = 2,100,000. */
export const POPULATED_EXPENSE_ANALYTICS: ExpenseAnalytics = {
  period: POPULATED_FINANCIAL_SUMMARY.period,
  generatedAt: POPULATED_FINANCIAL_SUMMARY.generatedAt,
  total: 2_100_000,
  count: 3,
  byCategory: [
    {
      categoryId: 'cat_elektr',
      categoryName: 'Elektr',
      amount: 1_600_000,
      percentage: 76.2,
      count: 2,
    },
    {
      categoryId: 'cat_boshqa',
      categoryName: 'Boshqa',
      amount: 500_000,
      percentage: 23.8,
      count: 1,
    },
  ],
  dailyTrend: [
    { date: '2026-08-01', label: '1 Aug', amount: 0 },
    { date: '2026-08-08', label: '8 Aug', amount: 850_000 },
    { date: '2026-08-09', label: '9 Aug', amount: 1_250_000 },
  ],
};
