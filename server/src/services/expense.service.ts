import {
  AuditEntityType,
  AuditEventType,
  ExpenseStatus,
  FeatureKey,
  UserRole,
  type CancelExpenseRequest,
  type CreateExpenseCategoryRequest,
  type CreateExpenseRequest,
  type ExpenseCategoryItem,
  type ExpenseDetail,
  type ExpenseListItem,
  type ExpenseListQuery,
  type PaginatedResult,
  type UpdateExpenseRequest,
} from '@furniture-erp/shared';

import { parseFlexibleDate } from '../lib/date-input.js';
import * as expenseRepository from '../repositories/expense.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertCanUseFeature } from './entitlement.service.js';

const EXPENSE_MANAGERS: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.PLATFORM_ADMIN]);

export function canManageExpenses(role: string): boolean {
  return EXPENSE_MANAGERS.has(role);
}

export function assertCanManageExpenses(role: string): void {
  if (!canManageExpenses(role)) {
    throw ApiError.forbidden('Only store administrators can manage expenses');
  }
}

export async function listExpenseCategories(
  storeId: string,
  actorRole: string,
  options?: { includeInactive?: boolean },
): Promise<ExpenseCategoryItem[]> {
  assertCanManageExpenses(actorRole);
  return expenseRepository.listCategories(storeId, options);
}

export async function createExpenseCategory(
  storeId: string,
  actorRole: string,
  input: CreateExpenseCategoryRequest,
): Promise<ExpenseCategoryItem> {
  assertCanManageExpenses(actorRole);
  const name = input.name.trim();
  if (name.length < 2) {
    throw ApiError.validation('Category name is required', [
      { field: 'name', message: 'Provide a category name (at least 2 characters)' },
    ]);
  }
  try {
    return await expenseRepository.createCategory({
      storeId,
      name,
      color: input.color,
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw ApiError.conflict('A category with this name already exists');
    }
    throw error;
  }
}

export async function deactivateExpenseCategory(
  storeId: string,
  actorRole: string,
  categoryId: string,
): Promise<ExpenseCategoryItem> {
  assertCanManageExpenses(actorRole);
  const category = await expenseRepository.deactivateCategory(storeId, categoryId);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return category;
}

export async function listExpenses(options: {
  storeId: string;
  actorRole: string;
  query?: ExpenseListQuery;
}): Promise<PaginatedResult<ExpenseListItem>> {
  assertCanManageExpenses(options.actorRole);
  const query = options.query ?? {};
  return expenseRepository.listExpenses({
    storeId: options.storeId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    categoryId: query.categoryId,
    status: query.status,
    from: query.from,
    to: query.to,
  });
}

export async function getExpense(
  storeId: string,
  actorRole: string,
  expenseId: string,
): Promise<ExpenseDetail> {
  assertCanManageExpenses(actorRole);
  const expense = await expenseRepository.findExpenseInStore(storeId, expenseId);
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  return expense;
}

async function assertActiveCategoryInStore(storeId: string, categoryId: string): Promise<string> {
  const category = await expenseRepository.findCategoryInStore(storeId, categoryId);
  if (!category) {
    throw ApiError.validation('Category not found in this store', [
      { field: 'categoryId', message: 'Category not found in this store' },
    ]);
  }
  if (!category.isActive) {
    throw ApiError.validation('Category is inactive', [
      { field: 'categoryId', message: 'Category is inactive' },
    ]);
  }
  return category.id;
}

function parseExpenseDateOrThrow(value: string): Date {
  const expenseDate = parseFlexibleDate(value);
  if (!expenseDate || Number.isNaN(expenseDate.getTime())) {
    throw ApiError.validation('Invalid expense date', [
      { field: 'expenseDate', message: 'Invalid expense date' },
    ]);
  }
  return expenseDate;
}

export async function createExpense(
  storeId: string,
  actor: { id: string; role: string },
  input: CreateExpenseRequest,
): Promise<ExpenseDetail> {
  assertCanManageExpenses(actor.role);
  await assertCanUseFeature(storeId, FeatureKey.EXPENSES);

  if (!(input.amount > 0)) {
    throw ApiError.validation('Amount must be greater than zero', [
      { field: 'amount', message: 'Amount must be greater than zero' },
    ]);
  }

  const categoryId = await assertActiveCategoryInStore(storeId, input.categoryId);
  const expenseDate = parseExpenseDateOrThrow(input.expenseDate);

  const expense = await expenseRepository.createExpense({
    storeId,
    categoryId,
    amount: input.amount,
    expenseDate,
    description: input.description,
    createdById: actor.id,
  });

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.EXPENSE_CREATED,
    entityType: AuditEntityType.EXPENSE,
    entityId: expense.id,
    summary: `Expense created: ${expense.category.name} (${expense.amount})`,
    metadata: { amount: expense.amount, categoryId: expense.category.id },
  });

  return expense;
}

export async function updateExpense(
  storeId: string,
  actor: { id: string; role: string },
  expenseId: string,
  input: UpdateExpenseRequest,
): Promise<ExpenseDetail> {
  assertCanManageExpenses(actor.role);

  const existing = await expenseRepository.findExpenseInStore(storeId, expenseId);
  if (!existing) {
    throw ApiError.notFound('Expense not found');
  }
  if (existing.status === ExpenseStatus.CANCELLED) {
    throw ApiError.badRequest('Cancelled expenses cannot be edited');
  }

  if (input.amount !== undefined && !(input.amount > 0)) {
    throw ApiError.validation('Amount must be greater than zero', [
      { field: 'amount', message: 'Amount must be greater than zero' },
    ]);
  }

  let categoryId: string | undefined;
  if (input.categoryId !== undefined) {
    categoryId = await assertActiveCategoryInStore(storeId, input.categoryId);
  }

  let expenseDate: Date | undefined;
  if (input.expenseDate !== undefined) {
    expenseDate = parseExpenseDateOrThrow(input.expenseDate);
  }

  const updated = await expenseRepository.updateExpense({
    storeId,
    expenseId,
    categoryId,
    amount: input.amount,
    expenseDate,
    description: input.description,
  });

  if (!updated) {
    throw ApiError.notFound('Expense not found');
  }

  return updated;
}

/** Soft-void — replaces hard delete. */
export async function cancelExpense(
  storeId: string,
  actor: { id: string; role: string },
  expenseId: string,
  input: CancelExpenseRequest,
): Promise<ExpenseDetail> {
  assertCanManageExpenses(actor.role);

  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw ApiError.validation('Cancellation reason is required', [
      { field: 'reason', message: 'Provide a reason (at least 3 characters)' },
    ]);
  }

  const existing = await expenseRepository.findExpenseInStore(storeId, expenseId);
  if (!existing) {
    throw ApiError.notFound('Expense not found');
  }
  if (existing.status === ExpenseStatus.CANCELLED) {
    throw ApiError.conflict('Expense is already cancelled');
  }

  const cancelled = await expenseRepository.cancelExpense({
    storeId,
    expenseId,
    cancelledById: actor.id,
    reason,
  });
  if (!cancelled) {
    throw ApiError.notFound('Expense not found');
  }

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.EXPENSE_CANCELLED,
    entityType: AuditEntityType.EXPENSE,
    entityId: cancelled.id,
    summary: `Expense cancelled: ${cancelled.category.name}`,
    metadata: { reason },
  });

  return cancelled;
}
