import type {
  WorkerActivityItem,
  WorkerAttributedFeeItem,
  WorkerAttributedFeesSummary,
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
  FulfilmentStatus,
  PurchaseStatus,
  SaleStatus,
  buildPaginationMeta,
  computeWorkerEarnedTotal,
  computeWorkerNetFinancialPosition,
  computeWorkerPaidTotal,
  normalisePagination,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
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

  const workerIds = rows.map((row) => row.id);

  const [completedAssembly, deliveryCompleted, installationCompleted, financeRows] =
    workerIds.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          prisma.assemblyTask.groupBy({
            by: ['assigneeId'],
            where: {
              storeId: params.storeId,
              assigneeId: { in: workerIds },
              status: AssemblyTaskStatus.COMPLETED,
            },
            _count: { _all: true },
          }),
          prisma.sale.groupBy({
            by: ['deliveryPersonId'],
            where: {
              storeId: params.storeId,
              deliveryPersonId: { in: workerIds },
              deliveryStatus: 'COMPLETED',
              status: { not: 'CANCELLED' },
            },
            _count: { _all: true },
          }),
          prisma.sale.groupBy({
            by: ['installerId'],
            where: {
              storeId: params.storeId,
              installerId: { in: workerIds },
              installationStatus: 'COMPLETED',
              status: { not: 'CANCELLED' },
            },
            _count: { _all: true },
          }),
          prisma.workerFinancialTransaction.groupBy({
            by: ['workerId', 'type', 'reversesType'],
            where: { storeId: params.storeId, workerId: { in: workerIds } },
            _sum: { amount: true },
          }),
        ]);

  const assemblyCompletedMap = new Map(
    completedAssembly.map((r) => [r.assigneeId, r._count._all]),
  );
  const deliveryMap = new Map(
    deliveryCompleted.map((r) => [r.deliveryPersonId!, r._count._all]),
  );
  const installMap = new Map(
    installationCompleted.map((r) => [r.installerId!, r._count._all]),
  );

  const financeByWorker = new Map<
    string,
    { earned: number; paid: number; outstanding: number }
  >();
  for (const id of workerIds) {
    financeByWorker.set(id, { earned: 0, paid: 0, outstanding: 0 });
  }

  // Lightweight position matching aggregateWorkerTotals formula.
  type RevKey = 'BONUS' | 'COMMISSION' | 'ADVANCE' | 'DEBT' | 'PAYMENT' | 'ADJUSTMENT';
  const perWorker: Record<
    string,
    {
      bonuses: number;
      commissions: number;
      advances: number;
      debt: number;
      payments: number;
      adjustments: number;
      reversalsBy: Partial<Record<RevKey, number>>;
    }
  > = {};
  for (const id of workerIds) {
    perWorker[id] = {
      bonuses: 0,
      commissions: 0,
      advances: 0,
      debt: 0,
      payments: 0,
      adjustments: 0,
      reversalsBy: {},
    };
  }
  for (const row of financeRows) {
    const bucket = perWorker[row.workerId];
    if (!bucket) continue;
    const amount = fromDbMoney(row._sum.amount ?? 0n);
    if (row.type === 'REVERSAL') {
      const rt = row.reversesType as RevKey | null;
      if (rt) bucket.reversalsBy[rt] = (bucket.reversalsBy[rt] ?? 0) + amount;
      continue;
    }
    if (row.type === 'BONUS') bucket.bonuses += amount;
    else if (row.type === 'COMMISSION') bucket.commissions += amount;
    else if (row.type === 'ADVANCE') bucket.advances += amount;
    else if (row.type === 'DEBT') bucket.debt += amount;
    else if (row.type === 'PAYMENT') bucket.payments += amount;
    else if (row.type === 'ADJUSTMENT') bucket.adjustments += amount;
  }
  for (const id of workerIds) {
    const b = perWorker[id]!;
    financeByWorker.set(id, {
      earned: computeWorkerEarnedTotal({
        totalBonuses: b.bonuses,
        totalCommissions: b.commissions,
        totalAdvances: b.advances,
        totalDebt: b.debt,
        totalPayments: b.payments,
        totalAdjustments: b.adjustments,
        reversalsByOriginalType: b.reversalsBy,
      }),
      paid: computeWorkerPaidTotal({
        totalBonuses: b.bonuses,
        totalCommissions: b.commissions,
        totalAdvances: b.advances,
        totalDebt: b.debt,
        totalPayments: b.payments,
        totalAdjustments: b.adjustments,
        reversalsByOriginalType: b.reversalsBy,
      }),
      outstanding: computeWorkerNetFinancialPosition({
        totalBonuses: b.bonuses,
        totalCommissions: b.commissions,
        totalAdvances: b.advances,
        totalDebt: b.debt,
        totalPayments: b.payments,
        totalAdjustments: b.adjustments,
        reversalsByOriginalType: b.reversalsBy,
      }),
    });
  }

  const items: WorkerListItem[] = rows.map((row) => {
    const finance = financeByWorker.get(row.id) ?? {
      earned: 0,
      paid: 0,
      outstanding: 0,
    };
    return {
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
      assemblyCompleted: assemblyCompletedMap.get(row.id) ?? 0,
      deliveryCompleted: deliveryMap.get(row.id) ?? 0,
      installationCompleted: installMap.get(row.id) ?? 0,
      earned: finance.earned,
      paid: finance.paid,
      outstanding: finance.outstanding,
    };
  });

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
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  } = {},
) {
  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);

  const status = options.status ?? 'ALL';
  const where: Prisma.SaleWhereInput = {
    storeId,
    sellerId: workerId,
    ...(status === 'OPEN' || status === ''
      ? { status: { not: SaleStatus.CANCELLED } }
      : status === 'ALL'
        ? {}
        : { status: status as Prisma.EnumSaleStatusFilter['equals'] }),
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

  return {
    rows: rows.map((row) => ({
      id: row.id,
      saleNumber: row.saleNumber,
      saleDate: row.saleDate,
      status: row.status,
      totalSalePrice: row.totalSalePrice,
      totalCostPrice: row.totalCostPrice,
      grossProfit: row.grossProfit,
      netProfit: row.netProfit,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`.trim(),
      productSummary: row.items.map((item) => item.productName).join(', ') || '—',
    })),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
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

/**
 * Posted earning breakdown for a worker profile.
 * Reads open COMMISSION ledger rows (actual account) — not Sale field previews.
 */
export async function listWorkerAttributedFees(
  storeId: string,
  workerId: string,
): Promise<WorkerAttributedFeesSummary> {
  const commissions = await prisma.workerFinancialTransaction.findMany({
    where: {
      storeId,
      workerId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: {
        in: [
          WorkerFinancialReferenceType.COMPENSATION,
          WorkerFinancialReferenceType.SALE,
          WorkerFinancialReferenceType.ASSEMBLY,
          WorkerFinancialReferenceType.PURCHASE,
        ],
      },
    },
    select: {
      id: true,
      amount: true,
      transactionDate: true,
      description: true,
      referenceType: true,
      referenceId: true,
    },
    orderBy: { transactionDate: 'desc' },
  });

  const commissionIds = commissions.map((row) => row.id);
  const reversals =
    commissionIds.length === 0
      ? []
      : await prisma.workerFinancialTransaction.findMany({
          where: {
            storeId,
            type: WorkerFinancialTransactionType.REVERSAL,
            referenceType: WorkerFinancialReferenceType.REVERSAL,
            referenceId: { in: commissionIds },
          },
          select: { referenceId: true },
        });
  const reversed = new Set(
    reversals.map((row) => row.referenceId).filter((id): id is string => Boolean(id)),
  );

  const classifiedRows: Array<{
    row: (typeof commissions)[number];
    amount: number;
    classified: NonNullable<ReturnType<typeof classifyPostedCommission>>;
  }> = [];

  for (const row of commissions) {
    if (reversed.has(row.id)) continue;
    const amount = fromDbMoney(row.amount);
    if (amount <= 0) continue;

    const classified = classifyPostedCommission(row);
    if (!classified) continue;
    classifiedRows.push({ row, amount, classified });
  }

  const sources = await loadAttributedFeeSources(storeId, classifiedRows.map((r) => r.classified));

  const items: WorkerAttributedFeeItem[] = classifiedRows.map(({ row, amount, classified }) => {
    const source = sources.get(`${classified.source}:${classified.referenceId}`);
    return {
      id: row.id,
      kind: classified.kind,
      source: classified.source,
      amount,
      occurredAt: row.transactionDate.toISOString(),
      referenceId: classified.referenceId,
      referenceLabel: classified.referenceLabel,
      description: row.description,
      sourceCancelled: source?.cancelled ?? false,
      workCompleted: isFeeWorkCompleted(classified.kind, source),
    };
  });

  let sellerBonusTotal = 0;
  let assemblerFeeTotal = 0;
  let installerFeeTotal = 0;
  let deliveryFeeTotal = 0;
  let purchaseDriverFeeTotal = 0;
  for (const item of items) {
    if (item.kind === 'SELLER_COMMISSION' || item.kind === 'SELLER_BONUS') {
      sellerBonusTotal += item.amount;
    } else if (item.kind === 'ASSEMBLER_FEE') assemblerFeeTotal += item.amount;
    else if (item.kind === 'INSTALLER_FEE') installerFeeTotal += item.amount;
    else if (item.kind === 'DELIVERY_FEE') deliveryFeeTotal += item.amount;
    else purchaseDriverFeeTotal += item.amount;
  }

  return {
    sellerBonusTotal,
    assemblerFeeTotal,
    installerFeeTotal,
    deliveryFeeTotal,
    purchaseDriverFeeTotal,
    grandTotal:
      sellerBonusTotal +
      assemblerFeeTotal +
      installerFeeTotal +
      deliveryFeeTotal +
      purchaseDriverFeeTotal,
    items,
  };
}

interface AttributedFeeSource {
  cancelled: boolean;
  assemblyCompleted: boolean;
  installationCompleted: boolean;
  deliveryCompleted: boolean;
}

/**
 * Sale / purchase state behind each posted fee, keyed `SOURCE:id`.
 * A cancelled sale keeps its completed fees, so the profile shows both facts.
 */
async function loadAttributedFeeSources(
  storeId: string,
  refs: ReadonlyArray<{ source: WorkerAttributedFeeItem['source']; referenceId: string }>,
): Promise<Map<string, AttributedFeeSource>> {
  const saleIds = [
    ...new Set(refs.filter((r) => r.source === 'SALE').map((r) => r.referenceId)),
  ];
  const purchaseIds = [
    ...new Set(refs.filter((r) => r.source === 'PURCHASE').map((r) => r.referenceId)),
  ];

  const [sales, purchases] = await Promise.all([
    saleIds.length === 0
      ? []
      : prisma.sale.findMany({
          where: { storeId, id: { in: saleIds } },
          select: {
            id: true,
            status: true,
            assemblyStatus: true,
            installationStatus: true,
            deliveryStatus: true,
          },
        }),
    purchaseIds.length === 0
      ? []
      : prisma.purchase.findMany({
          where: { storeId, id: { in: purchaseIds } },
          select: { id: true, status: true, deliveredAt: true },
        }),
  ]);

  const map = new Map<string, AttributedFeeSource>();
  for (const sale of sales) {
    map.set(`SALE:${sale.id}`, {
      cancelled: sale.status === SaleStatus.CANCELLED,
      assemblyCompleted: sale.assemblyStatus === AssemblyTaskStatus.COMPLETED,
      installationCompleted: sale.installationStatus === FulfilmentStatus.COMPLETED,
      deliveryCompleted: sale.deliveryStatus === FulfilmentStatus.COMPLETED,
    });
  }
  for (const purchase of purchases) {
    const delivered = purchase.deliveredAt !== null;
    map.set(`PURCHASE:${purchase.id}`, {
      cancelled: purchase.status === PurchaseStatus.CANCELLED,
      assemblyCompleted: false,
      installationCompleted: false,
      deliveryCompleted: delivered,
    });
  }
  return map;
}

function isFeeWorkCompleted(
  kind: WorkerAttributedFeeItem['kind'],
  source: AttributedFeeSource | undefined,
): boolean {
  if (!source) return false;
  if (kind === 'ASSEMBLER_FEE') return source.assemblyCompleted;
  if (kind === 'INSTALLER_FEE') return source.installationCompleted;
  if (kind === 'DELIVERY_FEE' || kind === 'PURCHASE_DRIVER_FEE') return source.deliveryCompleted;
  return false;
}

function saleIdFromFeeRef(refId: string): string {
  const suffixes = [
    ':ASSEMBLY_FEE',
    ':INSTALLER_FEE',
    ':DELIVERY_FEE',
    ':ASSEMBLY:FEE',
    ':INSTALLATION:FEE',
    ':DELIVERY:FEE',
    ':INSTALLATION_COST',
    ':DELIVERY_COST',
  ];
  for (const suffix of suffixes) {
    if (refId.endsWith(suffix)) return refId.slice(0, -suffix.length);
  }
  return refId.includes(':') ? refId.split(':')[0]! : refId;
}

function classifyPostedCommission(row: {
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
}): {
  kind: WorkerAttributedFeeItem['kind'];
  source: WorkerAttributedFeeItem['source'];
  referenceId: string;
  referenceLabel: string;
} | null {
  const refId = row.referenceId ?? '';
  const desc = row.description ?? '';
  const saleNum = desc.match(/Sotuv\s*#(\d+)/i)?.[1];

  if (row.referenceType === WorkerFinancialReferenceType.PURCHASE) {
    const purchaseId = refId.replace(/:DRIVER_FEE$/, '') || refId;
    const num = desc.match(/Kirim\s*#(\d+)/i)?.[1];
    return {
      kind: 'PURCHASE_DRIVER_FEE',
      source: 'PURCHASE',
      referenceId: purchaseId,
      referenceLabel: num ? `Kirim #${num}` : 'Kirim',
    };
  }

  if (
    refId.endsWith(':INSTALLER_FEE') ||
    refId.endsWith(':INSTALLATION:FEE') ||
    /Installer haqqi/i.test(desc)
  ) {
    return {
      kind: 'INSTALLER_FEE',
      source: 'SALE',
      referenceId: saleIdFromFeeRef(refId),
      referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
    };
  }

  if (
    refId.endsWith(':ASSEMBLY_FEE') ||
    refId.endsWith(':ASSEMBLY:FEE') ||
    refId.endsWith(':INSTALLATION_COST') ||
    row.referenceType === WorkerFinancialReferenceType.ASSEMBLY ||
    /Usta haqqi|Terlash/i.test(desc)
  ) {
    return {
      kind: 'ASSEMBLER_FEE',
      source: 'SALE',
      referenceId: saleIdFromFeeRef(refId),
      referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
    };
  }

  if (
    refId.endsWith(':DELIVERY_FEE') ||
    refId.endsWith(':DELIVERY:FEE') ||
    refId.endsWith(':DELIVERY_COST') ||
    /Yetkazib berish haqi/i.test(desc) ||
    (/Yetkazib berish/i.test(desc) && !/Kirim shopir/i.test(desc))
  ) {
    return {
      kind: 'DELIVERY_FEE',
      source: 'SALE',
      referenceId: saleIdFromFeeRef(refId),
      referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
    };
  }

  if (row.referenceType === WorkerFinancialReferenceType.COMPENSATION) {
    const saleRef =
      refId.includes(':MANUAL:') ||
      refId.includes(':PERCENT_') ||
      refId.includes(':FIXED_PER_')
        ? refId.split(':')[0]!
        : saleIdFromFeeRef(refId);

    if (
      refId.includes(':FIXED_PER_ASSEMBLY') ||
      refId.includes(':MANUAL:ASSEMBLER') ||
      /Terlash|Usta/i.test(desc)
    ) {
      return {
        kind: 'ASSEMBLER_FEE',
        source: 'SALE',
        referenceId: saleRef,
        referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
      };
    }
    if (
      refId.includes(':FIXED_PER_DELIVERY') ||
      refId.includes(':MANUAL:SHOPIR') ||
      refId.includes(':MANUAL:DASTAFCHI') ||
      /Yetkazib berish/i.test(desc)
    ) {
      return {
        kind: 'DELIVERY_FEE',
        source: 'SALE',
        referenceId: saleRef,
        referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
      };
    }
    if (refId.includes(':FIXED_PER_INSTALLATION') || /O'rnatish|Installer/i.test(desc)) {
      return {
        kind: 'INSTALLER_FEE',
        source: 'SALE',
        referenceId: saleRef,
        referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
      };
    }

    return {
      kind: 'SELLER_COMMISSION',
      source: 'SALE',
      referenceId: saleRef,
      referenceLabel: saleNum ? `Sotuv #${saleNum}` : 'Sotuv',
    };
  }

  return null;
}
