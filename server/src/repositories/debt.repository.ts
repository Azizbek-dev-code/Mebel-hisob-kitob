import {
  InstallmentPlanStatus,
  InstallmentStatus,
  REVENUE_SALE_STATUSES,
  buildPaginationMeta,
  normalisePagination,
  type DebtListFilter,
  type DebtListItem,
  type DebtListQuery,
  type DebtListResponse,
  type DebtSummary,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { fromDbMoney, fromDbMoneySum } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const revenueStatuses = [...REVENUE_SALE_STATUSES];
const unsettledInstallmentStatuses: InstallmentStatus[] = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIALLY_PAID,
  InstallmentStatus.OVERDUE,
];

function unsettledSalesWhere(storeId: string): Prisma.SaleWhereInput {
  return {
    storeId,
    status: { in: revenueStatuses },
    remainingAmount: { gt: 0n },
  };
}

function buildListWhere(
  storeId: string,
  options: { search?: string; filter?: DebtListFilter; asOf: Date },
): Prisma.SaleWhereInput {
  const search = options.search?.trim();
  const base: Prisma.SaleWhereInput = {
    ...unsettledSalesWhere(storeId),
    ...(search
      ? {
          OR: [
            { customer: { firstName: { contains: search, mode: 'insensitive' } } },
            { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            { customer: { phone: { contains: search, mode: 'insensitive' } } },
            ...(Number.isInteger(Number(search)) && Number(search) > 0
              ? [{ saleNumber: Number(search) }]
              : []),
          ],
        }
      : {}),
  };

  if (options.filter === 'UNPAID') {
    return { ...base, paymentStatus: 'UNPAID' };
  }
  if (options.filter === 'PARTIALLY_PAID') {
    return { ...base, paymentStatus: 'PARTIALLY_PAID' };
  }
  if (options.filter === 'OVERDUE') {
    return {
      ...base,
      installmentPlan: {
        status: InstallmentPlanStatus.ACTIVE,
        payments: {
          some: {
            status: { in: unsettledInstallmentStatuses },
            dueDate: { lt: options.asOf },
            remainingAmount: { gt: 0n },
          },
        },
      },
    };
  }
  return base;
}

function toDebtItem(
  sale: {
    id: string;
    saleNumber: number;
    saleDate: Date;
    paymentType: DebtListItem['paymentType'];
    paymentStatus: DebtListItem['paymentStatus'];
    totalSalePrice: bigint;
    paidAmount: bigint;
    remainingAmount: bigint;
    customer: { id: string; firstName: string; lastName: string; phone: string };
    seller: { fullName: string } | null;
    installmentPlan: {
      payments: Array<{
        dueDate: Date;
        remainingAmount: bigint;
        status: string;
      }>;
    } | null;
  },
  asOf: Date,
): DebtListItem {
  const overdueRows =
    sale.installmentPlan?.payments.filter(
      (row) =>
        row.dueDate < asOf &&
        row.remainingAmount > 0n &&
        unsettledInstallmentStatuses.includes(row.status as InstallmentStatus),
    ) ?? [];

  const nextDue =
    sale.installmentPlan?.payments
      .filter((row) => row.remainingAmount > 0n)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;

  return {
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate.toISOString(),
    customerId: sale.customer.id,
    customerName: `${sale.customer.firstName} ${sale.customer.lastName}`.trim(),
    customerPhone: sale.customer.phone,
    paymentType: sale.paymentType,
    paymentStatus: sale.paymentStatus,
    totalSalePrice: fromDbMoney(sale.totalSalePrice),
    paidAmount: fromDbMoney(sale.paidAmount),
    remainingAmount: fromDbMoney(sale.remainingAmount),
    sellerName: sale.seller?.fullName ?? null,
    hasOverdueInstallment: overdueRows.length > 0,
    overdueAmount: fromDbMoneySum(
      overdueRows.reduce((sum, row) => sum + row.remainingAmount, 0n),
    ),
    nextDueDate: nextDue?.dueDate.toISOString() ?? null,
  };
}

export async function summarizeDebts(storeId: string, asOf: Date): Promise<DebtSummary> {
  const [outstandingAgg, customerGroups, overdueAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: unsettledSalesWhere(storeId),
      _sum: { remainingAmount: true },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      where: unsettledSalesWhere(storeId),
      _count: { _all: true },
    }),
    prisma.installmentPayment.aggregate({
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
      _count: { _all: true },
    }),
  ]);

  return {
    totalOutstanding: fromDbMoneySum(outstandingAgg._sum.remainingAmount),
    customersInDebt: customerGroups.length,
    openSaleCount: outstandingAgg._count._all,
    overdueInstallmentCount: overdueAgg._count._all,
    overdueAmount: fromDbMoneySum(overdueAgg._sum.remainingAmount),
  };
}

export async function listDebts(
  storeId: string,
  query: DebtListQuery,
): Promise<DebtListResponse> {
  const asOf = new Date();
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const where = buildListWhere(storeId, {
    search: query.search,
    filter: query.filter,
    asOf,
  });

  const [summary, total, rows] = await Promise.all([
    summarizeDebts(storeId, asOf),
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: [{ remainingAmount: 'desc' }, { saleDate: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        paymentType: true,
        paymentStatus: true,
        totalSalePrice: true,
        paidAmount: true,
        remainingAmount: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        seller: { select: { fullName: true } },
        installmentPlan: {
          select: {
            payments: {
              select: {
                dueDate: true,
                remainingAmount: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    summary,
    items: rows.map((row) => toDebtItem(row, asOf)),
    meta: buildPaginationMeta(page, pageSize, total),
  };
}
