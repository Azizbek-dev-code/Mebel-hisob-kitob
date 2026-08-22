import type {
  WorkerActivityItem,
  WorkerDetail,
  WorkerListItem,
  WorkerLookupItem,
  WorkerResponsibility,
  WorkerSaleItem,
  WorkerStats,
  WorkerTaskItem,
} from '@furniture-erp/shared';
import {
  ACTIVE_ASSEMBLY_TASK_STATUSES,
  AssemblyTaskStatus,
  buildPaginationMeta,
  normalisePagination,
} from '@furniture-erp/shared';
import type { Prisma, User, WorkerActivityType } from '@prisma/client';

import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const lookupSelect = {
  id: true,
  fullName: true,
  role: true,
  phone: true,
  responsibilities: { select: { responsibility: true } },
} satisfies Prisma.UserSelect;

const workerDetailSelect = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  phone: true,
  notes: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
  responsibilities: { select: { responsibility: true }, orderBy: { responsibility: 'asc' } },
} satisfies Prisma.UserSelect;

export type WorkerDetailRecord = Prisma.UserGetPayload<{ select: typeof workerDetailSelect }>;

function responsibilityList(
  rows: { responsibility: WorkerResponsibility }[],
): WorkerResponsibility[] {
  return rows.map((row) => row.responsibility);
}

export function toWorkerLookup(user: {
  id: string;
  fullName: string;
  role: User['role'];
  phone: string | null;
  responsibilities: { responsibility: WorkerResponsibility }[];
}): WorkerLookupItem {
  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    responsibilities: responsibilityList(user.responsibilities),
  };
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function computeWorkerStats(storeId: string, workerId: string): Promise<WorkerStats> {
  const monthStart = startOfUtcMonth();
  const dayStart = startOfUtcDay();

  const [
    totalSales,
    salesThisMonth,
    salesToday,
    totalAssemblyTasks,
    completedAssemblyTasks,
    pendingAssemblyTasks,
    completedTasksThisMonth,
  ] = await Promise.all([
    prisma.sale.count({ where: { storeId, sellerId: workerId, status: { not: 'CANCELLED' } } }),
    prisma.sale.count({
      where: {
        storeId,
        sellerId: workerId,
        status: { not: 'CANCELLED' },
        saleDate: { gte: monthStart },
      },
    }),
    prisma.sale.count({
      where: {
        storeId,
        sellerId: workerId,
        status: { not: 'CANCELLED' },
        saleDate: { gte: dayStart },
      },
    }),
    prisma.assemblyTask.count({
      where: { storeId, assigneeId: workerId, status: { not: AssemblyTaskStatus.CANCELLED } },
    }),
    prisma.assemblyTask.count({
      where: { storeId, assigneeId: workerId, status: AssemblyTaskStatus.COMPLETED },
    }),
    prisma.assemblyTask.count({
      where: {
        storeId,
        assigneeId: workerId,
        status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES] },
      },
    }),
    prisma.assemblyTask.count({
      where: {
        storeId,
        assigneeId: workerId,
        status: AssemblyTaskStatus.COMPLETED,
        completedAt: { gte: monthStart },
      },
    }),
  ]);

  return {
    totalSales,
    salesThisMonth,
    salesToday,
    totalAssemblyTasks,
    completedAssemblyTasks,
    pendingAssemblyTasks,
    completedTasksThisMonth,
  };
}

export function toWorkerDetail(record: WorkerDetailRecord, stats: WorkerStats): WorkerDetail {
  return {
    id: record.id,
    fullName: record.fullName,
    username: record.username,
    email: record.email,
    phone: record.phone,
    notes: record.notes,
    role: record.role,
    isActive: record.isActive,
    responsibilities: responsibilityList(record.responsibilities),
    createdAt: record.createdAt.toISOString(),
    lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
    stats,
  };
}

export function findActiveWorkerInStore(
  storeId: string,
  userId: string,
): Promise<User | null> {
  return prisma.user.findFirst({
    where: { id: userId, storeId, isActive: true },
  });
}

