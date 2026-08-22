import {
  DashboardGranularity,
  DateRangePreset,
  moneyChangePercent,
  moneySharePercent,
  periodAdditionalCosts,
  periodNetProfit,
  type AnalyticsPeriod,
  type ExpenseAnalytics,
  type ExpenseCategoryBreakdownItem,
  type ExpenseDailyPoint,
  type FinancialSummary,
  type FinancialSummaryMetrics,
  type FinancialSummaryPrevious,
  type FinancialTrend,
  type FinancialTrendPoint,
  type FinancialTrendTotals,
  type MetricChange,
} from '@furniture-erp/shared';

import {
  buildRangeBuckets,
  resolveDashboardRange,
  type ResolvedDateRange,
  zonedParts,
} from '../lib/date-range.js';
import * as analyticsRepository from '../repositories/analytics.repository.js';
import { ApiError } from '../utils/api-error.js';
import { canManageExpenses } from './expense.service.js';

export function assertCanAccessAnalytics(role: string): void {
  if (!canManageExpenses(role)) {
    throw ApiError.forbidden('Only store administrators can view financial analytics');
  }
}

export interface AnalyticsPeriodInput {
  storeId: string;
  actorRole: string;
  /** Inclusive calendar dates YYYY-MM-DD. */
  from?: string;
  to?: string;
  preset?: DateRangePreset;
  now?: Date;
}

export interface FinancialSummaryInput extends AnalyticsPeriodInput {
  comparison?: 'previous' | null;
}

export interface ExpenseAnalyticsInput extends AnalyticsPeriodInput {
  categoryId?: string;
}

function calendarDateInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toAnalyticsPeriod(range: ResolvedDateRange): AnalyticsPeriod {
  const lastIncluded = new Date(range.to.getTime() - 1);
  return {
    from: calendarDateInZone(range.from, range.timeZone),
    to: calendarDateInZone(lastIncluded, range.timeZone),
    fromInstant: range.from.toISOString(),
    toInstant: range.to.toISOString(),
    label: range.label,
    timeZone: range.timeZone,
  };
}

/**
 * Previous window of equal length ending where the current window starts.
 * Works for any half-open `[from, to)` including calendar months from presets.
 */
export function previousEquivalentRange(range: ResolvedDateRange): ResolvedDateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  const from = new Date(range.from.getTime() - durationMs);
  const to = range.from;
  return {
    preset: DateRangePreset.CUSTOM,
    from,
    to,
    granularity: range.granularity,
    timeZone: range.timeZone,
    label: `Previous · ${range.label}`,
  };
}

async function resolveStoreRange(input: AnalyticsPeriodInput): Promise<{
  store: NonNullable<Awaited<ReturnType<typeof analyticsRepository.findStoreTimezone>>>;
  range: ResolvedDateRange;
  now: Date;
}> {
  assertCanAccessAnalytics(input.actorRole);

  const store = await analyticsRepository.findStoreTimezone(input.storeId);
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const now = input.now ?? new Date();
  const hasCustom = Boolean(input.from && input.to);
  const preset =
    input.preset ?? (hasCustom ? DateRangePreset.CUSTOM : DateRangePreset.THIS_MONTH);

  if (preset === DateRangePreset.CUSTOM && (!input.from || !input.to)) {
    throw ApiError.validation('A custom period needs both a start and an end date', [
      { field: input.from ? 'to' : 'from', message: 'Required for a custom period' },
    ]);
  }

  const range = resolveDashboardRange(
    preset,
    { from: input.from, to: input.to },
    store.timezone,
    now,
  );

  return { store, range, now };
}

function metricChange(current: number, previous: number): MetricChange {
  return {
    current,
    previous,
    changePercent: moneyChangePercent(current, previous),
  };
}

