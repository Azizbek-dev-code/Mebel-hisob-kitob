import {
  InstallmentStatus,
  REVENUE_SALE_STATUSES,
  type Money,
  type SalePaymentStatus,
} from '@furniture-erp/shared';
import type { Prisma, UserRole } from '@prisma/client';
import { ExpenseStatus } from '@prisma/client';

import { fromDbMoneySum } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

/**
 * Every read the dashboard makes.
 *
 * Two rules hold for all of them:
 *
 * * `storeId` is the first term of every `where`. It is taken from the
 *   authenticated session and never from the request, so no caller can widen a
 *   query to a store they do not belong to.
 *
 * * Money leaves here as a plain number. `bigint` is right for storage and wrong
 *   for JSON, so the conversion happens at this boundary and nowhere above it.
 */

/** Draft and cancelled sales are excluded — see `REVENUE_SALE_STATUSES`. */
const revenueStatuses = [...REVENUE_SALE_STATUSES];

/** Scheduled installments that are still owed, whatever the sweeper has marked them. */
const unsettledInstallmentStatuses = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIALLY_PAID,
  InstallmentStatus.OVERDUE,
];

function salesInPeriod(storeId: string, from: Date, to: Date): Prisma.SaleWhereInput {
  return {
    storeId,
    status: { in: revenueStatuses },
    // Half-open, so a sale on a boundary belongs to exactly one period.
    saleDate: { gte: from, lt: to },
  };
}

function unsettledSales(storeId: string): Prisma.SaleWhereInput {
  return { storeId, status: { in: revenueStatuses }, remainingAmount: { gt: 0n } };
}

export interface StoreSettings {
  id: string;
  name: string;
  timezone: string;
  currency: string;
}

export function findStoreSettings(storeId: string): Promise<StoreSettings | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, timezone: true, currency: true },
  });
}

export interface SalesTotals {
  revenue: Money;
  costOfGoods: Money;
  /** May be negative: goods can be sold at a loss. */
  grossProfit: number;
  netProfit: number;
  salesCount: number;
}

/**
 * The period's sale money, read from the totals the accounting service already
 * wrote onto each sale. Recomputing them from the line items here would be a
 * second implementation of the same rules, free to drift from the first.
 */