export async function workerHasResponsibility(
  storeId: string,
  userId: string,
  responsibility: WorkerResponsibility,
): Promise<boolean> {
  const row = await prisma.userResponsibility.findFirst({
    where: { storeId, userId, responsibility },
    select: { id: true },
  });
  return Boolean(row);
}

export async function findActiveWorkerWithResponsibility(
  storeId: string,
  userId: string,
  responsibility: WorkerResponsibility,
): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      storeId,
      isActive: true,
      responsibilities: { some: { responsibility } },
    },
  });
}

export async function searchWorkers(
  storeId: string,
  query: string | undefined,
  limit = 50,
  responsibility?: WorkerResponsibility,
): Promise<WorkerLookupItem[]> {
  const rows = await prisma.user.findMany({
    where: {
      storeId,
      isActive: true,
      ...(responsibility
        ? { responsibilities: { some: { responsibility } } }
        : {}),
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: lookupSelect,
    orderBy: { fullName: 'asc' },
    take: limit,
  });

  return rows.map(toWorkerLookup);
}

export interface ListWorkersParams {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  responsibility?: WorkerResponsibility;
}

export async function listWorkers(params: ListWorkersParams) {
  const { page, pageSize, skip, take } = normalisePagination(params.page, params.pageSize);

  const where: Prisma.UserWhereInput = {
    storeId: params.storeId,
    ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
    ...(params.responsibility
      ? { responsibilities: { some: { responsibility: params.responsibility } } }
      : {}),
    ...(params.search
      ? {
          OR: [
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { username: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        ...workerDetailSelect,
        _count: {
          select: {
            salesSold: { where: { status: { not: 'CANCELLED' } } },
            assemblyTasksAssigned: {
              where: { status: { not: AssemblyTaskStatus.CANCELLED } },
            },
          },
        },
        assemblyTasksAssigned: {
          where: { status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES] } },
          select: { id: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
      skip,
      take,
    }),
  ]);

  const items: WorkerListItem[] = rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.isActive,
    responsibilities: responsibilityList(row.responsibilities),
    createdAt: row.createdAt.toISOString(),
    salesCount: row._count.salesSold,
    assemblyTaskCount: row._count.assemblyTasksAssigned,
    activeTaskCount: row.assemblyTasksAssigned.length,
  }));

  return { items, meta: buildPaginationMeta(page, pageSize, totalItems) };
}

export function findWorkerInStore(
  storeId: string,
  workerId: string,
): Promise<WorkerDetailRecord | null> {
  return prisma.user.findFirst({
    where: { id: workerId, storeId },
    select: workerDetailSelect,
  });
}

export async function findWorkerByUsername(
  storeId: string,
  username: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { storeId, username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  });
}

export async function findWorkerByEmail(
  storeId: string,
  email: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { storeId, email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
}

export async function createWorkerTx(
  tx: Prisma.TransactionClient,
  data: {
    storeId: string;
    email: string;
    username: string;
    passwordHash: string;
    fullName: string;
    phone: string | null;
    notes: string | null;
    isActive: boolean;
    responsibilities: WorkerResponsibility[];
  },
): Promise<WorkerDetailRecord> {
  const created = await tx.user.create({
    data: {
      storeId: data.storeId,
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      notes: data.notes,
      role: 'EMPLOYEE',
      isActive: data.isActive,
      responsibilities: {
        create: data.responsibilities.map((responsibility) => ({
          storeId: data.storeId,
          responsibility,
        })),
      },
    },
    select: workerDetailSelect,
  });
  return created;
}

export async function replaceResponsibilitiesTx(
  tx: Prisma.TransactionClient,
  storeId: string,
  userId: string,
  responsibilities: WorkerResponsibility[],
): Promise<void> {
  await tx.userResponsibility.deleteMany({ where: { userId, storeId } });
  if (responsibilities.length === 0) return;
  await tx.userResponsibility.createMany({
    data: responsibilities.map((responsibility) => ({
      storeId,
      userId,
      responsibility,
    })),
  });
}

export async function updateWorkerTx(
  tx: Prisma.TransactionClient,
  storeId: string,
  workerId: string,
  data: {
    fullName?: string;
    phone?: string | null;
    notes?: string | null;
    isActive?: boolean;
    responsibilities?: WorkerResponsibility[];
  },
): Promise<WorkerDetailRecord> {
  if (data.responsibilities) {
    await replaceResponsibilitiesTx(tx, storeId, workerId, data.responsibilities);
  }

  return tx.user.update({
    where: { id: workerId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: workerDetailSelect,
  });
}

export async function updateWorkerPassword(
  workerId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: workerId },
    data: { passwordHash },
  });
}

