import type {
  CancelExpenseResponse,
  CreateExpenseCategoryResponse,
  CreateExpenseResponse,
  ExpenseCategoryListResponse,
  ExpenseDetailResponse,
  UpdateExpenseResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as expenseService from '../services/expense.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type {
  CancelExpenseBody,
  CreateExpenseBody,
  CreateExpenseCategoryBody,
  ExpenseListQuery,
  UpdateExpenseBody,
} from '../validators/expenses.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ExpenseListQuery;

  const result = await expenseService.listExpenses({
    storeId: user.storeId,
    actorRole: user.role,
    query,
  });

  sendPaginated(res, result.items, result.meta);
});

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;

  const expense = await expenseService.getExpense(user.storeId, user.role, id);
  sendSuccess<ExpenseDetailResponse>(res, { expense });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateExpenseBody;

  const expense = await expenseService.createExpense(user.storeId, user, body);
  sendCreated<CreateExpenseResponse>(res, { expense });
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdateExpenseBody;

  const expense = await expenseService.updateExpense(user.storeId, user, id, body);
  sendSuccess<UpdateExpenseResponse>(res, { expense });
});

export const cancelExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as CancelExpenseBody;

  const expense = await expenseService.cancelExpense(user.storeId, user, id, body);
  sendSuccess<CancelExpenseResponse>(res, { expense });
});

export const listExpenseCategories = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const includeInactive = req.query.includeInactive === 'true';
  const items = await expenseService.listExpenseCategories(user.storeId, user.role, {
    includeInactive,
  });
  sendSuccess<ExpenseCategoryListResponse>(res, { items });
});

export const createExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateExpenseCategoryBody;
  const category = await expenseService.createExpenseCategory(user.storeId, user.role, body);
  sendCreated<CreateExpenseCategoryResponse>(res, { category });
});

export const deactivateExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const category = await expenseService.deactivateExpenseCategory(
    user.storeId,
    user.role,
    id,
  );
  sendSuccess<CreateExpenseCategoryResponse>(res, { category });
});
