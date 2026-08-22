import { Router } from 'express';

import {
  createWorkerFinancialTransaction,
  getWorkerFinancialSummary,
  getWorkerFinancialTransaction,
  listWorkerFinancialTransactions,
  reverseWorkerFinancialTransaction,
} from '../controllers/worker-financial.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import {
  createWorkerFinancialTransactionBodySchema,
  reverseWorkerFinancialTransactionBodySchema,
  transactionIdParamsSchema,
  workerFinancialSummaryQuerySchema,
  workerFinancialTransactionListQuerySchema,
  workerIdParamsSchema,
} from '../validators/worker-financial.validators.js';

/**
 * Worker financial ledger management (not payroll).
 *
 * Only ADMIN / PLATFORM_ADMIN may create, inspect, or reverse. storeId and
 * createdById always come from the authenticated session. No hard DELETE.
 */
export const workerFinancesRouter = Router();

workerFinancesRouter.use(requireAuth);

workerFinancesRouter.post(
  '/transactions',
  validate({ body: createWorkerFinancialTransactionBodySchema }),
  createWorkerFinancialTransaction,
);

workerFinancesRouter.get(
  '/transactions/:id',
  validate({ params: transactionIdParamsSchema }),
  getWorkerFinancialTransaction,
);

workerFinancesRouter.post(
  '/transactions/:id/reverse',
  validate({
    params: transactionIdParamsSchema,
    body: reverseWorkerFinancialTransactionBodySchema,
  }),
  reverseWorkerFinancialTransaction,
);

workerFinancesRouter.get(
  '/workers/:workerId/transactions',
  validate({
    params: workerIdParamsSchema,
    query: workerFinancialTransactionListQuerySchema,
  }),
  listWorkerFinancialTransactions,
);

workerFinancesRouter.get(
  '/workers/:workerId/summary',
  validate({
    params: workerIdParamsSchema,
    query: workerFinancialSummaryQuerySchema,
  }),
  getWorkerFinancialSummary,
);
