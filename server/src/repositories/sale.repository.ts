import { ACTIVE_ASSEMBLY_TASK_STATUSES, type SalePaymentStatus } from '@furniture-erp/shared';
import type { AssemblyTaskStatus, FulfilmentStatus, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

import type { AssemblyTaskRecord, SaleDetailRecord, SaleListRecord } from './mappers/sale.mapper.js';

const workerSelect = {
  id: true,
  fullName: true,
  role: true,
} satisfies Prisma.UserSelect;

const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
} satisfies Prisma.CustomerSelect;

const saleItemSelect = {
  id: true,
  productId: true,
  productName: true,
  productSku: true,
  quantity: true,
  unitCostPrice: true,
  unitSalePrice: true,
  lineCostTotal: true,
  lineSaleTotal: true,
  product: { select: { imageUrl: true } },
} satisfies Prisma.SaleItemSelect;

const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  paidAt: true,
  isDeposit: true,
  note: true,
  createdAt: true,
  createdBy: { select: workerSelect },
} satisfies Prisma.PaymentSelect;

const assemblyTaskInclude = {
  assignee: { select: workerSelect },
  assignedBy: { select: workerSelect },
  completedBy: { select: workerSelect },
  sale: {
    select: {
      id: true,
      saleNumber: true,
      customer: { select: { firstName: true, lastName: true } },
      items: { select: { productName: true, quantity: true }, orderBy: { createdAt: 'asc' } },
    },
  },
} satisfies Prisma.AssemblyTaskInclude;

const saleDetailInclude = {
  customer: { select: customerSelect },
  seller: { select: workerSelect },
  installer: { select: workerSelect },
  deliveryPerson: { select: workerSelect },
  createdBy: { select: workerSelect },
  cancelledBy: { select: workerSelect },
  items: { select: saleItemSelect, orderBy: { createdAt: 'asc' } },
  payments: { select: paymentSelect, orderBy: { paidAt: 'desc' } },
  installmentPlan: {
    include: {
      payments: { orderBy: { sequence: 'asc' } },
    },
  },
  assemblyTasks: {
    include: assemblyTaskInclude,
    orderBy: { assignedAt: 'desc' },
  },
  workerCompensations: {
    include: {
      worker: { select: { id: true, fullName: true } },
    },
    orderBy: { role: 'asc' },
  },
} satisfies Prisma.SaleInclude;

const saleListInclude = {
  customer: { select: customerSelect },
  seller: { select: workerSelect },
  items: {
    select: { productName: true, quantity: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SaleInclude;

export interface SaleListFilters {
  storeId: string;
  search?: string;
  paymentStatus?: SalePaymentStatus;
  sellerId?: string;
  /** When set, only sales where this user is seller / delivery / installer / assembly assignee. */
  participantUserId?: string;
  assemblyStatus?: AssemblyTaskStatus;
  deliveryStatus?: FulfilmentStatus;
  /** OPEN (default) | ALL | CANCELLED | concrete SaleStatus */
  status?: string;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export async function nextSaleNumber(
  tx: Prisma.TransactionClient,
  storeId: string,
): Promise<number> {
  const latest = await tx.sale.findFirst({
    where: { storeId },
    orderBy: { saleNumber: 'desc' },
    select: { saleNumber: true },
  });
  return (latest?.saleNumber ?? 0) + 1;
}

export async function listSales(
  filters: SaleListFilters,
): Promise<{ items: SaleListRecord[]; totalItems: number }> {
  const where: Prisma.SaleWhereInput = {
    storeId: filters.storeId,
  };

  const status = filters.status ?? 'OPEN';
  if (status === 'OPEN' || status === '') {
    where.status = { not: 'CANCELLED' };
  } else if (status === 'ALL') {
    // no status filter
  } else {
    where.status = status as Prisma.EnumSaleStatusFilter['equals'];
  }

  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.participantUserId) {
    const uid = filters.participantUserId;
    where.OR = [
      { sellerId: uid },
      { deliveryPersonId: uid },
      { installerId: uid },
      { assemblyTasks: { some: { assigneeId: uid } } },
    ];
  }
  if (filters.assemblyStatus) where.assemblyStatus = filters.assemblyStatus;
  if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus;

  if (filters.from || filters.to) {
    where.saleDate = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lt: filters.to } : {}),
    };
  }

  if (filters.search) {
    const term = filters.search;
    const asNumber = Number.parseInt(term, 10);
    where.OR = [
      ...(Number.isFinite(asNumber) ? [{ saleNumber: asNumber }] : []),
      { customer: { firstName: { contains: term, mode: 'insensitive' } } },
      { customer: { lastName: { contains: term, mode: 'insensitive' } } },
      { customer: { phone: { contains: term } } },
      { items: { some: { productName: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: saleListInclude,
      orderBy: [{ saleDate: 'desc' }, { saleNumber: 'desc' }],
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.sale.count({ where }),
  ]);

  return { items: items as SaleListRecord[], totalItems };
}

export function findSaleDetail(
  storeId: string,
  saleId: string,
): Promise<SaleDetailRecord | null> {
  return prisma.sale.findFirst({
    where: { id: saleId, storeId },
    include: saleDetailInclude,
  }) as Promise<SaleDetailRecord | null>;
}

export function findSaleDetailTx(
  tx: Prisma.TransactionClient,
  storeId: string,
  saleId: string,
): Promise<SaleDetailRecord | null> {
  return tx.sale.findFirst({
    where: { id: saleId, storeId },
    include: saleDetailInclude,
  }) as Promise<SaleDetailRecord | null>;
}

export function findSaleForUpdate(
  tx: Prisma.TransactionClient,
  storeId: string,
  saleId: string,
) {
  return tx.sale.findFirst({
    where: { id: saleId, storeId },
    include: {
      installmentPlan: {
        include: { payments: { orderBy: { sequence: 'asc' } } },
      },
    },
  });
}

export async function listAssemblyTasksForWorker(
  storeId: string,
  assigneeId: string,
): Promise<AssemblyTaskRecord[]> {
  const rows = await prisma.assemblyTask.findMany({
    where: {
      storeId,
      assigneeId,
      status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES, 'COMPLETED'] },
    },
    include: assemblyTaskInclude,
    orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
  });

  return rows as AssemblyTaskRecord[];
}

export function findAssemblyTaskInStore(
  storeId: string,
  taskId: string,
): Promise<AssemblyTaskRecord | null> {
  return prisma.assemblyTask.findFirst({
    where: { id: taskId, storeId },
    include: assemblyTaskInclude,
  }) as Promise<AssemblyTaskRecord | null>;
}

export function findActiveAssemblyTasksForSale(
  tx: Prisma.TransactionClient,
  storeId: string,
  saleId: string,
) {
  return tx.assemblyTask.findMany({
    where: {
      storeId,
      saleId,
      status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES] },
    },
  });
}
