import {
  buildPaginationMeta,
  computeWorkerNetFinancialPosition,
  isReversibleWorkerFinancialType,
  normalisePagination,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  type ReversibleWorkerFinancialTransactionType,
  type WorkerFinancialSummary,
  type WorkerFinancialTransaction,
  type WorkerFinancialTransactionType as WorkerFinancialTransactionTypeValue,
  type PaginatedResult,
} from '@furniture-erp/shared';
import type {
  Prisma,
  User,
  WorkerFinancialTransaction as PrismaWorkerFinancialTransaction,
} from '@prisma/client';

import { fromDbMoney, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

type WorkerRef = Pick<User, 'id' | 'fullName' | 'isActive'>;
type CreatedByRef = Pick<User, 'id' | 'fullName'>;

export type WorkerFinancialRecord = PrismaWorkerFinancialTransaction & {
  worker: WorkerRef;
  createdBy: CreatedByRef | null;
};

export type WorkerFinancialTxClient = Prisma.TransactionClient;

const workerSelect = {
  id: true,
  fullName: true,
  isActive: true,
} satisfies Prisma.UserSelect;

const createdBySelect = {
  id: true,
  fullName: true,
} satisfies Prisma.UserSelect;

const transactionInclude = {
  worker: { select: workerSelect },
  createdBy: { select: createdBySelect },
} satisfies Prisma.WorkerFinancialTransactionInclude;

function db(client?: WorkerFinancialTxClient) {
  return client ?? prisma;
}

function toTransaction(record: WorkerFinancialRecord): WorkerFinancialTransaction {
  return {
    id: record.id,
    workerId: record.workerId,
    type: record.type,
    amount: fromDbMoney(record.amount),
    transactionDate: record.transactionDate.toISOString(),
    description: record.description,
    referenceType: record.referenceType,
    referenceId: record.referenceId,
    reversesType: record.reversesType,
    responsibility: record.responsibility ?? null,
    isOpen: record.isOpen ?? record.type === WorkerFinancialTransactionType.COMMISSION,
    worker: {
      id: record.worker.id,
      fullName: record.worker.fullName,
      isActive: record.worker.isActive,
    },
    createdBy: record.createdBy
      ? { id: record.createdBy.id, fullName: record.createdBy.fullName }
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export interface WorkerFinancialListFilters {
  storeId: string;
  workerId: string;
  type?: WorkerFinancialTransactionTypeValue;
  responsibility?: import('@furniture-erp/shared').WorkerResponsibility;
  /** Inclusive start instant (half-open range with dateTo). */
  dateFrom?: Date;
  /** Exclusive end instant. */
  dateTo?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildListWhere(
  filters: WorkerFinancialListFilters,
): Prisma.WorkerFinancialTransactionWhereInput {
  return {
    storeId: filters.storeId,
    workerId: filters.workerId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.responsibility ? { responsibility: filters.responsibility } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          transactionDate: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lt: filters.dateTo } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? { description: { contains: filters.search, mode: 'insensitive' } }
      : {}),
  };
}

export async function findWorkerUserInStore(
  storeId: string,
  workerId: string,
  client?: WorkerFinancialTxClient,
): Promise<
  | (Pick<User, 'id' | 'storeId' | 'role' | 'isActive' | 'fullName'> & {
      responsibilities?: { responsibility: string }[];
    })
  | null
> {
  return db(client).user.findFirst({
    where: { id: workerId, storeId },
    select: {
      id: true,
      storeId: true,
      role: true,
      isActive: true,
      fullName: true,
      responsibilities: { select: { responsibility: true } },
    },
  });
}

export async function findStoreTimezone(
  storeId: string,
): Promise<{ id: string; timezone: string } | null> {
  return prisma.store.findFirst({
    where: { id: storeId },
    select: { id: true, timezone: true },
  });
}

export async function findTransactionInStore(
  storeId: string,
  transactionId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialTransaction | null> {
  const record = await db(client).workerFinancialTransaction.findFirst({
    where: { id: transactionId, storeId },
    include: transactionInclude,
  });
  return record ? toTransaction(record as WorkerFinancialRecord) : null;
}

export async function findTransactionRecordInStore(
  storeId: string,
  transactionId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialRecord | null> {
  const record = await db(client).workerFinancialTransaction.findFirst({
    where: { id: transactionId, storeId },
    include: transactionInclude,
  });
  return record as WorkerFinancialRecord | null;
}

/** Existing REVERSAL that already offsets this original transaction. */
export async function findReversalOf(
  storeId: string,
  originalTransactionId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialTransaction | null> {
  const record = await db(client).workerFinancialTransaction.findFirst({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.REVERSAL,
      referenceType: WorkerFinancialReferenceType.REVERSAL,
      referenceId: originalTransactionId,
    },
    include: transactionInclude,
  });
  return record ? toTransaction(record as WorkerFinancialRecord) : null;
}

export async function listWorkerTransactions(
  filters: WorkerFinancialListFilters,
): Promise<PaginatedResult<WorkerFinancialTransaction>> {
  const { page, pageSize, skip, take } = normalisePagination(filters.page, filters.pageSize);
  const where = buildListWhere(filters);

  const [rows, totalItems] = await Promise.all([
    prisma.workerFinancialTransaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.workerFinancialTransaction.count({ where }),
  ]);

  return {
    items: (rows as WorkerFinancialRecord[]).map(toTransaction),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createTransaction(
  input: {
    storeId: string;
    workerId: string;
    type: WorkerFinancialTransaction['type'];
    amount: number;
    transactionDate: Date;
    description: string | null;
    referenceType: WorkerFinancialTransaction['referenceType'];
    referenceId: string | null;
    reversesType?: WorkerFinancialTransaction['reversesType'];
    responsibility?: WorkerFinancialTransaction['responsibility'];
    createdById: string;
  },
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialTransaction> {
  const isCommission = input.type === WorkerFinancialTransactionType.COMMISSION;
  const record = await db(client).workerFinancialTransaction.create({
    data: {
      storeId: input.storeId,
      workerId: input.workerId,
      type: input.type,
      amount: toDbMoney(input.amount),
      transactionDate: input.transactionDate,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reversesType: input.reversesType ?? null,
      responsibility: input.responsibility ?? null,
      isOpen: isCommission,
      createdById: input.createdById,
    },
    include: transactionInclude,
  });

  return toTransaction(record as WorkerFinancialRecord);
}

/** Close a COMMISSION after REVERSAL so the same business ref may re-post. */
export async function closeOpenCommission(
  storeId: string,
  commissionId: string,
  client?: WorkerFinancialTxClient,
): Promise<void> {
  await db(client).workerFinancialTransaction.updateMany({
    where: {
      id: commissionId,
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
    },
    data: { isOpen: false },
  });
}

/**
 * Existing open COMMISSION rows posted from compensation settle for the given breakdown line ids.
 */
export async function findCompensationCommissionRefs(
  storeId: string,
  workerId: string,
  referenceIds: string[],
  client?: WorkerFinancialTxClient,
): Promise<Set<string>> {
  if (referenceIds.length === 0) return new Set();

  const rows = await db(client).workerFinancialTransaction.findMany({
    where: {
      storeId,
      workerId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
      referenceId: { in: referenceIds },
    },
    select: { referenceId: true },
  });

  return new Set(
    rows
      .map((row) => row.referenceId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
}

/**
 * Find an open (non-reversed) COMMISSION row for a stable operational fee reference.
 */
export async function findOpenCommissionByRef(
  storeId: string,
  referenceType: WorkerFinancialTransaction['referenceType'],
  referenceId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialRecord | null> {
  if (!referenceType || !referenceId) return null;

  const record = await db(client).workerFinancialTransaction.findFirst({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      referenceType,
      referenceId,
    },
    include: transactionInclude,
    orderBy: { createdAt: 'asc' },
  });
  if (!record) return null;

  const reversal = await findReversalOf(storeId, record.id, client);
  if (reversal) return null;

  return record as WorkerFinancialRecord;
}

/**
 * All open COMMISSION rows linked to a sale that must reverse on cancel:
 * - operational fees (ASSEMBLY / INSTALLER / DELIVERY, incl. legacy refs)
 * - settled compensation lines (`${saleId}:MANUAL:…`, `${saleId}:PERCENT_OF_SALE`, …)
 * - legacy assembly settle refs (`${taskId}:FIXED_PER_ASSEMBLY`)
 */
export async function findOpenSaleOperationalFeeCommissions(
  storeId: string,
  saleId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialRecord[]> {
  const feeRefs = [
    `${saleId}:ASSEMBLY_FEE`,
    `${saleId}:INSTALLER_FEE`,
    `${saleId}:DELIVERY_FEE`,
    `${saleId}:ASSEMBLY:FEE`,
    `${saleId}:INSTALLATION:FEE`,
    `${saleId}:DELIVERY:FEE`,
    `${saleId}:INSTALLATION_COST`,
    `${saleId}:DELIVERY_COST`,
  ];

  const assemblyTasks = await db(client).assemblyTask.findMany({
    where: { storeId, saleId },
    select: { id: true },
  });
  const legacyAssemblySettleRefs = assemblyTasks.map((task) => `${task.id}:FIXED_PER_ASSEMBLY`);

  const rows = await db(client).workerFinancialTransaction.findMany({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      OR: [
        {
          referenceType: {
            in: [WorkerFinancialReferenceType.SALE, WorkerFinancialReferenceType.ASSEMBLY],
          },
          referenceId: { in: feeRefs },
        },
        {
          referenceType: WorkerFinancialReferenceType.COMPENSATION,
          referenceId: { startsWith: `${saleId}:` },
        },
        ...(legacyAssemblySettleRefs.length > 0
          ? [
              {
                referenceType: WorkerFinancialReferenceType.COMPENSATION,
                referenceId: { in: legacyAssemblySettleRefs },
              },
            ]
          : []),
      ],
    },
    include: transactionInclude,
  });

  const open: WorkerFinancialRecord[] = [];
  for (const row of rows as WorkerFinancialRecord[]) {
    const reversal = await findReversalOf(storeId, row.id, client);
    if (!reversal) open.push(row);
  }
  return open;
}

export async function findOpenPurchaseDriverFeeCommission(
  storeId: string,
  purchaseId: string,
  client?: WorkerFinancialTxClient,
): Promise<WorkerFinancialRecord | null> {
  return findOpenCommissionByRef(
    storeId,
    WorkerFinancialReferenceType.PURCHASE,
    `${purchaseId}:DRIVER_FEE`,
    client,
  );
}

/**
 * True when any COMMISSION settle row exists for MANUAL Ish haqlari on this sale
 * (referenceId starts with `${saleId}:MANUAL:`).
 */
export async function hasSettledManualSaleWorkerPay(
  storeId: string,
  saleId: string,
  client?: WorkerFinancialTxClient,
): Promise<boolean> {
  const prefix = `${saleId}:MANUAL:`;
  const row = await db(client).workerFinancialTransaction.findFirst({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
      referenceId: { startsWith: prefix },
    },
    select: { id: true },
  });
  return row != null;
}

/**
 * Sum amounts by type for one worker in a store (optional half-open date range).
 * Aggregation runs in PostgreSQL via groupBy — not payroll.
 */
export async function aggregateWorkerTotals(options: {
  storeId: string;
  workerId: string;
  dateFrom?: Date;
  dateTo?: Date;
  fromLabel?: string;
  toLabel?: string;
  /** When set, only rows tagged with this responsibility (e.g. DELIVERY for shopir KPIs). */
  responsibility?: WorkerFinancialTransaction['responsibility'];
}): Promise<WorkerFinancialSummary> {
  const worker = await prisma.user.findFirst({
    where: { id: options.workerId, storeId: options.storeId },
    select: workerSelect,
  });

  if (!worker) {
    throw new Error('WORKER_NOT_IN_STORE');
  }

  const where: Prisma.WorkerFinancialTransactionWhereInput = {
    storeId: options.storeId,
    workerId: options.workerId,
    ...(options.dateFrom || options.dateTo
      ? {
          transactionDate: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lt: options.dateTo } : {}),
          },
        }
      : {}),
  };

  if (options.responsibility) {
    // Include reversals of rows tagged with this responsibility even when the
    // REVERSAL row itself was created before responsibility was copied.
    const originals = await prisma.workerFinancialTransaction.findMany({
      where: {
        storeId: options.storeId,
        workerId: options.workerId,
        responsibility: options.responsibility,
      },
      select: { id: true },
    });
    const originalIds = originals.map((row) => row.id);
    where.OR = [
      { responsibility: options.responsibility },
      ...(originalIds.length > 0
        ? [
            {
              type: WorkerFinancialTransactionType.REVERSAL,
              referenceId: { in: originalIds },
            },
          ]
        : []),
    ];
  }

  const grouped = await prisma.workerFinancialTransaction.groupBy({
    by: ['type', 'reversesType'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });

  const totalsByType: Record<string, number> = {};
  const reversalsByOriginalType: Partial<
    Record<ReversibleWorkerFinancialTransactionType, number>
  > = {};
  let transactionCount = 0;
  let totalReversals = 0;

  for (const row of grouped) {
    const amount = fromDbMoney(row._sum.amount ?? 0n);
    transactionCount += row._count._all;

    if (row.type === WorkerFinancialTransactionType.REVERSAL) {
      totalReversals += amount;
      if (row.reversesType && isReversibleWorkerFinancialType(row.reversesType)) {
        reversalsByOriginalType[row.reversesType] =
          (reversalsByOriginalType[row.reversesType] ?? 0) + amount;
      }
      continue;
    }

    totalsByType[row.type] = (totalsByType[row.type] ?? 0) + amount;
  }

  const totalBonuses = totalsByType[WorkerFinancialTransactionType.BONUS] ?? 0;
  const totalCommissions = totalsByType[WorkerFinancialTransactionType.COMMISSION] ?? 0;
  const totalAdvances = totalsByType[WorkerFinancialTransactionType.ADVANCE] ?? 0;
  const totalDebt = totalsByType[WorkerFinancialTransactionType.DEBT] ?? 0;
  const totalPayments = totalsByType[WorkerFinancialTransactionType.PAYMENT] ?? 0;
  const totalAdjustments = totalsByType[WorkerFinancialTransactionType.ADJUSTMENT] ?? 0;

  return {
    workerId: options.workerId,
    worker: {
      id: worker.id,
      fullName: worker.fullName,
      isActive: worker.isActive,
    },
    totalBonuses,
    totalCommissions,
    totalAdvances,
    totalDebt,
    totalPayments,
    totalAdjustments,
    totalReversals,
    reversalsByOriginalType,
    netFinancialPosition: computeWorkerNetFinancialPosition({
      totalBonuses,
      totalCommissions,
      totalAdvances,
      totalDebt,
      totalPayments,
      totalAdjustments,
      reversalsByOriginalType,
    }),
    transactionCount,
    ...(options.fromLabel ? { from: options.fromLabel } : {}),
    ...(options.toLabel ? { to: options.toLabel } : {}),
  };
}

/** Hard-delete helper for E2E cleanup only — not exposed via HTTP. */
export async function deleteTransactionInStore(
  storeId: string,
  transactionId: string,
): Promise<boolean> {
  const result = await prisma.workerFinancialTransaction.deleteMany({
    where: { id: transactionId, storeId },
  });
  return result.count > 0;
}

export async function deleteTransactionsByIds(
  storeId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await prisma.workerFinancialTransaction.deleteMany({
    where: { storeId, id: { in: ids } },
  });
  return result.count;
}
