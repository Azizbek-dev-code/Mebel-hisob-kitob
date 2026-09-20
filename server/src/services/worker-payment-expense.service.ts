import {
  ExpenseStatus,
  WorkerResponsibility,
  type WorkerFinancialTransaction,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { toDbMoney } from '../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../lib/prisma.js';

type ExpenseClient = Prisma.TransactionClient | PrismaClient;

const CATEGORY_BY_RESPONSIBILITY: Record<string, string> = {
  [WorkerResponsibility.DELIVERY]: 'DELIVERY',
  [WorkerResponsibility.ASSEMBLER]: 'MASTER',
  [WorkerResponsibility.INSTALLER]: 'INSTALLER',
  [WorkerResponsibility.SELLER]: 'SALARY',
};

async function resolveCategoryId(storeId: string, responsibility: string | null, db: ExpenseClient) {
  const preferred = (responsibility && CATEGORY_BY_RESPONSIBILITY[responsibility]) || 'SALARY';
  const keys = [preferred, 'EMPLOYEE', 'OTHER'];
  for (const key of keys) {
    const row = await db.expenseCategory.findFirst({
      where: { storeId, key, isActive: true },
      select: { id: true },
    });
    if (row) return row.id;
  }
  const fallback = await db.expenseCategory.findFirst({
    where: { storeId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function postExpenseForWorkerPayment(input: {
  storeId: string;
  payment: Pick<WorkerFinancialTransaction, 'id' | 'amount' | 'transactionDate' | 'description'>;
  workerName: string;
  responsibility: string | null;
  createdById: string;
  client?: ExpenseClient;
}): Promise<void> {
  const db = input.client ?? defaultPrisma;
  const existing = await db.expense.findFirst({
    where: { storeId: input.storeId, workerPaymentId: input.payment.id },
    select: { id: true },
  });
  if (existing) return;

  const categoryId = await resolveCategoryId(input.storeId, input.responsibility, db);
  if (!categoryId) return;

  const description = input.payment.description?.trim()
    ? `Ishchi to‘lovi (${input.workerName}): ${input.payment.description.trim()}`
    : `Ishchi to‘lovi: ${input.workerName}`;

  await db.expense.create({
    data: {
      storeId: input.storeId,
      categoryId,
      amount: toDbMoney(input.payment.amount),
      expenseDate: new Date(input.payment.transactionDate),
      description,
      createdById: input.createdById,
      workerPaymentId: input.payment.id,
      status: ExpenseStatus.ACTIVE,
    },
  });
}

export async function voidExpenseForWorkerPayment(input: {
  storeId: string;
  paymentId: string;
  cancelledById: string;
  client?: ExpenseClient;
}): Promise<void> {
  const db = input.client ?? defaultPrisma;
  await db.expense.updateMany({
    where: {
      storeId: input.storeId,
      workerPaymentId: input.paymentId,
      status: ExpenseStatus.ACTIVE,
    },
    data: {
      status: ExpenseStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: input.cancelledById,
      cancellationReason: 'Ishchi to‘lovi bekor qilindi',
    },
  });
}
