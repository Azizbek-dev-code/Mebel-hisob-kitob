import {
  DateRangePreset,
  UserRole,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  computeWorkerEarnedTotal,
  computeWorkerPaidTotal,
  isReversibleWorkerFinancialType,
  type CreateWorkerFinancialTransactionRequest,
  type PaginatedResult,
  type ReverseWorkerFinancialTransactionRequest,
  type WorkerFinancialSummary,
  type WorkerFinancialTransaction,
  type WorkerResponsibility,
} from '@furniture-erp/shared';

import { parseFlexibleDate } from '../lib/date-input.js';
import { resolveDashboardRange } from '../lib/date-range.js';
import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as expenseRepository from '../repositories/expense.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import { ApiError } from '../utils/api-error.js';
import { postExpenseForWorkerPayment, voidExpenseForWorkerPayment } from './worker-payment-expense.service.js';

const WORKER_FINANCE_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManageWorkerFinances(role: string): boolean {
  return WORKER_FINANCE_MANAGERS.has(role);
}

export function assertCanManageWorkerFinances(role: string): void {
  if (!canManageWorkerFinances(role)) {
    throw ApiError.forbidden('Only store administrators can manage worker finances');
  }
}

function normaliseDescription(value?: string): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseTransactionDateOrThrow(value: string, field = 'transactionDate'): Date {
  const transactionDate = parseFlexibleDate(value);
  if (!transactionDate || Number.isNaN(transactionDate.getTime())) {
    throw ApiError.validation('Invalid transaction date', [
      { field, message: 'Invalid transaction date' },
    ]);
  }
  return transactionDate;
}

function isWorkforceLedgerRole(role: string): boolean {
  return role === UserRole.EMPLOYEE || role === UserRole.CASHIER;
}

/**
 * Worker must be an EMPLOYEE or CASHIER in the session store.
 * Active check applies only when creating new (non-reversal) transactions.
 */
async function assertWorkerForCreate(storeId: string, workerId: string): Promise<string> {
  const worker = await workerFinancialRepository.findWorkerUserInStore(storeId, workerId);
  if (!worker) {
    throw ApiError.notFound('Worker not found');
  }
  if (!isWorkforceLedgerRole(worker.role)) {
    throw ApiError.validation('Worker must be an employee or cashier account', [
      { field: 'workerId', message: 'Worker must be an employee or cashier account' },
    ]);
  }
  if (!worker.isActive) {
    throw ApiError.validation('Worker is inactive', [
      { field: 'workerId', message: 'Worker is inactive' },
    ]);
  }
  return worker.id;
}

async function assertWorkerReadable(
  storeId: string,
  workerId: string,
  actorId: string,
): Promise<void> {
  const worker = await workerFinancialRepository.findWorkerUserInStore(storeId, workerId);
  if (!worker) {
    throw ApiError.notFound('Worker not found');
  }
  // Self-service `/me/finances` must work for any signed-in store user,
  // including ADMIN. Cross-user reads stay limited to workforce roles.
  if (actorId === workerId) return;
  if (!isWorkforceLedgerRole(worker.role)) {
    throw ApiError.notFound('Worker not found');
  }
}

async function resolveOptionalPeriod(
  storeId: string,
  from?: string,
  to?: string,
): Promise<{ dateFrom?: Date; dateTo?: Date; fromLabel?: string; toLabel?: string }> {
  if (!from && !to) {
    return {};
  }
  if (!from || !to) {
    throw ApiError.validation('Provide both from and to, or neither', [
      { field: from ? 'to' : 'from', message: 'Provide both from and to, or neither' },
    ]);
  }

  const store = await workerFinancialRepository.findStoreTimezone(storeId);
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const range = resolveDashboardRange(
    DateRangePreset.CUSTOM,
    { from, to },
    store.timezone,
  );

  return {
    dateFrom: range.from,
    dateTo: range.to,
    fromLabel: from,
    toLabel: to,
  };
}

