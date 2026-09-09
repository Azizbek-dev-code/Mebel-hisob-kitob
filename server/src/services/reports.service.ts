import {
  moneySharePercent,
  type ReportsCashFlow,
  type ReportsDebtsReport,
  type ReportsExpensesReport,
  type ReportsInventoryReport,
  type ReportsProductsReport,
  type ReportsProfitLoss,
  type ReportsSalesCategoryRow,
  type ReportsSalesProductRow,
  type ReportsSalesReport,
  type ReportsSalesSellerRow,
  type ReportsSummary,
  type ReportsWorkersReport,
  type ReportMetricSources,
  type ReportsBundle,
  type ReportsSupplierPayables,
} from '@furniture-erp/shared';

import { zonedParts } from '../lib/date-range.js';
import * as debtRepository from '../repositories/debt.repository.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as purchasingRepository from '../repositories/purchasing.repository.js';
import * as reportsRepository from '../repositories/reports.repository.js';
import {
  assertCanAccessAnalytics,
  getExpenseAnalytics,
  getFinancialSummary,
  getFinancialTrend,
  type AnalyticsPeriodInput,
  type ExpenseAnalyticsInput,
} from './analytics.service.js';

const METRIC_SOURCES: ReportMetricSources = {
  revenue: 'Sale.totalSalePrice (ACTIVE|COMPLETED)',
  cogs: 'Sale.totalCostPrice (ACTIVE|COMPLETED)',
  grossProfit: 'Sale.grossProfit',
  operatingExpenses: 'Expense.amount (ACTIVE)',
  netProfit: 'grossProfit − operatingExpenses',
  cashCollected: 'Payment.amount (paidAt in range, revenue sales)',
  settledCompensation: 'WorkerFinancialTransaction COMMISSION + COMPENSATION ref',
  receivables: 'Sale.remainingAmount > 0 (ACTIVE|COMPLETED)',
};

export type ReportsPeriodInput = AnalyticsPeriodInput & {
  productLimit?: number;
};

function calendarDateInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function averageOrderValue(revenue: number, salesCount: number): number {
  if (salesCount <= 0) return 0;
  return Math.round(revenue / salesCount);
}

export async function getReportsSummary(input: AnalyticsPeriodInput): Promise<ReportsSummary> {
  assertCanAccessAnalytics(input.actorRole);

  const financial = await getFinancialSummary({ ...input, comparison: 'previous' });
  const from = new Date(financial.period.fromInstant);
  const to = new Date(financial.period.toInstant);
  const storeId = input.storeId;

  const [settled, cancelledSalesCount, cancelledExpenses, retainedFees, debt] = await Promise.all([
    reportsRepository.aggregateSettledCompensation(storeId, from, to),
    reportsRepository.countCancelledSales(storeId, from, to),
    reportsRepository.aggregateCancelledExpenses(storeId, from, to),
    reportsRepository.aggregateRetainedFeesOnCancelledDocuments(storeId, from, to),
    debtRepository.summarizeDebts(storeId, input.now ?? new Date()),
  ]);

  return {
    period: financial.period,
    generatedAt: financial.generatedAt,
    financial,
    extras: {
      settledCompensation: settled.total,
      settledCompensationCount: settled.count,
      cancelledSalesCount,
      cancelledExpenseCount: cancelledExpenses.count,
      cancelledExpenseAmount: cancelledExpenses.amount,
      retainedWorkerFeesOnCancelled: retainedFees.total,
      retainedWorkerFeesOnCancelledCount: retainedFees.count,
      debt,
      compensationInNetProfit: false,
    },
    sources: METRIC_SOURCES,
  };
}

export async function getReportsProfitLoss(input: AnalyticsPeriodInput): Promise<ReportsProfitLoss> {
  const summary = await getReportsSummary(input);
  const m = summary.financial.metrics;
  const prev = summary.financial.previousPeriod;
  const revenue = m.revenue;

  function line(
    key: string,
    label: string,
    amount: number,
    previousAmount: number | null,
    changePercent: number | null,
  ) {
    return {
      key,
      label,
      amount,
      percentOfRevenue: moneySharePercent(amount, revenue),
      previousAmount,
      changePercent,
    };
  }

  return {
    period: summary.period,
    generatedAt: summary.generatedAt,
    lines: [
      line(
        'revenue',
        'Daromad',
        m.revenue,
        prev?.revenue ?? null,
        prev?.changes.revenue.changePercent ?? null,
      ),
      line(
        'cogs',
        'Tannarx (COGS)',
        m.costOfGoodsSold,
        prev?.costOfGoodsSold ?? null,
        prev?.changes.costOfGoodsSold.changePercent ?? null,
      ),
      line(
        'grossProfit',
        'Yalpi foyda',
        m.grossProfit,
        prev?.grossProfit ?? null,
        prev?.changes.grossProfit.changePercent ?? null,
      ),
      line(
        'operatingExpenses',
        'Operatsion xarajatlar',
        m.operatingExpenses,
        prev?.operatingExpenses ?? null,
        prev?.changes.operatingExpenses.changePercent ?? null,
      ),
      line(
        'netProfit',
        'Sof foyda',
        m.netProfit,
        prev?.netProfit ?? null,
        prev?.changes.netProfit.changePercent ?? null,
      ),
    ],
    settledCompensationNote: {
      amount: summary.extras.settledCompensation,
      count: summary.extras.settledCompensationCount,
      includedInNetProfit: false,
    },
  };
}