export async function recordActivity(
  input: {
    storeId: string;
    workerId: string;
    actorId?: string | null;
    type: WorkerActivityType;
    relatedSaleId?: string | null;
    relatedTaskId?: string | null;
    relatedPaymentId?: string | null;
    message?: string | null;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.workerActivity.create({
    data: {
      storeId: input.storeId,
      workerId: input.workerId,
      actorId: input.actorId ?? null,
      type: input.type,
      relatedSaleId: input.relatedSaleId ?? null,
      relatedTaskId: input.relatedTaskId ?? null,
      relatedPaymentId: input.relatedPaymentId ?? null,
      message: input.message ?? null,
    },
  });
}

export async function listWorkerActivity(
  storeId: string,
  workerId: string,
  limit = 50,
): Promise<WorkerActivityItem[]> {
  const rows = await prisma.workerActivity.findMany({
    where: { storeId, workerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { fullName: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    relatedSaleId: row.relatedSaleId,
    relatedTaskId: row.relatedTaskId,
    relatedPaymentId: row.relatedPaymentId,
    actorName: row.actor?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listWorkerSales(
  storeId: string,
  workerId: string,
  options: { page?: number; pageSize?: number; search?: string; from?: string; to?: string } = {},
) {
  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);

  const where: Prisma.SaleWhereInput = {
    storeId,
    sellerId: workerId,
    status: { not: 'CANCELLED' },
    ...(options.from || options.to
      ? {
          saleDate: {
            ...(options.from ? { gte: new Date(`${options.from}T00:00:00.000Z`) } : {}),
            ...(options.to ? { lt: new Date(`${options.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(options.search
      ? {
          OR: [
            { customer: { firstName: { contains: options.search, mode: 'insensitive' } } },
            { customer: { lastName: { contains: options.search, mode: 'insensitive' } } },
            { customer: { phone: { contains: options.search, mode: 'insensitive' } } },
            ...(Number.isFinite(Number(options.search))
              ? [{ saleNumber: Number(options.search) }]
              : []),
          ],
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        items: { select: { productName: true }, take: 3 },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take,
    }),
  ]);

  const items: WorkerSaleItem[] = rows.map((row) => ({
    id: row.id,
    saleNumber: row.saleNumber,
    saleDate: row.saleDate.toISOString(),
    customerName: `${row.customer.firstName} ${row.customer.lastName}`.trim(),
    productSummary: row.items.map((item) => item.productName).join(', ') || '—',
    totalSalePrice: fromDbMoney(row.totalSalePrice),
    paidAmount: fromDbMoney(row.paidAmount),
    remainingAmount: fromDbMoney(row.remainingAmount),
    paymentStatus: row.paymentStatus,
  }));

  return { items, meta: buildPaginationMeta(page, pageSize, totalItems) };
}

export async function listWorkerTasks(
  storeId: string,
  workerId: string,
  status?: AssemblyTaskStatus,
): Promise<WorkerTaskItem[]> {
  const rows = await prisma.assemblyTask.findMany({
    where: {
      storeId,
      assigneeId: workerId,
      status: status ?? { not: AssemblyTaskStatus.CANCELLED },
    },
    include: {
      sale: {
        select: {
          saleNumber: true,
          customer: { select: { firstName: true, lastName: true } },
          items: { select: { productName: true }, take: 3 },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    saleId: row.saleId,
    saleNumber: row.sale.saleNumber,
    status: row.status,
    assignedAt: row.assignedAt.toISOString(),
    deadline: row.deadline?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    notes: row.notes,
    customerName: `${row.sale.customer.firstName} ${row.sale.customer.lastName}`.trim(),
    productSummary: row.sale.items.map((item) => item.productName).join(', ') || '—',
  }));
}
