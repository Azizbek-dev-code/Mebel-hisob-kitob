import {
  CustomerStatus,
  InstallmentPlanStatus,
  InstallmentStatus,
  REVENUE_SALE_STATUSES,
  SaleStatus,
  buildPaginationMeta,
  normalisePagination,
  normalizeUzPhone,
  phoneLookupVariants,
  type CreateCustomerCatalogueRequest,
  type CustomerCatalogueSummary,
  type CustomerDebtStatus,
  type CustomerDetail,
  type CustomerFinancialSummary,
  type CustomerInstallmentHistoryItem,
  type CustomerListItem,
  type CustomerListQuery,
  type CustomerListResponse,
  type CustomerPaymentHistoryItem,
  type CustomerSaleHistoryItem,
  type UpdateCustomerRequest,
} from '@furniture-erp/shared';
import type { Customer, Prisma } from '@prisma/client';

import { fromDbMoney, fromDbMoneySum } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const revenueStatuses = [...REVENUE_SALE_STATUSES];
const unsettledInstallmentStatuses: InstallmentStatus[] = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIALLY_PAID,
  InstallmentStatus.OVERDUE,
];

type MoneyAgg = {
  totalPurchases: bigint;
  totalPaid: bigint;
  outstandingDebt: bigint;
  overdueAmount: bigint;
  openSaleCount: number;
  lastSaleAt: Date | null;
};

function emptyAgg(): MoneyAgg {
  return {
    totalPurchases: 0n,
    totalPaid: 0n,
    outstandingDebt: 0n,
    overdueAmount: 0n,
    openSaleCount: 0,
    lastSaleAt: null,
  };
}

function debtStatusOf(agg: MoneyAgg): CustomerDebtStatus {
  if (agg.overdueAmount > 0n) return 'OVERDUE';
  if (agg.outstandingDebt > 0n) return 'IN_DEBT';
  return 'CLEAR';
}

function toListItem(customer: Customer, agg: MoneyAgg): CustomerListItem {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName: `${customer.firstName} ${customer.lastName}`.trim(),
    phone: customer.phone,
    notes: customer.notes,
    address: customer.address,
    status: customer.status,
    debtStatus: debtStatusOf(agg),
    totalPurchases: fromDbMoney(agg.totalPurchases),
    totalPaid: fromDbMoney(agg.totalPaid),
    outstandingDebt: fromDbMoney(agg.outstandingDebt),
    overdueAmount: fromDbMoney(agg.overdueAmount),
    openSaleCount: agg.openSaleCount,
    lastSaleAt: agg.lastSaleAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

/**
 * Aggregate purchase/debt metrics per customer from Sale + installment rows.
 * Same rules as debt.repository (ACTIVE|COMPLETED, remainingAmount).
 */
async function aggregateFinancialsByCustomer(
  storeId: string,
  customerIds: string[],
  asOf: Date,
): Promise<Map<string, MoneyAgg>> {
  const map = new Map<string, MoneyAgg>();
  for (const id of customerIds) map.set(id, emptyAgg());
  if (customerIds.length === 0) return map;

  const sales = await prisma.sale.findMany({
    where: {
      storeId,
      customerId: { in: customerIds },
      status: { in: revenueStatuses },
    },
    select: {
      customerId: true,
      totalSalePrice: true,
      paidAmount: true,
      remainingAmount: true,
      saleDate: true,
    },
  });

  for (const sale of sales) {
    const agg = map.get(sale.customerId) ?? emptyAgg();
    agg.totalPurchases += sale.totalSalePrice;
    agg.totalPaid += sale.paidAmount;
    if (sale.remainingAmount > 0n) {
      agg.outstandingDebt += sale.remainingAmount;
      agg.openSaleCount += 1;
    }
    if (!agg.lastSaleAt || sale.saleDate > agg.lastSaleAt) {
      agg.lastSaleAt = sale.saleDate;
    }
    map.set(sale.customerId, agg);
  }

  const overdueRows = await prisma.installmentPayment.findMany({
    where: {
      storeId,
      status: { in: unsettledInstallmentStatuses },
      dueDate: { lt: asOf },
      remainingAmount: { gt: 0n },
      plan: {
        status: InstallmentPlanStatus.ACTIVE,
        customerId: { in: customerIds },
        sale: { status: { in: revenueStatuses }, remainingAmount: { gt: 0n } },
      },
    },
    select: {
      remainingAmount: true,
      plan: { select: { customerId: true } },
    },
  });

  for (const row of overdueRows) {
    const customerId = row.plan.customerId;
    const agg = map.get(customerId) ?? emptyAgg();
    agg.overdueAmount += row.remainingAmount;
    map.set(customerId, agg);
  }

  return map;
}

export async function summarizeCatalogue(storeId: string): Promise<CustomerCatalogueSummary> {
  const asOf = new Date();
  const [counts, debt] = await Promise.all([
    prisma.customer.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { _all: true },
    }),
    // Reuse same unsettled sale aggregation as debts module
    prisma.sale.aggregate({
      where: {
        storeId,
        status: { in: revenueStatuses },
        remainingAmount: { gt: 0n },
      },
      _sum: { remainingAmount: true },
    }),
  ]);

  let activeCount = 0;
  let archivedCount = 0;
  for (const row of counts) {
    if (row.status === CustomerStatus.ACTIVE) activeCount = row._count._all;
    if (row.status === CustomerStatus.ARCHIVED) archivedCount = row._count._all;
  }

  const customerGroups = await prisma.sale.groupBy({
    by: ['customerId'],
    where: {
      storeId,
      status: { in: revenueStatuses },
      remainingAmount: { gt: 0n },
    },
  });

  const overdueAgg = await prisma.installmentPayment.aggregate({
    where: {
      storeId,
      status: { in: unsettledInstallmentStatuses },
      dueDate: { lt: asOf },
      remainingAmount: { gt: 0n },
      plan: {
        status: InstallmentPlanStatus.ACTIVE,
        sale: { status: { in: revenueStatuses }, remainingAmount: { gt: 0n } },
      },
    },
    _sum: { remainingAmount: true },
  });

  return {
    totalCustomers: activeCount + archivedCount,
    activeCount,
    archivedCount,
    customersInDebt: customerGroups.length,
    totalOutstanding: fromDbMoneySum(debt._sum.remainingAmount),
    overdueAmount: fromDbMoneySum(overdueAgg._sum.remainingAmount),
  };
}

