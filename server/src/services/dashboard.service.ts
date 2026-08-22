import {
  subtractMoney,
  sumMoney,
  toMoney,
  type DateRangePreset,
  type DashboardDebt,
  type DashboardDebtor,
  type DashboardFinancials,
  type DashboardRecentSale,
  type DashboardSalesPoint,
  type DashboardSummary,
  type DashboardWorkforce,
} from '@furniture-erp/shared';

import {
  addZonedDays,
  addZonedMonths,
  buildRangeBuckets,
  resolveDashboardRange,
  startOfZonedDay,
  startOfZonedMonth,
  type RangeBucket,
} from '../lib/date-range.js';
import * as dashboardRepository from '../repositories/dashboard.repository.js';
import type { CustomerDebtRow, SaleSeriesRow } from '../repositories/dashboard.repository.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Assembles the dashboard for one store.
 *
 * The store is always the caller's own: `storeId` comes from the session and is
 * passed down to every query, so there is no code path that could read another
 * store's sales, debt or profit.
 *
 * Nothing here invents an accounting rule. Revenue, cost of goods, gross profit
 * and net profit are the totals the sale itself stores, and the only figure this
 * derives is the net result — net profit less the period's business expenses,
 * which the schema deliberately keeps out of a sale's cost price.
 */

/** Enough recent sales to fill the panel without turning it into a sales list. */
const RECENT_SALES_LIMIT = 8;
const TOP_DEBTORS_LIMIT = 5;
const TOP_SELLERS_LIMIT = 6;

export interface DashboardSummaryOptions {
  storeId: string;
  preset: DateRangePreset;
  from?: string;
  to?: string;
  /** Injected by the tests so a period can be asserted against a fixed clock. */
  now?: Date;
}

export async function getDashboardSummary(
  options: DashboardSummaryOptions,
): Promise<DashboardSummary> {
  const { storeId, preset, from, to } = options;
  const now = options.now ?? new Date();

  const store = await dashboardRepository.findStoreSettings(storeId);
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const timeZone = store.timezone;
  const range = resolveDashboardRange(preset, { from, to }, timeZone, now);

  // "Today" and "this month" keep their own boundaries whatever period is
  // selected: they are the two figures a store checks without reading a label.
  const todayStart = startOfZonedDay(now, timeZone);
  const todayEnd = addZonedDays(todayStart, timeZone, 1);
  const monthStart = startOfZonedMonth(now, timeZone);
  const monthEnd = addZonedMonths(monthStart, timeZone, 1);

  // One round of concurrent queries rather than a request per panel.
  const [
    periodTotals,
    todayTotals,
    monthTotals,
    expenses,
    seriesRows,
    recentSaleRows,
    debtRows,
    overdue,
    sellerRows,
    activeStaff,
  ] = await Promise.all([
    dashboardRepository.aggregateSales(storeId, range.from, range.to),
    dashboardRepository.aggregateRevenue(storeId, todayStart, todayEnd),
    dashboardRepository.aggregateRevenue(storeId, monthStart, monthEnd),
    dashboardRepository.sumExpenses(storeId, range.from, range.to),
    dashboardRepository.findSalesForSeries(storeId, range.from, range.to),
    dashboardRepository.findRecentSales(storeId, range.from, range.to, RECENT_SALES_LIMIT),
    dashboardRepository.aggregateDebtByCustomer(storeId),
    dashboardRepository.aggregateOverdueInstallments(storeId, now),
    dashboardRepository.aggregateSalesBySeller(storeId, range.from, range.to),
    dashboardRepository.countActiveStaff(storeId),
  ]);

  const [debt, workforce] = await Promise.all([
    buildDebt(storeId, debtRows, overdue),
    buildWorkforce(storeId, sellerRows, activeStaff),
  ]);

  const financials = buildFinancials(periodTotals, expenses);

  return {
    store: {
      id: store.id,
      name: store.name,
      timeZone,
      currency: store.currency,
    },
    range: {
      preset: range.preset,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: range.granularity,
      label: range.label,
      timeZone,
    },
    generatedAt: now.toISOString(),
    kpis: {
      todayRevenue: todayTotals.revenue,
      todaySalesCount: todayTotals.salesCount,
      monthRevenue: monthTotals.revenue,
      monthSalesCount: monthTotals.salesCount,
      periodRevenue: periodTotals.revenue,
      periodSalesCount: periodTotals.salesCount,
      outstandingDebt: debt.totalOutstanding,
      customersInDebt: debt.customersInDebt,
    },
    financials,
    salesSeries: buildSalesSeries(buildRangeBuckets(range), seriesRows),
    recentSales: recentSaleRows.map(toRecentSale),
    debt,
    workforce,
  };
}

