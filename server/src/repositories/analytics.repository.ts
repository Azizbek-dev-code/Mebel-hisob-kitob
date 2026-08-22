import {
  REVENUE_SALE_STATUSES,
  type Money,
} from '@furniture-erp/shared';
import { ExpenseStatus, type Prisma } from '@prisma/client';

import { fromDbMoney, fromDbMoneySum } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

/**
 * Database aggregates for financial / expense analytics.
 *
 * Totals are read from stored sale columns and Expense rows — never recomputed
 * from line items. Every `where` starts with session `storeId`.
 */

const revenueStatuses = [...REVENUE_SALE_STATUSES];

function salesInPeriod(storeId: string, from: Date, to: Date): Prisma.SaleWhereInput {
  return {
    storeId,
    status: { in: revenueStatuses },
    saleDate: { gte: from, lt: to },
  };
}

function expensesInPeriod(
  storeId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Prisma.ExpenseWhereInput {
  return {
    storeId,
    status: ExpenseStatus.ACTIVE,
    expenseDate: { gte: from, lt: to },
    ...(categoryId ? { categoryId } : {}),
  };
}

export interface SalesPeriodTotals {
  revenue: Money;
  costOfGoods: Money;
  grossProfit: Money;
  netProfit: Money;
  remainingReceivables: Money;
  salesCount: number;
}

export async function aggregateSalesPeriod(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SalesPeriodTotals> {
  const result = await prisma.sale.aggregate({
    where: salesInPeriod(storeId, from, to),
    _sum: {
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
      netProfit: true,
      remainingAmount: true,
    },
    _count: { _all: true },
  });

  return {
    revenue: fromDbMoneySum(result._sum.totalSalePrice),
    costOfGoods: fromDbMoneySum(result._sum.totalCostPrice),
    grossProfit: fromDbMoneySum(result._sum.grossProfit),
    netProfit: fromDbMoneySum(result._sum.netProfit),
    remainingReceivables: fromDbMoneySum(result._sum.remainingAmount),
    salesCount: result._count._all,
  };
}

/** Cash received in the period (payment date), independent of sale date.
 * Payments on cancelled sales are excluded — voided sales do not count as cash.
 */
export async function sumCashCollected(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Money> {
  const result = await prisma.payment.aggregate({
    where: {
      storeId,
      paidAt: { gte: from, lt: to },
      sale: { status: { in: revenueStatuses } },
    },
    _sum: { amount: true },
  });

  return fromDbMoneySum(result._sum.amount);
}

export interface ExpensePeriodTotals {
  total: Money;
  count: number;
}

export async function aggregateExpensesPeriod(
  storeId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Promise<ExpensePeriodTotals> {
  const result = await prisma.expense.aggregate({
    where: expensesInPeriod(storeId, from, to, categoryId),
    _sum: { amount: true },
    _count: { _all: true },
  });

  return {
    total: fromDbMoneySum(result._sum.amount),
    count: result._count._all,
  };
}

export interface ExpenseCategoryAggregateRow {
  categoryId: string;
  amount: Money;
  count: number;
}

export async function groupExpensesByCategory(
  storeId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Promise<ExpenseCategoryAggregateRow[]> {
  const rows = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: expensesInPeriod(storeId, from, to, categoryId),
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  return rows.map((row) => ({
    categoryId: row.categoryId,
    amount: fromDbMoneySum(row._sum.amount),
    count: row._count._all,
  }));
}

export async function findCategoryNames(
  storeId: string,
  categoryIds: string[],
): Promise<Map<string, string>> {
  if (categoryIds.length === 0) return new Map();

  const rows = await prisma.expenseCategory.findMany({
    where: { storeId, id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  return new Map(rows.map((row) => [row.id, row.name]));
}

export interface ExpenseSeriesRow {
  expenseDate: Date;
  amount: Money;
}

/**
 * Lightweight rows for daily bucketing in the store timezone.
 * Only two columns leave the database.
 */
export async function findExpensesForSeries(
  storeId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Promise<ExpenseSeriesRow[]> {
  const rows = await prisma.expense.findMany({
    where: expensesInPeriod(storeId, from, to, categoryId),
    select: { expenseDate: true, amount: true },
    orderBy: { expenseDate: 'asc' },
  });

  return rows.map((row) => ({
    expenseDate: row.expenseDate,
    amount: fromDbMoney(row.amount),
  }));
}

export interface SaleFinancialSeriesRow {
  saleDate: Date;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
}

/**
 * Sale columns needed to build the financial performance chart.
 * Totals stay on stored sale fields — never recomputed from line items.
 */
export async function findSalesForFinancialTrend(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SaleFinancialSeriesRow[]> {
  const rows = await prisma.sale.findMany({
    where: salesInPeriod(storeId, from, to),
    select: {
      saleDate: true,
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
    },
    orderBy: { saleDate: 'asc' },
  });

  return rows.map((row) => ({
    saleDate: row.saleDate,
    revenue: fromDbMoney(row.totalSalePrice),
    cogs: fromDbMoney(row.totalCostPrice),
    grossProfit: fromDbMoney(row.grossProfit),
  }));
}

export interface StoreTimezone {
  id: string;
  timezone: string;
  name: string;
  currency: string;
}

export function findStoreTimezone(storeId: string): Promise<StoreTimezone | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, timezone: true, name: true, currency: true },
  });
}
