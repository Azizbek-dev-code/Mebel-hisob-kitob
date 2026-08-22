import {
  type WorkerCompensationRule,
  type WorkerCompensationType as WorkerCompensationTypeValue,
  type WorkerResponsibility as WorkerResponsibilityValue,
} from '@furniture-erp/shared';
import type {
  Prisma,
  User,
  WorkerCompensationRule as PrismaWorkerCompensationRule,
} from '@prisma/client';

import { fromDbMoney, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

type WorkerRef = Pick<User, 'id' | 'fullName' | 'isActive'>;

export type WorkerCompensationRecord = PrismaWorkerCompensationRule & {
  worker: WorkerRef;
};

export type WorkerCompensationTxClient = Prisma.TransactionClient;

const workerSelect = {
  id: true,
  fullName: true,
  isActive: true,
} satisfies Prisma.UserSelect;

const ruleInclude = {
  worker: { select: workerSelect },
} satisfies Prisma.WorkerCompensationRuleInclude;

function db(client?: WorkerCompensationTxClient) {
  return client ?? prisma;
}

function toRule(record: WorkerCompensationRecord): WorkerCompensationRule {
  return {
    id: record.id,
    workerId: record.workerId,
    responsibility: record.responsibility,
    type: record.type,
    value: fromDbMoney(record.value),
    isActive: record.isActive,
    effectiveFrom: record.effectiveFrom.toISOString(),
    effectiveTo: record.effectiveTo ? record.effectiveTo.toISOString() : null,
    notes: record.notes,
    worker: {
      id: record.worker.id,
      fullName: record.worker.fullName,
      isActive: record.worker.isActive,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function findWorkerUserInStore(
  storeId: string,
  workerId: string,
  client?: WorkerCompensationTxClient,
): Promise<
  | (Pick<User, 'id' | 'storeId' | 'role' | 'isActive' | 'fullName'> & {
      responsibilities: { responsibility: WorkerResponsibilityValue }[];
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

export async function findRuleInStoreForWorker(
  storeId: string,
  workerId: string,
  ruleId: string,
  client?: WorkerCompensationTxClient,
): Promise<WorkerCompensationRule | null> {
  const record = await db(client).workerCompensationRule.findFirst({
    where: { id: ruleId, storeId, workerId },
    include: ruleInclude,
  });
  return record ? toRule(record as WorkerCompensationRecord) : null;
}

export async function listRulesForWorker(
  storeId: string,
  workerId: string,
  options?: { isActive?: boolean },
  client?: WorkerCompensationTxClient,
): Promise<WorkerCompensationRule[]> {
  const records = await db(client).workerCompensationRule.findMany({
    where: {
      storeId,
      workerId,
      ...(options?.isActive === undefined ? {} : { isActive: options.isActive }),
    },
    include: ruleInclude,
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });
  return records.map((record) => toRule(record as WorkerCompensationRecord));
}

export interface CreateCompensationRuleInput {
  storeId: string;
  workerId: string;
  responsibility: WorkerResponsibilityValue;
  type: WorkerCompensationTypeValue;
  value: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notes: string | null;
  createdById: string;
}

export async function createRule(
  input: CreateCompensationRuleInput,
  client?: WorkerCompensationTxClient,
): Promise<WorkerCompensationRule> {
  const record = await db(client).workerCompensationRule.create({
    data: {
      storeId: input.storeId,
      workerId: input.workerId,
      responsibility: input.responsibility,
      type: input.type,
      value: toDbMoney(input.value),
      isActive: input.isActive,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      notes: input.notes,
      createdById: input.createdById,
    },
    include: ruleInclude,
  });
  return toRule(record as WorkerCompensationRecord);
}

export interface UpdateCompensationRuleInput {
  value?: number;
  isActive?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  notes?: string | null;
}

export async function updateRule(
  storeId: string,
  ruleId: string,
  input: UpdateCompensationRuleInput,
  client?: WorkerCompensationTxClient,
): Promise<WorkerCompensationRule> {
  const data: Prisma.WorkerCompensationRuleUpdateManyMutationInput = {};
  if (input.value !== undefined) data.value = toDbMoney(input.value);
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.effectiveFrom !== undefined) data.effectiveFrom = input.effectiveFrom;
  if (input.effectiveTo !== undefined) data.effectiveTo = input.effectiveTo;
  if (input.notes !== undefined) data.notes = input.notes;

  const updated = await db(client).workerCompensationRule.updateMany({
    where: { id: ruleId, storeId },
    data,
  });
  if (updated.count === 0) {
    throw new Error('COMPENSATION_RULE_NOT_IN_STORE');
  }

  const record = await db(client).workerCompensationRule.findFirst({
    where: { id: ruleId, storeId },
    include: ruleInclude,
  });
  if (!record) {
    throw new Error('COMPENSATION_RULE_NOT_IN_STORE');
  }
  return toRule(record as WorkerCompensationRecord);
}

/**
 * Candidate rules that may overlap the proposed range for the same
 * worker + responsibility + type. Service applies inclusive date overlap.
 */
export async function findPotentialOverlapRules(
  options: {
    storeId: string;
    workerId: string;
    responsibility: WorkerResponsibilityValue;
    type: WorkerCompensationTypeValue;
    excludeRuleId?: string;
  },
  client?: WorkerCompensationTxClient,
): Promise<Array<{ id: string; effectiveFrom: Date; effectiveTo: Date | null }>> {
  return db(client).workerCompensationRule.findMany({
    where: {
      storeId: options.storeId,
      workerId: options.workerId,
      responsibility: options.responsibility,
      type: options.type,
      ...(options.excludeRuleId ? { id: { not: options.excludeRuleId } } : {}),
    },
    select: { id: true, effectiveFrom: true, effectiveTo: true },
  });
}

export async function countWorkerFinancialTransactions(
  storeId: string,
  workerId: string,
  client?: WorkerCompensationTxClient,
): Promise<number> {
  return db(client).workerFinancialTransaction.count({
    where: { storeId, workerId },
  });
}

export async function findStoreTimezone(
  storeId: string,
  client?: WorkerCompensationTxClient,
): Promise<{ id: string; timezone: string } | null> {
  return db(client).store.findFirst({
    where: { id: storeId },
    select: { id: true, timezone: true },
  });
}

export interface PreviewSaleRow {
  id: string;
  saleNumber: number;
  saleDate: Date;
  totalSalePrice: bigint;
  grossProfit: bigint;
  productNames: string[];
}

/** Non-cancelled sales where the worker is the seller in [dateFrom, dateTo). */
export async function listSellerSalesForPreview(
  storeId: string,
  workerId: string,
  dateFrom: Date,
  dateTo: Date,
  client?: WorkerCompensationTxClient,
): Promise<PreviewSaleRow[]> {
  const rows = await db(client).sale.findMany({
    where: {
      storeId,
      sellerId: workerId,
      status: { not: 'CANCELLED' },
      saleDate: { gte: dateFrom, lt: dateTo },
    },
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      totalSalePrice: true,
      grossProfit: true,
      items: { select: { productName: true }, take: 3 },
    },
    orderBy: [{ saleDate: 'asc' }, { saleNumber: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    saleNumber: row.saleNumber,
    saleDate: row.saleDate,
    totalSalePrice: row.totalSalePrice,
    grossProfit: row.grossProfit,
    productNames: row.items.map((item) => item.productName),
  }));
}

export interface PreviewAssemblyRow {
  id: string;
  saleId: string;
  completedAt: Date;
  saleNumber: number;
  productNames: string[];
}

/** Completed assembly tasks assigned to the worker with completedAt in range. */
export async function listAssembliesForPreview(
  storeId: string,
  workerId: string,
  dateFrom: Date,
  dateTo: Date,
  client?: WorkerCompensationTxClient,
): Promise<PreviewAssemblyRow[]> {
  const rows = await db(client).assemblyTask.findMany({
    where: {
      storeId,
      assigneeId: workerId,
      status: 'COMPLETED',
      completedAt: { gte: dateFrom, lt: dateTo },
    },
    select: {
      id: true,
      saleId: true,
      completedAt: true,
      sale: {
        select: {
          saleNumber: true,
          items: { select: { productName: true }, take: 3 },
        },
      },
    },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
  });

  return rows
    .filter((row): row is typeof row & { completedAt: Date } => row.completedAt != null)
    .map((row) => ({
      id: row.id,
      saleId: row.saleId,
      completedAt: row.completedAt,
      saleNumber: row.sale.saleNumber,
      productNames: row.sale.items.map((item) => item.productName),
    }));
}

export interface PreviewDeliveryRow {
  id: string;
  saleNumber: number;
  deliveryDate: Date;
  productNames: string[];
}

/**
 * Completed deliveries assigned to the worker.
 * Prefer `deliveryDate`; fall back to `saleDate` when the completion date was
 * never set (mirrors installation preview eligibility).
 */
export async function listDeliveriesForPreview(
  storeId: string,
  workerId: string,
  dateFrom: Date,
  dateTo: Date,
  client?: WorkerCompensationTxClient,
): Promise<PreviewDeliveryRow[]> {
  const rows = await db(client).sale.findMany({
    where: {
      storeId,
      deliveryPersonId: workerId,
      status: { not: 'CANCELLED' },
      deliveryStatus: 'COMPLETED',
      OR: [
        { deliveryDate: { gte: dateFrom, lt: dateTo } },
        {
          deliveryDate: null,
          saleDate: { gte: dateFrom, lt: dateTo },
        },
      ],
    },
    select: {
      id: true,
      saleNumber: true,
      deliveryDate: true,
      saleDate: true,
      items: { select: { productName: true }, take: 3 },
    },
    orderBy: [{ deliveryDate: 'asc' }, { saleNumber: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    saleNumber: row.saleNumber,
    deliveryDate: row.deliveryDate ?? row.saleDate,
    productNames: row.items.map((item) => item.productName),
  }));
}

export interface PreviewInstallationRow {
  id: string;
  saleNumber: number;
  installationDate: Date;
  productNames: string[];
}

/**
 * Completed installations where the worker is installerId.
 * Note: installerId is also used for assembly assignment in this product —
 * FIXED_PER_INSTALLATION uses sale.installationStatus, not AssemblyTask.
 */
export async function listInstallationsForPreview(
  storeId: string,
  workerId: string,
  dateFrom: Date,
  dateTo: Date,
  client?: WorkerCompensationTxClient,
): Promise<PreviewInstallationRow[]> {
  const rows = await db(client).sale.findMany({
    where: {
      storeId,
      installerId: workerId,
      status: { not: 'CANCELLED' },
      installationStatus: 'COMPLETED',
      OR: [
        { installationDate: { gte: dateFrom, lt: dateTo } },
        {
          installationDate: null,
          saleDate: { gte: dateFrom, lt: dateTo },
        },
      ],
    },
    select: {
      id: true,
      saleNumber: true,
      installationDate: true,
      saleDate: true,
      items: { select: { productName: true }, take: 3 },
    },
    orderBy: [{ saleDate: 'asc' }, { saleNumber: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    saleNumber: row.saleNumber,
    installationDate: row.installationDate ?? row.saleDate,
    productNames: row.items.map((item) => item.productName),
  }));
}

export interface PreviewManualCompensationRow {
  id: string;
  saleId: string;
  saleNumber: number;
  saleDate: Date;
  workerId: string;
  role: 'SELLER' | 'ASSEMBLER' | 'DASTAFCHI' | 'SHOPIR';
  amount: bigint;
}

/**
 * MANUAL Ish haqlari rows for non-cancelled sales with saleDate in [dateFrom, dateTo).
 * Includes all workers so RULE override can drop lines for the whole sale event bucket;
 * callers filter by workerId when appending MANUAL breakdown lines.
 */
export async function listManualCompensationsForPreview(
  storeId: string,
  dateFrom: Date,
  dateTo: Date,
  client?: WorkerCompensationTxClient,
): Promise<PreviewManualCompensationRow[]> {
  const rows = await db(client).saleWorkerCompensation.findMany({
    where: {
      storeId,
      source: 'MANUAL',
      sale: {
        status: { not: 'CANCELLED' },
        saleDate: { gte: dateFrom, lt: dateTo },
      },
    },
    select: {
      id: true,
      saleId: true,
      workerId: true,
      role: true,
      amount: true,
      sale: {
        select: {
          saleNumber: true,
          saleDate: true,
        },
      },
    },
    orderBy: [{ saleId: 'asc' }, { role: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    saleId: row.saleId,
    saleNumber: row.sale.saleNumber,
    saleDate: row.sale.saleDate,
    workerId: row.workerId,
    role: row.role,
    amount: row.amount,
  }));
}

export async function runInTransaction<T>(
  fn: (tx: WorkerCompensationTxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