export async function getReportsCashFlow(input: AnalyticsPeriodInput): Promise<ReportsCashFlow> {
  assertCanAccessAnalytics(input.actorRole);
  const financial = await getFinancialSummary({ ...input, comparison: null });
  const from = new Date(financial.period.fromInstant);
  const to = new Date(financial.period.toInstant);
  const storeId = input.storeId;

  const [byMethod, workerPayments, supplierPayments] = await Promise.all([
    reportsRepository.groupPaymentsByMethod(storeId, from, to),
    reportsRepository.sumWorkerPayments(storeId, from, to),
    purchasingRepository.sumSupplierPaymentsInPeriod(storeId, from, to),
  ]);

  const inflowTotal = byMethod.reduce((sum, row) => sum + row.amount, 0);
  const operatingExpenses = financial.metrics.operatingExpenses;
  const outflowTotal = operatingExpenses + workerPayments + supplierPayments;

  return {
    period: financial.period,
    generatedAt: financial.generatedAt,
    openingBalanceSupported: false,
    closingBalanceSupported: false,
    inflow: {
      total: inflowTotal,
      byMethod,
    },
    outflow: {
      operatingExpenses,
      workerPayments,
      supplierPayments,
      total: outflowTotal,
    },
    netCashFlow: inflowTotal - outflowTotal,
    notes: [
      "Ochilish/yopilish kassa qoldig'i modelda yo'q — faqat davr oqimi.",
      "Kirim: to'lovlar (paidAt), faqat faol/yakunlangan sotuvlar.",
      "Chiqim: ACTIVE xarajatlar + ishchi PAYMENT + yetkazib beruvchi to'lovlari.",
      'Komissiya (COMMISSION) naqd chiqim emas — alohida hisoblanadi.',
      "Xarid (purchase) opex emas — faqat SupplierPayment naqd chiqim hisoblanadi.",
    ],
  };
}

export async function getReportsSupplierPayables(
  input: AnalyticsPeriodInput,
): Promise<ReportsSupplierPayables> {
  assertCanAccessAnalytics(input.actorRole);
  const data = await purchasingRepository.getReportsSupplierPayablesData(input.storeId);
  return {
    generatedAt: new Date().toISOString(),
    ...data,
  };
}

export async function getReportsSales(input: ReportsPeriodInput): Promise<ReportsSalesReport> {
  assertCanAccessAnalytics(input.actorRole);
  const financial = await getFinancialSummary({ ...input, comparison: null });
  const from = new Date(financial.period.fromInstant);
  const to = new Date(financial.period.toInstant);
  const storeId = input.storeId;
  const timeZone = financial.period.timeZone;
  const limit = input.productLimit ?? 20;

  const [discounts, cancelledSalesCount, sellers, products, categories, days, settledByWorker] =
    await Promise.all([
      reportsRepository.sumDiscountAmount(storeId, from, to),
      reportsRepository.countCancelledSales(storeId, from, to),
      reportsRepository.aggregateSalesBySellerDetailed(storeId, from, to),
      reportsRepository.aggregateSaleItemsByProduct(storeId, from, to, limit),
      reportsRepository.aggregateSaleItemsByCategory(storeId, from, to),
      reportsRepository.aggregateSalesByDay(storeId, from, to),
      reportsRepository.groupSettledCompensationByWorker(storeId, from, to),
    ]);

  const sellerIds = sellers
    .map((row) => row.sellerId)
    .filter((id): id is string => typeof id === 'string');
  const names = await reportsRepository.findUserNames(storeId, sellerIds);
  const settledMap = new Map(settledByWorker.map((row) => [row.workerId, row.amount]));

  const m = financial.metrics;
  const bySeller: ReportsSalesSellerRow[] = sellers.map((row) => ({
    sellerId: row.sellerId,
    sellerName: row.sellerId ? (names.get(row.sellerId) ?? '—') : 'Belgilanmagan',
    salesCount: row.salesCount,
    revenue: row.revenue,
    cogs: row.cogs,
    grossProfit: row.grossProfit,
    discounts: row.discounts,
    averageOrderValue: averageOrderValue(row.revenue, row.salesCount),
    customerCount: row.customerCount,
    settledCompensation: row.sellerId ? (settledMap.get(row.sellerId) ?? 0) : 0,
  }));

  const byProduct: ReportsSalesProductRow[] = products.map((row) => ({
    ...row,
    grossProfit: row.revenue - row.cogs,
  }));

  const byCategory: ReportsSalesCategoryRow[] = categories.map((row) => {
    const grossProfit = row.revenue - row.cogs;
    return {
      ...row,
      grossProfit,
      marginPercent: moneySharePercent(grossProfit, row.revenue),
    };
  });

  return {
    period: financial.period,
    generatedAt: financial.generatedAt,
    totals: {
      salesCount: m.salesCount,
      revenue: m.revenue,
      cogs: m.costOfGoodsSold,
      grossProfit: m.grossProfit,
      discounts,
      averageOrderValue: averageOrderValue(m.revenue, m.salesCount),
      grossMarginPercent: moneySharePercent(m.grossProfit, m.revenue),
      cancelledSalesCount,
    },
    byDay: days.map((row) => {
      const date = calendarDateInZone(row.dayStart, timeZone);
      return {
        date,
        label: date,
        salesCount: row.salesCount,
        revenue: row.revenue,
        cogs: row.cogs,
        grossProfit: row.grossProfit,
      };
    }),
    bySeller,
    byProduct,
    byCategory,
  };
}

