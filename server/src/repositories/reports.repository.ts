import {
  REVENUE_SALE_STATUSES,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  type Money,
  type PaymentMethod,
} from '@furniture-erp/shared';
import { ExpenseStatus, SaleStatus, StockMovementType, type Prisma } from '@prisma/client';

import { fromDbMoney, fromDbMoneySum } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const revenueStatuses = [...REVENUE_SALE_STATUSES];

function salesInPeriod(storeId: string, from: Date, to: Date): Prisma.SaleWhereInput {
  return {
    storeId,
    status: { in: revenueStatuses },
    saleDate: { gte: from, lt: to },
  };
}

export async function countCancelledSales(
  storeId: string,
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.sale.count({
    where: {
      storeId,
      status: SaleStatus.CANCELLED,
      saleDate: { gte: from, lt: to },
    },
  });
}

export async function aggregateCancelledExpenses(
  storeId: string,
  from: Date,
  to: Date,
): Promise<{ count: number; amount: Money }> {
  const result = await prisma.expense.aggregate({
    where: {
      storeId,
      status: ExpenseStatus.CANCELLED,
      expenseDate: { gte: from, lt: to },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return {
    count: result._count._all,
    amount: fromDbMoneySum(result._sum.amount),
  };
}

export async function sumDiscountAmount(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Money> {
  const result = await prisma.sale.aggregate({
    where: salesInPeriod(storeId, from, to),
    _sum: { discountAmount: true },
  });
  return fromDbMoneySum(result._sum.discountAmount);
}

export async function groupPaymentsByMethod(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Array<{ method: PaymentMethod; amount: Money }>> {
  const rows = await prisma.payment.groupBy({
    by: ['method'],
    where: {
      storeId,
      paidAt: { gte: from, lt: to },
      sale: { status: { in: revenueStatuses } },
    },
    _sum: { amount: true },
  });

  return rows.map((row) => ({
    method: row.method as PaymentMethod,
    amount: fromDbMoneySum(row._sum.amount),
  }));
}

export async function sumWorkerPayments(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Money> {
  const result = await prisma.workerFinancialTransaction.aggregate({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.PAYMENT,
      transactionDate: { gte: from, lt: to },
    },
    _sum: { amount: true },
  });
  return fromDbMoneySum(result._sum.amount);
}

export async function aggregateSettledCompensation(
  storeId: string,
  from: Date,
  to: Date,
  workerId?: string,
): Promise<{ total: Money; count: number }> {
  const result = await prisma.workerFinancialTransaction.aggregate({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
      transactionDate: { gte: from, lt: to },
      ...(workerId ? { workerId } : {}),
    },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return {
    total: fromDbMoneySum(result._sum.amount),
    count: result._count._all,
  };
}

export async function groupSettledCompensationByWorker(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Array<{ workerId: string; amount: Money; count: number }>> {
  const rows = await prisma.workerFinancialTransaction.groupBy({
    by: ['workerId'],
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
      transactionDate: { gte: from, lt: to },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return rows.map((row) => ({
    workerId: row.workerId,
    amount: fromDbMoneySum(row._sum.amount),
    count: row._count._all,
  }));
}

export interface SellerAggregateRow {
  sellerId: string | null;
  salesCount: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  discounts: Money;
  customerCount: number;
}

export async function aggregateSalesBySellerDetailed(
  storeId: string,
  from: Date,
  to: Date,
): Promise<SellerAggregateRow[]> {
  const groups = await prisma.sale.groupBy({
    by: ['sellerId'],
    where: salesInPeriod(storeId, from, to),
    _sum: {
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
      discountAmount: true,
    },
    _count: { _all: true },
  });

  const customerGroups = await prisma.sale.groupBy({
    by: ['sellerId', 'customerId'],
    where: salesInPeriod(storeId, from, to),
    _count: { _all: true },
  });

  const customerCountBySeller = new Map<string | null, Set<string>>();
  for (const row of customerGroups) {
    const key = row.sellerId;
    const set = customerCountBySeller.get(key) ?? new Set<string>();
    set.add(row.customerId);
    customerCountBySeller.set(key, set);
  }

  return groups.map((group) => ({
    sellerId: group.sellerId,
    salesCount: group._count._all,
    revenue: fromDbMoneySum(group._sum.totalSalePrice),
    cogs: fromDbMoneySum(group._sum.totalCostPrice),
    grossProfit: fromDbMoneySum(group._sum.grossProfit),
    discounts: fromDbMoneySum(group._sum.discountAmount),
    customerCount: customerCountBySeller.get(group.sellerId)?.size ?? 0,
  }));
}

export async function findUserNames(
  storeId: string,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.user.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true, fullName: true },
  });
  return new Map(rows.map((row) => [row.id, row.fullName]));
}

export interface ProductSaleAggregateRow {
  productId: string | null;
  productName: string;
  quantity: number;
  revenue: Money;
  cogs: Money;
}

export async function aggregateSaleItemsByProduct(
  storeId: string,
  from: Date,
  to: Date,
  limit = 50,
): Promise<ProductSaleAggregateRow[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: salesInPeriod(storeId, from, to),
    },
    select: {
      productId: true,
      productName: true,
      quantity: true,
      lineSaleTotal: true,
      lineCostTotal: true,
    },
  });

  const map = new Map<
    string,
    { productId: string | null; productName: string; quantity: number; revenue: number; cogs: number }
  >();

  for (const item of items) {
    const key = item.productId ?? `name:${item.productName}`;
    const current = map.get(key) ?? {
      productId: item.productId,
      productName: item.productName,
      quantity: 0,
      revenue: 0,
      cogs: 0,
    };
    current.quantity += item.quantity;
    current.revenue += fromDbMoney(item.lineSaleTotal);
    current.cogs += fromDbMoney(item.lineCostTotal);
    map.set(key, current);
  }

  return [...map.values()]
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      revenue: row.revenue,
      cogs: row.cogs,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface CategorySaleAggregateRow {
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  revenue: Money;
  cogs: Money;
}

export async function aggregateSaleItemsByCategory(
  storeId: string,
  from: Date,
  to: Date,
): Promise<CategorySaleAggregateRow[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: salesInPeriod(storeId, from, to),
    },
    select: {
      quantity: true,
      lineSaleTotal: true,
      lineCostTotal: true,
      product: { select: { categoryId: true, category: { select: { name: true } } } },
    },
  });

  const map = new Map<
    string,
    { categoryId: string | null; categoryName: string; quantity: number; revenue: number; cogs: number }
  >();

  for (const item of items) {
    const categoryId = item.product?.categoryId ?? null;
    const categoryName = item.product?.category?.name ?? 'Kategoriyasiz';
    const key = categoryId ?? 'none';
    const current = map.get(key) ?? {
      categoryId,
      categoryName,
      quantity: 0,
      revenue: 0,
      cogs: 0,
    };
    current.quantity += item.quantity;
    current.revenue += fromDbMoney(item.lineSaleTotal);
    current.cogs += fromDbMoney(item.lineCostTotal);
    map.set(key, current);
  }

  return [...map.values()]
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      quantity: row.quantity,
      revenue: row.revenue,
      cogs: row.cogs,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface DaySaleAggregateRow {
  dayStart: Date;
  salesCount: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
}

/** Day-bucket sales using UTC date truncation of saleDate (store TZ labels applied in service). */
export async function aggregateSalesByDay(
  storeId: string,
  from: Date,
  to: Date,
): Promise<DaySaleAggregateRow[]> {
  const sales = await prisma.sale.findMany({
    where: salesInPeriod(storeId, from, to),
    select: {
      saleDate: true,
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
    },
  });

  const map = new Map<
    string,
    { dayStart: Date; salesCount: number; revenue: number; cogs: number; grossProfit: number }
  >();

  for (const sale of sales) {
    const key = sale.saleDate.toISOString().slice(0, 10);
    const dayStart = new Date(`${key}T00:00:00.000Z`);
    const current = map.get(key) ?? {
      dayStart,
      salesCount: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
    };
    current.salesCount += 1;
    current.revenue += fromDbMoney(sale.totalSalePrice);
    current.cogs += fromDbMoney(sale.totalCostPrice);
    current.grossProfit += fromDbMoney(sale.grossProfit);
    map.set(key, current);
  }

  return [...map.values()]
    .map((row) => ({
      dayStart: row.dayStart,
      salesCount: row.salesCount,
      revenue: row.revenue,
      cogs: row.cogs,
      grossProfit: row.grossProfit,
    }))
    .sort((a, b) => a.dayStart.getTime() - b.dayStart.getTime());
}

export async function aggregateInventoryMovements(
  storeId: string,
  from: Date,
  to: Date,
): Promise<{
  stockIn: number;
  stockOut: number;
  soldQuantity: number;
  cancelledSaleQuantity: number;
}> {
  const rows = await prisma.stockMovement.groupBy({
    by: ['movementType'],
    where: {
      storeId,
      createdAt: { gte: from, lt: to },
    },
    _sum: { quantity: true },
  });

  let stockIn = 0;
  let stockOut = 0;
  let soldQuantity = 0;
  let cancelledSaleQuantity = 0;

  for (const row of rows) {
    const qty = row._sum.quantity ?? 0;
    if (qty > 0) stockIn += qty;
    if (qty < 0) stockOut += Math.abs(qty);
    if (row.movementType === StockMovementType.SALE) soldQuantity += Math.abs(qty);
    if (row.movementType === StockMovementType.SALE_CANCEL) {
      cancelledSaleQuantity += Math.abs(qty);
    }
  }

  return { stockIn, stockOut, soldQuantity, cancelledSaleQuantity };
}
