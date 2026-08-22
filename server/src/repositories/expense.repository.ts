import {
  ExpenseStatus,
  buildPaginationMeta,
  normalisePagination,
  type ExpenseCategoryItem,
  type ExpenseDetail,
  type ExpenseListItem,
  type ExpenseListQuery,
  type PaginatedResult,
} from '@furniture-erp/shared';
import type { Expense, ExpenseCategory, Prisma, User } from '@prisma/client';

import { parseFlexibleDate } from '../lib/date-input.js';
import { fromDbMoney, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

type CategoryRef = Pick<ExpenseCategory, 'id' | 'name' | 'color' | 'isActive'>;
type CreatedByRef = Pick<User, 'id' | 'fullName'>;

export type ExpenseRecord = Expense & {
  category: CategoryRef;
  createdBy: CreatedByRef | null;
};

const categorySelect = {
  id: true,
  name: true,
  color: true,
  isActive: true,
} satisfies Prisma.ExpenseCategorySelect;

const createdBySelect = {
  id: true,
  fullName: true,
} satisfies Prisma.UserSelect;

const expenseInclude = {
  category: { select: categorySelect },
  createdBy: { select: createdBySelect },
} satisfies Prisma.ExpenseInclude;

function endOfInclusiveDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function toListItem(record: ExpenseRecord): ExpenseListItem {
  return {
    id: record.id,
    amount: fromDbMoney(record.amount),
    expenseDate: record.expenseDate.toISOString(),
    description: record.description,
    status: record.status,
    cancellationReason: record.cancellationReason,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    category: {
      id: record.category.id,
      name: record.category.name,
      color: record.category.color,
      isActive: record.category.isActive,
    },
    createdBy: record.createdBy
      ? { id: record.createdBy.id, fullName: record.createdBy.fullName }
      : null,
    createdAt: record.createdAt.toISOString(),
  };
}

function toDetail(record: ExpenseRecord): ExpenseDetail {
  return {
    ...toListItem(record),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function findCategoryInStore(
  storeId: string,
  categoryId: string,
): Promise<Pick<ExpenseCategory, 'id' | 'storeId' | 'name' | 'isActive'> | null> {
  return prisma.expenseCategory.findFirst({
    where: { id: categoryId, storeId },
    select: { id: true, storeId: true, name: true, isActive: true },
  });
}

export async function listCategories(
  storeId: string,
  options?: { includeInactive?: boolean },
): Promise<ExpenseCategoryItem[]> {
  const rows = await prisma.expenseCategory.findMany({
    where: {
      storeId,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function createCategory(input: {
  storeId: string;
  name: string;
  color?: string;
}): Promise<ExpenseCategoryItem> {
  const maxSort = await prisma.expenseCategory.aggregate({
    where: { storeId: input.storeId },
    _max: { sortOrder: true },
  });
  const row = await prisma.expenseCategory.create({
    data: {
      storeId: input.storeId,
      name: input.name.trim(),
      color: input.color?.trim() || 'slate',
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
      isActive: true,
    },
  });
  return row;
}

export async function deactivateCategory(
  storeId: string,
  categoryId: string,
): Promise<ExpenseCategoryItem | null> {
  const result = await prisma.expenseCategory.updateMany({
    where: { id: categoryId, storeId, isActive: true },
    data: { isActive: false },
  });
  if (result.count === 0) return null;
  const row = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, storeId },
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
      isActive: true,
    },
  });
  return row;
}

export async function listExpenses(options: {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: ExpenseListQuery['status'];
  from?: string;
  to?: string;
}): Promise<PaginatedResult<ExpenseListItem>> {
  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);
  const search = options.search?.trim();

  const fromDate = options.from ? parseFlexibleDate(options.from) : null;
  const toDate = options.to ? parseFlexibleDate(options.to) : null;

  const where: Prisma.ExpenseWhereInput = {
    storeId: options.storeId,
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    ...(options.status && options.status !== 'ALL'
      ? { status: options.status }
      : options.status === 'ALL'
        ? {}
        : { status: ExpenseStatus.ACTIVE }),
    ...(fromDate || toDate
      ? {
          expenseDate: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: endOfInclusiveDay(toDate) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [rows, totalItems] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items: (rows as ExpenseRecord[]).map(toListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function findExpenseInStore(
  storeId: string,
  expenseId: string,
): Promise<ExpenseDetail | null> {
  const record = await prisma.expense.findFirst({
    where: { id: expenseId, storeId },
    include: expenseInclude,
  });

  return record ? toDetail(record as ExpenseRecord) : null;
}

export async function createExpense(input: {
  storeId: string;
  categoryId: string;
  amount: number;
  expenseDate: Date;
  description?: string;
  createdById: string;
}): Promise<ExpenseDetail> {
  const record = await prisma.expense.create({
    data: {
      storeId: input.storeId,
      categoryId: input.categoryId,
      amount: toDbMoney(input.amount),
      expenseDate: input.expenseDate,
      description: input.description ?? null,
      createdById: input.createdById,
      status: ExpenseStatus.ACTIVE,
    },
    include: expenseInclude,
  });

  return toDetail(record as ExpenseRecord);
}

export async function updateExpense(input: {
  storeId: string;
  expenseId: string;
  categoryId?: string;
  amount?: number;
  expenseDate?: Date;
  description?: string | null;
}): Promise<ExpenseDetail | null> {
  const data: Prisma.ExpenseUncheckedUpdateManyInput = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.amount !== undefined) data.amount = toDbMoney(input.amount);
  if (input.expenseDate !== undefined) data.expenseDate = input.expenseDate;
  if (input.description !== undefined) data.description = input.description;

  const result = await prisma.expense.updateMany({
    where: {
      id: input.expenseId,
      storeId: input.storeId,
      status: ExpenseStatus.ACTIVE,
    },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return findExpenseInStore(input.storeId, input.expenseId);
}

/**
 * Soft-void an expense. Returns null when missing / other store / already cancelled.
 */
export async function cancelExpense(input: {
  storeId: string;
  expenseId: string;
  cancelledById: string;
  reason: string;
}): Promise<ExpenseDetail | null> {
  const result = await prisma.expense.updateMany({
    where: {
      id: input.expenseId,
      storeId: input.storeId,
      status: ExpenseStatus.ACTIVE,
    },
    data: {
      status: ExpenseStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: input.cancelledById,
      cancellationReason: input.reason,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return findExpenseInStore(input.storeId, input.expenseId);
}