export async function listCustomers(
  storeId: string,
  query: CustomerListQuery = {},
): Promise<CustomerListResponse> {
  const asOf = new Date();
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const status = query.status ?? CustomerStatus.ACTIVE;
  const search = query.search?.trim();

  const where: Prisma.CustomerWhereInput = {
    storeId,
    ...(status === 'ALL' ? {} : { status: status as CustomerStatus }),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { phone: { contains: normalizeUzPhone(search) } },
            ...phoneLookupVariants(search).map((v) => ({ phone: { contains: v } })),
          ],
        }
      : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const aggs = await aggregateFinancialsByCustomer(
    storeId,
    customers.map((c) => c.id),
    asOf,
  );

  let items = customers.map((c) => toListItem(c, aggs.get(c.id) ?? emptyAgg()));

  const debtFilter = query.debtFilter ?? 'ALL';
  if (debtFilter === 'CLEAR') {
    items = items.filter((i) => i.debtStatus === 'CLEAR');
  } else if (debtFilter === 'IN_DEBT') {
    items = items.filter((i) => i.debtStatus === 'IN_DEBT' || i.debtStatus === 'OVERDUE');
  } else if (debtFilter === 'OVERDUE') {
    items = items.filter((i) => i.debtStatus === 'OVERDUE');
  }

  const sort = query.sort ?? 'name';
  if (sort === 'debt') {
    items.sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  } else if (sort === 'lastSale') {
    items.sort((a, b) => (b.lastSaleAt ?? '').localeCompare(a.lastSaleAt ?? ''));
  } else {
    items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
  }

  const total = items.length;
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  const summary = await summarizeCatalogue(storeId);

  return {
    summary,
    items: slice,
    meta: buildPaginationMeta(page, pageSize, total),
  };
}

export async function findCustomerAnyStatus(
  storeId: string,
  customerId: string,
): Promise<Customer | null> {
  return prisma.customer.findFirst({ where: { storeId, id: customerId } });
}

export async function findCustomerByPhoneVariants(
  storeId: string,
  phone: string,
): Promise<Customer | null> {
  const variants = phoneLookupVariants(phone);
  return prisma.customer.findFirst({
    where: { storeId, phone: { in: variants } },
  });
}

async function loadFinancialSummary(
  storeId: string,
  customerId: string,
  asOf: Date,
): Promise<CustomerFinancialSummary> {
  const aggs = await aggregateFinancialsByCustomer(storeId, [customerId], asOf);
  const agg = aggs.get(customerId) ?? emptyAgg();

  const [revenueSaleCount, cancelledSaleCount] = await Promise.all([
    prisma.sale.count({
      where: { storeId, customerId, status: { in: revenueStatuses } },
    }),
    prisma.sale.count({
      where: { storeId, customerId, status: SaleStatus.CANCELLED },
    }),
  ]);

  return {
    totalPurchases: fromDbMoney(agg.totalPurchases),
    totalPaid: fromDbMoney(agg.totalPaid),
    outstandingDebt: fromDbMoney(agg.outstandingDebt),
    overdueAmount: fromDbMoney(agg.overdueAmount),
    openSaleCount: agg.openSaleCount,
    revenueSaleCount,
    cancelledSaleCount,
  };
}