export async function createTransaction(
  storeId: string,
  actor: { id: string; role: string },
  input: CreateWorkerFinancialTransactionRequest,
): Promise<WorkerFinancialTransaction> {
  assertCanManageWorkerFinances(actor.role);

  if (!(input.amount > 0)) {
    throw ApiError.validation('Amount must be greater than zero', [
      { field: 'amount', message: 'Amount must be greater than zero' },
    ]);
  }

  const referenceType = input.referenceType ?? null;
  const referenceId = input.referenceId?.trim() || null;

  // Admin manual rows (bonus, commission, advance, debt, payment, adjustment)
  // do not need a document reference. Automatic operational / settle posts
  // always supply one; those refs stay unique so they cannot collide with
  // unreferenced manual COMMISSION rows.
  if (
    input.type === WorkerFinancialTransactionType.COMMISSION &&
    referenceType &&
    referenceId
  ) {
    const existing = await workerFinancialRepository.findOpenCommissionByRef(
      storeId,
      referenceType,
      referenceId,
    );
    if (existing) {
      throw ApiError.conflict('A commission for this reference is already on the ledger');
    }
  }

  const workerId = await assertWorkerForCreate(storeId, input.workerId);
  const worker = await workerFinancialRepository.findWorkerUserInStore(storeId, workerId);
  const transactionDate = parseTransactionDateOrThrow(input.transactionDate);

  let responsibility = input.responsibility ?? null;
  if (!responsibility) {
    const resps = worker?.responsibilities?.map((row) => row.responsibility) ?? [];
    if (resps.length === 1) {
      responsibility = resps[0] as NonNullable<typeof input.responsibility>;
    }
  }

  if (input.type === WorkerFinancialTransactionType.PAYMENT) {
    const totals = await workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      ...(responsibility ? { responsibility } : {}),
    });
    const earned = computeWorkerEarnedTotal({
      totalBonuses: totals.totalBonuses,
      totalCommissions: totals.totalCommissions,
      totalAdvances: totals.totalAdvances,
      totalDebt: totals.totalDebt,
      totalPayments: totals.totalPayments,
      totalAdjustments: totals.totalAdjustments,
      reversalsByOriginalType: totals.reversalsByOriginalType,
    });
    const paid = computeWorkerPaidTotal({
      totalBonuses: totals.totalBonuses,
      totalCommissions: totals.totalCommissions,
      totalAdvances: totals.totalAdvances,
      totalDebt: totals.totalDebt,
      totalPayments: totals.totalPayments,
      totalAdjustments: totals.totalAdjustments,
      reversalsByOriginalType: totals.reversalsByOriginalType,
    });
    if (paid + input.amount > earned) {
      throw ApiError.validation(
        `To‘lov hisoblangan summadan oshmasligi kerak (hisoblangan ${earned}, to‘langan ${paid})`,
        [
          {
            field: 'amount',
            message: `Maximum payable is ${Math.max(0, earned - paid)}`,
          },
        ],
      );
    }
  }

  if (input.type === WorkerFinancialTransactionType.PAYMENT) {
    await expenseRepository.ensureDefaultExpenseCategories(storeId);
    return prisma.$transaction(async (tx) => {
      const created = await workerFinancialRepository.createTransaction(
        {
          storeId,
          workerId,
          type: input.type,
          amount: input.amount,
          transactionDate,
          description: normaliseDescription(input.description),
          referenceType,
          referenceId,
          responsibility,
          reversesType: null,
          createdById: actor.id,
        },
        tx,
      );
      await postExpenseForWorkerPayment({
        storeId,
        payment: created,
        workerName: worker?.fullName ?? workerId,
        responsibility,
        createdById: actor.id,
        client: tx,
      });
      return created;
    });
  }

  return workerFinancialRepository.createTransaction({
    storeId,
    workerId,
    type: input.type,
    amount: input.amount,
    transactionDate,
    description: normaliseDescription(input.description),
    referenceType,
    referenceId,
    responsibility,
    reversesType: null,
    createdById: actor.id,
  });
}

export async function listWorkerTransactions(options: {
  storeId: string;
  actor: { id: string; role: string };
  workerId: string;
  page?: number;
  pageSize?: number;
  type?: WorkerFinancialTransaction['type'];
  responsibility?: WorkerResponsibility;
  from?: string;
  to?: string;
  search?: string;
}): Promise<PaginatedResult<WorkerFinancialTransaction>> {
  if (options.actor.id !== options.workerId) {
    assertCanManageWorkerFinances(options.actor.role);
  }
  await assertWorkerReadable(options.storeId, options.workerId, options.actor.id);

  const period = await resolveOptionalPeriod(options.storeId, options.from, options.to);

  return workerFinancialRepository.listWorkerTransactions({
    storeId: options.storeId,
    workerId: options.workerId,
    page: options.page,
    pageSize: options.pageSize,
    type: options.type,
    responsibility: options.responsibility,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    search: options.search?.trim() || undefined,
  });
}

