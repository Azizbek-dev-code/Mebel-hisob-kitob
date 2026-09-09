import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';

import {
  cancelExpense,
  createExpense,
  createExpenseCategory,
  deactivateExpenseCategory,
  getExpense,
  listExpenseCategories,
  listExpenses,
  updateExpense,
} from '../controllers/expenses.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  cancelExpenseBodySchema,
  createExpenseBodySchema,
  createExpenseCategoryBodySchema,
  expenseListQuerySchema,
  updateExpenseBodySchema,
} from '../validators/expenses.validators.js';

/**
 * Store-scoped business expenses.
 *
 * Only ADMIN / PLATFORM_ADMIN may manage expenses; storeId always comes from
 * the authenticated session, never from the request body.
 * Expenses are soft-voided (POST /:id/cancel), never hard-deleted.
 */
export const expensesRouter = Router();
export const expenseCategoriesRouter = Router();

expensesRouter.use(requireAuth, requireFeature(FeatureKey.EXPENSES));
expenseCategoriesRouter.use(requireAuth, requireFeature(FeatureKey.EXPENSES));

expensesRouter.get('/', validate({ query: expenseListQuerySchema }), listExpenses);
expensesRouter.post('/', validate({ body: createExpenseBodySchema }), createExpense);
expensesRouter.get('/:id', validate({ params: idParamsSchema }), getExpense);
expensesRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateExpenseBodySchema }),
  updateExpense,
);
expensesRouter.post(
  '/:id/cancel',
  validate({ params: idParamsSchema, body: cancelExpenseBodySchema }),
  cancelExpense,
);

expenseCategoriesRouter.get('/', listExpenseCategories);
expenseCategoriesRouter.post(
  '/',
  validate({ body: createExpenseCategoryBodySchema }),
  createExpenseCategory,
);
expenseCategoriesRouter.post(
  '/:id/deactivate',
  validate({ params: idParamsSchema }),
  deactivateExpenseCategory,
);