export async function getReportsExpenses(
  input: ExpenseAnalyticsInput,
): Promise<ReportsExpensesReport> {
  const [analytics, financial] = await Promise.all([
    getExpenseAnalytics(input),
    getFinancialSummary({ ...input, comparison: null }),
  ]);
  const from = new Date(financial.period.fromInstant);
  const to = new Date(financial.period.toInstant);
  const cancelled = await reportsRepository.aggregateCancelledExpenses(input.storeId, from, to);

  return {
    analytics,
    cancelledExpenseCount: cancelled.count,
    cancelledExpenseAmount: cancelled.amount,
  };
}

export async function getReportsDebts(input: AnalyticsPeriodInput): Promise<ReportsDebtsReport> {
  assertCanAccessAnalytics(input.actorRole);
  const financial = await getFinancialSummary({ ...input, comparison: null });
  const [summary, list] = await Promise.all([
    debtRepository.summarizeDebts(input.storeId, input.now ?? new Date()),
    debtRepository.listDebts(input.storeId, {
      page: 1,
      pageSize: 50,
      filter: 'ALL',
    }),
  ]);

  return {
    generatedAt: financial.generatedAt,
    summary,
    items: list.items,
    periodPaymentsCollected: financial.metrics.cashCollected,
  };
}

export async function getReportsWorkers(input: AnalyticsPeriodInput): Promise<ReportsWorkersReport> {
  const sales = await getReportsSales(input);
  const from = new Date(sales.period.fromInstant);
  const to = new Date(sales.period.toInstant);
  const byWorker = await reportsRepository.groupSettledCompensationByWorker(
    input.storeId,
    from,
    to,
  );
  const names = await reportsRepository.findUserNames(
    input.storeId,
    byWorker.map((row) => row.workerId),
  );
  const settled = await reportsRepository.aggregateSettledCompensation(input.storeId, from, to);

  return {
    period: sales.period,
    generatedAt: sales.generatedAt,
    sellers: sales.bySeller,
    compensation: {
      settledTotal: settled.total,
      settledCount: settled.count,
      byWorker: byWorker.map((row) => ({
        workerId: row.workerId,
        workerName: names.get(row.workerId) ?? '—',
        settledAmount: row.amount,
        settledCount: row.count,
      })),
    },
  };
}

export async function getReportsProducts(input: ReportsPeriodInput): Promise<ReportsProductsReport> {
  const limit = input.productLimit ?? 10;
  const sales = await getReportsSales({ ...input, productLimit: limit });
  return {
    period: sales.period,
    generatedAt: sales.generatedAt,
    limit,
    items: sales.byProduct,
    byCategory: sales.byCategory,
  };
}

export async function getReportsInventory(
  input: AnalyticsPeriodInput,
): Promise<ReportsInventoryReport> {
  assertCanAccessAnalytics(input.actorRole);
  const financial = await getFinancialSummary({ ...input, comparison: null });
  const from = new Date(financial.period.fromInstant);
  const to = new Date(financial.period.toInstant);

  const [snapshot, movements] = await Promise.all([
    inventoryRepository.summarizeInventory(input.storeId),
    reportsRepository.aggregateInventoryMovements(input.storeId, from, to),
  ]);

  return {
    generatedAt: financial.generatedAt,
    snapshot,
    movements,
    period: financial.period,
  };
}

export async function getReportsTrend(input: AnalyticsPeriodInput) {
  return getFinancialTrend(input);
}

/** Read-only aggregate for the reports page / integrity E2E. */
export async function getReportsBundle(input: ReportsPeriodInput): Promise<ReportsBundle> {
  const [
    summary,
    profitLoss,
    cashFlow,
    sales,
    expenses,
    debts,
    supplierPayables,
    workers,
    products,
    inventory,
    trend,
  ] = await Promise.all([
    getReportsSummary(input),
    getReportsProfitLoss(input),
    getReportsCashFlow(input),
    getReportsSales(input),
    getReportsExpenses(input),
    getReportsDebts(input),
    getReportsSupplierPayables(input),
    getReportsWorkers(input),
    getReportsProducts(input),
    getReportsInventory(input),
    getReportsTrend(input),
  ]);

  return {
    summary,
    profitLoss,
    cashFlow,
    sales,
    expenses,
    debts,
    supplierPayables,
    workers,
    products,
    inventory,
    trend,
  };
}