async function loadSalesHistory(
  storeId: string,
  customerId: string,
): Promise<CustomerSaleHistoryItem[]> {
  const sales = await prisma.sale.findMany({
    where: { storeId, customerId },
    orderBy: [{ saleDate: 'desc' }, { saleNumber: 'desc' }],
    take: 100,
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      status: true,
      totalSalePrice: true,
      paidAmount: true,
      remainingAmount: true,
      items: { select: { productName: true, quantity: true }, take: 5 },
      _count: { select: { items: true } },
    },
  });

  return sales.map((sale) => ({
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    totalSalePrice: fromDbMoney(sale.totalSalePrice),
    paidAmount: fromDbMoney(sale.paidAmount),
    remainingAmount: fromDbMoney(sale.remainingAmount),
    productSummary: sale.items
      .map((i) => `${i.productName}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
      .join(', '),
    itemCount: sale._count.items,
  }));
}

async function loadPaymentsHistory(
  storeId: string,
  customerId: string,
): Promise<CustomerPaymentHistoryItem[]> {
  const payments = await prisma.payment.findMany({
    where: { storeId, customerId },
    orderBy: [{ paidAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      saleId: true,
      amount: true,
      method: true,
      paidAt: true,
      note: true,
      sale: { select: { saleNumber: true } },
      createdBy: { select: { fullName: true } },
    },
  });

  return payments.map((p) => ({
    paymentId: p.id,
    saleId: p.saleId,
    saleNumber: p.sale.saleNumber,
    amount: fromDbMoney(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note,
    recordedByName: p.createdBy?.fullName ?? null,
  }));
}

async function loadInstallmentsHistory(
  storeId: string,
  customerId: string,
  asOf: Date,
): Promise<CustomerInstallmentHistoryItem[]> {
  const rows = await prisma.installmentPayment.findMany({
    where: {
      storeId,
      plan: { customerId },
    },
    orderBy: [{ dueDate: 'asc' }],
    take: 200,
    select: {
      id: true,
      sequence: true,
      dueDate: true,
      amount: true,
      paidAmount: true,
      remainingAmount: true,
      status: true,
      plan: {
        select: {
          saleId: true,
          sale: { select: { saleNumber: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    let displayStatus: CustomerInstallmentHistoryItem['displayStatus'] = 'UNPAID';
    if (row.remainingAmount <= 0n) displayStatus = 'PAID';
    else if (row.dueDate < asOf && row.remainingAmount > 0n) displayStatus = 'OVERDUE';
    else if (row.paidAmount > 0n) displayStatus = 'PARTIAL';

    return {
      installmentPaymentId: row.id,
      saleId: row.plan.saleId,
      saleNumber: row.plan.sale.saleNumber,
      sequence: row.sequence,
      dueDate: row.dueDate.toISOString(),
      amount: fromDbMoney(row.amount),
      paidAmount: fromDbMoney(row.paidAmount),
      remainingAmount: fromDbMoney(row.remainingAmount),
      status: row.status as InstallmentStatus,
      displayStatus,
    };
  });
}

export async function getCustomerDetail(
  storeId: string,
  customerId: string,
): Promise<CustomerDetail | null> {
  const asOf = new Date();
  const customer = await findCustomerAnyStatus(storeId, customerId);
  if (!customer) return null;

  const [aggs, financial, sales, payments, installments] = await Promise.all([
    aggregateFinancialsByCustomer(storeId, [customerId], asOf),
    loadFinancialSummary(storeId, customerId, asOf),
    loadSalesHistory(storeId, customerId),
    loadPaymentsHistory(storeId, customerId),
    loadInstallmentsHistory(storeId, customerId, asOf),
  ]);

  return {
    ...toListItem(customer, aggs.get(customerId) ?? emptyAgg()),
    financial,
    sales,
    payments,
    installments,
  };
}

export async function createCatalogueCustomer(
  storeId: string,
  input: CreateCustomerCatalogueRequest,
): Promise<CustomerListItem> {
  const phone = normalizeUzPhone(input.phone);
  const created = await prisma.customer.create({
    data: {
      storeId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone,
      notes: input.notes?.trim() || null,
      address: input.address?.trim() || null,
      status: CustomerStatus.ACTIVE,
    },
  });
  return toListItem(created, emptyAgg());
}

export async function updateCatalogueCustomer(
  storeId: string,
  customerId: string,
  input: UpdateCustomerRequest,
): Promise<CustomerListItem | null> {
  const existing = await findCustomerAnyStatus(storeId, customerId);
  if (!existing) return null;

  const data: Prisma.CustomerUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.lastName !== undefined) data.lastName = input.lastName.trim();
  if (input.phone !== undefined) data.phone = normalizeUzPhone(input.phone);
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.address !== undefined) data.address = input.address?.trim() || null;

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data,
  });

  const aggs = await aggregateFinancialsByCustomer(storeId, [customerId], new Date());
  return toListItem(updated, aggs.get(customerId) ?? emptyAgg());
}

export async function setCustomerStatus(
  storeId: string,
  customerId: string,
  status: CustomerStatus,
): Promise<CustomerListItem | null> {
  const existing = await findCustomerAnyStatus(storeId, customerId);
  if (!existing) return null;

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { status },
  });
  const aggs = await aggregateFinancialsByCustomer(storeId, [customerId], new Date());
  return toListItem(updated, aggs.get(customerId) ?? emptyAgg());
}