function buildFinancials(
  totals: dashboardRepository.SalesTotals,
  expenses: number,
): DashboardFinancials {
  return {
    revenue: totals.revenue,
    costOfGoods: totals.costOfGoods,
    grossProfit: totals.grossProfit,
    // Each sale stores `netProfit = grossProfit - additionalCosts`, so the
    // difference of the two sums is the period's additional costs exactly.
    additionalCosts: subtractMoney(totals.grossProfit, totals.netProfit),
    netProfit: totals.netProfit,
    expenses,
    netResult: toMoney(totals.netProfit - expenses),
  };
}

/**
 * Folds sales into the chart's buckets.
 *
 * Exported for its own tests: this is the one place the dashboard turns rows
 * into a shape nothing else in the system produces.
 */
export function buildSalesSeries(
  buckets: RangeBucket[],
  rows: SaleSeriesRow[],
): DashboardSalesPoint[] {
  const points = buckets.map((bucket) => ({
    bucketStart: bucket.start.toISOString(),
    label: bucket.label,
    revenue: 0,
    grossProfit: 0,
    salesCount: 0,
  }));

  if (points.length === 0) return points;

  const starts = buckets.map((bucket) => bucket.start.getTime());
  const rangeEnd = buckets[buckets.length - 1]?.end.getTime() ?? 0;

  for (const row of rows) {
    const at = row.saleDate.getTime();
    // Defensive: a row outside the queried window would otherwise land in the
    // first or last bucket and quietly overstate it.
    if (at < (starts[0] ?? 0) || at >= rangeEnd) continue;

    const point = points[bucketIndexFor(starts, at)];
    if (!point) continue;

    point.revenue = sumMoney(point.revenue, row.totalSalePrice);
    point.grossProfit = toMoney(point.grossProfit + row.grossProfit);
    point.salesCount += 1;
  }

  return points;
}

/** Index of the last bucket starting at or before `at`. */
function bucketIndexFor(starts: number[], at: number): number {
  let low = 0;
  let high = starts.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((starts[middle] ?? 0) <= at) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

function toRecentSale(row: dashboardRepository.RecentSaleRow): DashboardRecentSale {
  const extraItems = Math.max(0, row.itemCount - 1);
  const firstProduct = row.firstProductName ?? 'No items';

  return {
    id: row.id,
    saleNumber: row.saleNumber,
    saleDate: row.saleDate.toISOString(),
    customerName: `${row.customerFirstName} ${row.customerLastName}`.trim(),
    productSummary: extraItems > 0 ? `${firstProduct} +${extraItems}` : firstProduct,
    itemCount: row.itemCount,
    sellerName: row.sellerName,
    totalSalePrice: row.totalSalePrice,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
    paymentStatus: row.paymentStatus,
  };
}

async function buildDebt(
  storeId: string,
  rows: CustomerDebtRow[],
  overdue: dashboardRepository.OverdueInstallments,
): Promise<DashboardDebt> {
  const totalOutstanding = sumMoney(...rows.map((row) => row.outstanding));

  const ranked = [...rows]
    .sort((left, right) => right.outstanding - left.outstanding)
    .slice(0, TOP_DEBTORS_LIMIT);

  const customers = await dashboardRepository.findCustomersByIds(
    storeId,
    ranked.map((row) => row.customerId),
  );
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  const topDebtors = ranked.reduce<DashboardDebtor[]>((accumulator, row) => {
    const customer = customerById.get(row.customerId);
    // A customer the store scope did not return does not belong to this store.
    if (!customer) return accumulator;

    accumulator.push({
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      phone: customer.phone,
      outstanding: row.outstanding,
      saleCount: row.saleCount,
    });
    return accumulator;
  }, []);

  return {
    totalOutstanding,
    customersInDebt: rows.length,
    overdueInstallmentCount: overdue.count,
    overdueAmount: overdue.amount,
    topDebtors,
  };
}

async function buildWorkforce(
  storeId: string,
  rows: dashboardRepository.SellerSalesRow[],
  activeStaff: number,
): Promise<DashboardWorkforce> {
  const unassignedSalesCount = rows
    .filter((row) => row.sellerId === null)
    .reduce((total, row) => total + row.salesCount, 0);

  const ranked = rows
    .filter((row): row is dashboardRepository.SellerSalesRow & { sellerId: string } =>
      Boolean(row.sellerId),
    )
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, TOP_SELLERS_LIMIT);

  const staff = await dashboardRepository.findStaffByIds(
    storeId,
    ranked.map((row) => row.sellerId),
  );
  const staffById = new Map(staff.map((member) => [member.id, member]));

  const sellers = ranked.flatMap((row) => {
    const member = staffById.get(row.sellerId);
    if (!member) return [];

    return [
      {
        userId: member.id,
        fullName: member.fullName,
        role: member.role,
        salesCount: row.salesCount,
        revenue: row.revenue,
      },
    ];
  });

  return { activeStaff, sellers, unassignedSalesCount };
}