async function loadMetrics(
  storeId: string,
  from: Date,
  to: Date,
): Promise<FinancialSummaryMetrics> {
  const [sales, cashCollected, expenses] = await Promise.all([
    analyticsRepository.aggregateSalesPeriod(storeId, from, to),
    analyticsRepository.sumCashCollected(storeId, from, to),
    analyticsRepository.aggregateExpensesPeriod(storeId, from, to),
  ]);

  const additionalCosts = periodAdditionalCosts(sales.grossProfit, sales.netProfit);

  return {
    revenue: sales.revenue,
    cashCollected,
    remainingReceivables: sales.remainingReceivables,
    costOfGoodsSold: sales.costOfGoods,
    grossProfit: sales.grossProfit,
    additionalCosts,
    saleNetProfit: sales.netProfit,
    operatingExpenses: expenses.total,
    netProfit: periodNetProfit(sales.grossProfit, expenses.total),
    expenseCount: expenses.count,
    salesCount: sales.salesCount,
  };
}

export async function getFinancialSummary(
  input: FinancialSummaryInput,
): Promise<FinancialSummary> {
  const { store, range, now } = await resolveStoreRange(input);
  const metrics = await loadMetrics(store.id, range.from, range.to);

  let previousPeriod: FinancialSummaryPrevious | null = null;
  if (input.comparison === 'previous') {
    const previousRange = previousEquivalentRange(range);
    const previousMetrics = await loadMetrics(store.id, previousRange.from, previousRange.to);
    previousPeriod = {
      ...previousMetrics,
      period: toAnalyticsPeriod(previousRange),
      changes: {
        revenue: metricChange(metrics.revenue, previousMetrics.revenue),
        cashCollected: metricChange(metrics.cashCollected, previousMetrics.cashCollected),
        costOfGoodsSold: metricChange(metrics.costOfGoodsSold, previousMetrics.costOfGoodsSold),
        grossProfit: metricChange(metrics.grossProfit, previousMetrics.grossProfit),
        operatingExpenses: metricChange(
          metrics.operatingExpenses,
          previousMetrics.operatingExpenses,
        ),
        netProfit: metricChange(metrics.netProfit, previousMetrics.netProfit),
      },
    };
  }

  return {
    period: toAnalyticsPeriod(range),
    generatedAt: now.toISOString(),
    metrics,
    previousPeriod,
  };
}

function buildDailyTrend(
  range: ResolvedDateRange,
  rows: Array<{ expenseDate: Date; amount: number }>,
): ExpenseDailyPoint[] {
  // Force day buckets for the expense trend regardless of chart granularity.
  const dayRange: ResolvedDateRange = {
    ...range,
    granularity: DashboardGranularity.DAY,
  };
  // For year-long ranges, day buckets are still correct; cap is handled in buildRangeBuckets.
  const buckets = buildRangeBuckets(dayRange);

  // If the range is longer than ~2 months, buildRangeBuckets still produces days
  // when we force DAY — MAX_BUCKETS is 800 so a year is fine.
  const points: ExpenseDailyPoint[] = buckets.map((bucket) => ({
    date: calendarDateInZone(bucket.start, range.timeZone),
    label: bucket.label,
    amount: 0,
  }));

  let cursor = 0;
  for (const row of rows) {
    while (cursor < buckets.length && row.expenseDate >= buckets[cursor]!.end) {
      cursor += 1;
    }
    if (cursor >= buckets.length) break;
    if (row.expenseDate >= buckets[cursor]!.start && row.expenseDate < buckets[cursor]!.end) {
      points[cursor]!.amount += row.amount;
    }
  }

  // Keep every day in the selected period (amount 0 when none) so the chart
  // is a continuous time series that reconciles with the period total.
  return points;
}