export async function getWorkerSummary(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  query?: { from?: string; to?: string },
): Promise<WorkerFinancialSummary> {
  if (actor.id !== workerId) {
    assertCanManageWorkerFinances(actor.role);
  }
  await assertWorkerReadable(storeId, workerId, actor.id);

  const period = await resolveOptionalPeriod(storeId, query?.from, query?.to);

  try {
    return await workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      fromLabel: period.fromLabel,
      toLabel: period.toLabel,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKER_NOT_IN_STORE') {
      throw ApiError.notFound('Worker not found');
    }
    throw error;
  }
}

export async function getTransaction(
  storeId: string,
  actorRole: string,
  transactionId: string,
): Promise<WorkerFinancialTransaction> {
  assertCanManageWorkerFinances(actorRole);
  const transaction = await workerFinancialRepository.findTransactionInStore(
    storeId,
    transactionId,
  );
  if (!transaction) {
    throw ApiError.notFound('Transaction not found');
  }
  return transaction;
}

/**
 * Creates an offsetting REVERSAL row. Original is never mutated.
 * Allowed even when the worker is inactive (historical correction).
 */
export async function reverseTransaction(
  storeId: string,
  actor: { id: string; role: string },
  transactionId: string,
  input: ReverseWorkerFinancialTransactionRequest = {},
): Promise<{ original: WorkerFinancialTransaction; reversal: WorkerFinancialTransaction }> {
  assertCanManageWorkerFinances(actor.role);

  return prisma.$transaction(async (tx) => {
    const originalRecord = await workerFinancialRepository.findTransactionRecordInStore(
      storeId,
      transactionId,
      tx,
    );
    if (!originalRecord) {
      throw ApiError.notFound('Transaction not found');
    }

    if (originalRecord.type === WorkerFinancialTransactionType.REVERSAL) {
      throw ApiError.validation('A reversal cannot be reversed', [
        { field: 'id', message: 'A reversal cannot be reversed' },
      ]);
    }

    if (!isReversibleWorkerFinancialType(originalRecord.type)) {
      throw ApiError.validation('Transaction type cannot be reversed', [
        { field: 'id', message: 'Transaction type cannot be reversed' },
      ]);
    }

    const existing = await workerFinancialRepository.findReversalOf(storeId, transactionId, tx);
    if (existing) {
      throw ApiError.conflict('Transaction has already been reversed');
    }

    const transactionDate = input.transactionDate
      ? parseTransactionDateOrThrow(input.transactionDate)
      : originalRecord.transactionDate;

    const description =
      normaliseDescription(input.description) ??
      `Reversal of ${originalRecord.type} ${originalRecord.id}`;

    const reversal = await workerFinancialRepository.createTransaction(
      {
        storeId,
        workerId: originalRecord.workerId,
        type: WorkerFinancialTransactionType.REVERSAL,
        amount: fromDbMoney(originalRecord.amount),
        transactionDate,
        description,
        referenceType: WorkerFinancialReferenceType.REVERSAL,
        referenceId: originalRecord.id,
        reversesType: originalRecord.type,
        responsibility: originalRecord.responsibility ?? null,
        createdById: actor.id,
      },
      tx,
    );

    if (originalRecord.type === WorkerFinancialTransactionType.COMMISSION) {
      await workerFinancialRepository.closeOpenCommission(storeId, originalRecord.id, tx);
    }

    if (originalRecord.type === WorkerFinancialTransactionType.PAYMENT) {
      await voidExpenseForWorkerPayment({
        storeId,
        paymentId: originalRecord.id,
        cancelledById: actor.id,
        client: tx,
      });
    }

    const original =
      (await workerFinancialRepository.findTransactionInStore(storeId, transactionId, tx))!;

    return { original, reversal };
  });
}