export async function aggregateSales(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SalesTotals> {
  const result = await prisma.sale.aggregate({
    where: salesInPeriod(storeId, from, to),
    _sum: {
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
      netProfit: true,
    },
    _count: { _all: true },
  });

  return {
    revenue: fromDbMoneySum(result._sum.totalSalePrice),
    costOfGoods: fromDbMoneySum(result._sum.totalCostPrice),
    grossProfit: fromDbMoneySum(result._sum.grossProfit),
    netProfit: fromDbMoneySum(result._sum.netProfit),
    salesCount: result._count._all,
  };
}

export interface RevenueSnapshot {
  revenue: Money;
  salesCount: number;
}

/** The lighter aggregate behind the fixed "today" and "this month" cards. */
export async function aggregateRevenue(
  storeId: string,
  from: Date,
  to: Date,
): Promise<RevenueSnapshot> {
  const result = await prisma.sale.aggregate({
    where: salesInPeriod(storeId, from, to),
    _sum: { totalSalePrice: true },
    _count: { _all: true },
  });

  return {
    revenue: fromDbMoneySum(result._sum.totalSalePrice),
    salesCount: result._count._all,
  };
}

export async function sumExpenses(storeId: string, from: Date, to: Date): Promise<Money> {
  const result = await prisma.expense.aggregate({
    where: {
      storeId,
      status: ExpenseStatus.ACTIVE,
      expenseDate: { gte: from, lt: to },
    },
    _sum: { amount: true },
  });

  return fromDbMoneySum(result._sum.amount);
}

export interface SaleSeriesRow {
  saleDate: Date;
  totalSalePrice: Money;
  grossProfit: number;
}

/**
 * The rows the sales chart is bucketed from.
 *
 * Only three columns are read and the result never leaves the server, so even a
 * store's busiest year stays a small query. Bucketing happens in the service so
 * that the boundaries agree with the rest of the period arithmetic — which
 * `date_trunc` in SQL could only do by restating the store's timezone rules.
 */
export async function findSalesForSeries(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SaleSeriesRow[]> {
  const rows = await prisma.sale.findMany({
    where: salesInPeriod(storeId, from, to),
    select: { saleDate: true, totalSalePrice: true, grossProfit: true },
    orderBy: { saleDate: 'asc' },
  });

  return rows.map((row) => ({
    saleDate: row.saleDate,
    totalSalePrice: fromDbMoneySum(row.totalSalePrice),
    grossProfit: fromDbMoneySum(row.grossProfit),
  }));
}

export interface RecentSaleRow {
  id: string;
  saleNumber: number;
  saleDate: Date;
  customerFirstName: string;
  customerLastName: string;
  firstProductName: string | null;
  itemCount: number;
  sellerName: string | null;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
}

export async function findRecentSales(
  storeId: string,
  from: Date,
  to: Date,
  limit: number,
): Promise<RecentSaleRow[]> {
  const rows = await prisma.sale.findMany({
    where: salesInPeriod(storeId, from, to),
    // The counter breaks ties, so two sales entered in the same second still
    // come back newest first rather than in whatever order the index returns.
    orderBy: [{ saleDate: 'desc' }, { saleNumber: 'desc' }],
    take: limit,
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      totalSalePrice: true,
      paidAmount: true,
      remainingAmount: true,
      paymentStatus: true,
      customer: { select: { firstName: true, lastName: true } },
      seller: { select: { fullName: true } },
      items: { select: { productName: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      _count: { select: { items: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    saleNumber: row.saleNumber,
    saleDate: row.saleDate,
    customerFirstName: row.customer.firstName,
    customerLastName: row.customer.lastName,
    firstProductName: row.items[0]?.productName ?? null,
    itemCount: row._count.items,
    sellerName: row.seller?.fullName ?? null,
    totalSalePrice: fromDbMoneySum(row.totalSalePrice),
    paidAmount: fromDbMoneySum(row.paidAmount),
    remainingAmount: fromDbMoneySum(row.remainingAmount),
    paymentStatus: row.paymentStatus,
  }));
}

export interface CustomerDebtRow {
  customerId: string;
  outstanding: Money;
  saleCount: number;
}

/**
 * Outstanding debt per customer, as of now.
 *
 * Debt is a balance rather than a period figure: money still owed from a sale
 * made last year is owed today, so this deliberately ignores the selected period.
 */
export async function aggregateDebtByCustomer(storeId: string): Promise<CustomerDebtRow[]> {
  const groups = await prisma.sale.groupBy({
    by: ['customerId'],
    where: unsettledSales(storeId),
    _sum: { remainingAmount: true },
    _count: { _all: true },
  });

  return groups.map((group) => ({
    customerId: group.customerId,
    outstanding: fromDbMoneySum(group._sum.remainingAmount),
    saleCount: group._count._all,
  }));
}

export interface CustomerNameRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function findCustomersByIds(storeId: string, ids: string[]): Promise<CustomerNameRow[]> {
  if (ids.length === 0) return Promise.resolve([]);

  return prisma.customer.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
}

export interface OverdueInstallments {
  count: number;
  amount: Money;
}

export async function aggregateOverdueInstallments(
  storeId: string,
  asOf: Date,
): Promise<OverdueInstallments> {
  const result = await prisma.installmentPayment.aggregate({
    where: {
      storeId,
      status: { in: unsettledInstallmentStatuses },
      dueDate: { lt: asOf },
      remainingAmount: { gt: 0n },
      plan: {
        status: 'ACTIVE',
        sale: { status: { in: revenueStatuses } },
      },
    },
    _sum: { remainingAmount: true },
    _count: { _all: true },
  });

  return {
    count: result._count._all,
    amount: fromDbMoneySum(result._sum.remainingAmount),
  };
}

export interface SellerSalesRow {
  sellerId: string | null;
  revenue: Money;
  salesCount: number;
}

export async function aggregateSalesBySeller(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SellerSalesRow[]> {
  const groups = await prisma.sale.groupBy({
    by: ['sellerId'],
    where: salesInPeriod(storeId, from, to),
    _sum: { totalSalePrice: true },
    _count: { _all: true },
  });

  return groups.map((group) => ({
    sellerId: group.sellerId,
    revenue: fromDbMoneySum(group._sum.totalSalePrice),
    salesCount: group._count._all,
  }));
}

export interface StaffNameRow {
  id: string;
  fullName: string;
  role: UserRole;
}

export function findStaffByIds(storeId: string, ids: string[]): Promise<StaffNameRow[]> {
  if (ids.length === 0) return Promise.resolve([]);

  return prisma.user.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true, fullName: true, role: true },
  });
}

export function countActiveStaff(storeId: string): Promise<number> {
  return prisma.user.count({ where: { storeId, isActive: true } });
}