export async function getExpenseAnalytics(
  input: ExpenseAnalyticsInput,
): Promise<ExpenseAnalytics> {
  const { store, range, now } = await resolveStoreRange(input);

  const [totals, categoryRows, seriesRows] = await Promise.all([
    analyticsRepository.aggregateExpensesPeriod(
      store.id,
      range.from,
      range.to,
      input.categoryId,
    ),
    analyticsRepository.groupExpensesByCategory(
      store.id,
      range.from,
      range.to,
      input.categoryId,
    ),
    analyticsRepository.findExpensesForSeries(
      store.id,
      range.from,
      range.to,
      input.categoryId,
    ),
  ]);

  const names = await analyticsRepository.findCategoryNames(
    store.id,
    categoryRows.map((row) => row.categoryId),
  );

  const byCategory: ExpenseCategoryBreakdownItem[] = categoryRows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: names.get(row.categoryId) ?? 'Unknown',
    amount: row.amount,
    percentage: moneySharePercent(row.amount, totals.total),
    count: row.count,
  }));

  return {
    period: toAnalyticsPeriod(range),
    generatedAt: now.toISOString(),
    total: totals.total,
    count: totals.count,
    byCategory,
    dailyTrend: buildDailyTrend(range, seriesRows),
  };
}

/**
 * Folds sales + expenses into chart buckets.
 *
 * Per bucket: netProfit = grossProfit − operatingExpenses (Step 3 definition).
 * Exported for unit tests so bucketing stays deterministic.
 */
export function buildFinancialTrendPoints(
  range: ResolvedDateRange,
  sales: analyticsRepository.SaleFinancialSeriesRow[],
  expenses: analyticsRepository.ExpenseSeriesRow[],
): FinancialTrendPoint[] {
  const buckets = buildRangeBuckets(range);
  const points: FinancialTrendPoint[] = buckets.map((bucket) => ({
    date: calendarDateInZone(bucket.start, range.timeZone),
    bucketStart: bucket.start.toISOString(),
    label: bucket.label,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
  }));

  if (points.length === 0) return points;

  let saleCursor = 0;
  for (const row of sales) {
    while (saleCursor < buckets.length && row.saleDate >= buckets[saleCursor]!.end) {
      saleCursor += 1;
    }
    if (saleCursor >= buckets.length) break;
    if (row.saleDate >= buckets[saleCursor]!.start && row.saleDate < buckets[saleCursor]!.end) {
      const point = points[saleCursor]!;
      point.revenue += row.revenue;
      point.cogs += row.cogs;
      point.grossProfit += row.grossProfit;
    }
  }

  let expenseCursor = 0;
  for (const row of expenses) {
    while (expenseCursor < buckets.length && row.expenseDate >= buckets[expenseCursor]!.end) {
      expenseCursor += 1;
    }
    if (expenseCursor >= buckets.length) break;
    if (
      row.expenseDate >= buckets[expenseCursor]!.start &&
      row.expenseDate < buckets[expenseCursor]!.end
    ) {
      points[expenseCursor]!.operatingExpenses += row.amount;
    }
  }

  for (const point of points) {
    point.netProfit = periodNetProfit(point.grossProfit, point.operatingExpenses);
  }

  return points;
}

function sumTrendTotals(points: FinancialTrendPoint[]): FinancialTrendTotals {
  let revenue = 0;
  let cogs = 0;
  let grossProfit = 0;
  let operatingExpenses = 0;
  for (const point of points) {
    revenue += point.revenue;
    cogs += point.cogs;
    grossProfit += point.grossProfit;
    operatingExpenses += point.operatingExpenses;
  }
  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit: periodNetProfit(grossProfit, operatingExpenses),
  };
}

export async function getFinancialTrend(input: AnalyticsPeriodInput): Promise<FinancialTrend> {
  const { store, range, now } = await resolveStoreRange(input);

  const [sales, expenses] = await Promise.all([
    analyticsRepository.findSalesForFinancialTrend(store.id, range.from, range.to),
    analyticsRepository.findExpensesForSeries(store.id, range.from, range.to),
  ]);

  const points = buildFinancialTrendPoints(range, sales, expenses);

  return {
    period: toAnalyticsPeriod(range),
    generatedAt: now.toISOString(),
    granularity: range.granularity,
    points,
    totals: sumTrendTotals(points),
  };
}

/** Exported for tests — inclusive end-date coverage via half-open range. */
export function resolveAnalyticsRangeForTests(
  preset: DateRangePreset,
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
  now: Date,
): ResolvedDateRange {
  return resolveDashboardRange(preset, { from, to }, timeZone, now);
}
