import type { ExpenseStatus } from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Expenses API contract.
 *
 * Money is whole so'm. `storeId` is never accepted from the client — the
 * authenticated session supplies it on every read and write.
 */

export interface ExpenseCategorySummary {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface ExpenseCreatedBySummary {
  id: string;
  fullName: string;
}

export interface ExpenseListItem {
  id: string;
  amount: Money;
  expenseDate: IsoDateString;
  description: string | null;
  status: ExpenseStatus;
  cancellationReason: string | null;
  cancelledAt: IsoDateString | null;
  category: ExpenseCategorySummary;
  createdBy: ExpenseCreatedBySummary | null;
  createdAt: IsoDateString;
}

export interface ExpenseDetail extends ExpenseListItem {
  updatedAt: IsoDateString;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amount: Money;
  expenseDate: string;
  description?: string;
}

/** Partial update — only these fields may change; `storeId` is never accepted. */
export interface UpdateExpenseRequest {
  categoryId?: string;
  amount?: Money;
  expenseDate?: string;
  /** Pass `null` to clear an existing description. */
  description?: string | null;
}

export interface CancelExpenseRequest {
  reason: string;
}

export interface CreateExpenseCategoryRequest {
  name: string;
  color?: string;
}

export interface ExpenseListQuery extends PaginationQuery {
  search?: string;
  categoryId?: string;
  status?: ExpenseStatus | 'ALL';
  /** Inclusive calendar date YYYY-MM-DD. */
  from?: string;
  /** Inclusive calendar date YYYY-MM-DD. */
  to?: string;
}

export type ExpenseListResponse = PaginatedResult<ExpenseListItem>;
export type ExpenseDetailResponse = { expense: ExpenseDetail };
export type CreateExpenseResponse = { expense: ExpenseDetail };
export type UpdateExpenseResponse = { expense: ExpenseDetail };
export type CancelExpenseResponse = { expense: ExpenseDetail };
export type ExpenseCategoryListResponse = { items: ExpenseCategoryItem[] };
export type CreateExpenseCategoryResponse = { category: ExpenseCategoryItem };
