import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { deleteOwnAccount } from '../controllers/account-deletion.controller.js';
import { patchMyAccount } from '../controllers/auth.controller.js';
import {
  getMyProfile,
  getMyProfileModules,
  getMySellerReport,
  getMyStats,
  listMyActivity,
  listMyAttributedFees,
  listMySales,
} from '../controllers/workers.controller.js';
import {
  getWorkerFinancialSummary,
  listWorkerFinancialTransactions,
} from '../controllers/worker-financial.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/api-error.js';
import { deleteAccountBodySchema } from '../validators/account-deletion.validators.js';
import { updateAccountProfileBodySchema } from '../validators/auth.validators.js';
import { workerSalesQuerySchema, sellerReportQuerySchema } from '../validators/workers.validators.js';
import {
  workerFinancialSummaryQuerySchema,
  workerFinancialTransactionListQuerySchema,
} from '../validators/worker-financial.validators.js';

/** Self-service endpoints for the signed-in worker. */
export const meRouter = Router();

meRouter.use(requireAuth);

const accountDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        'Too many account deletion attempts. Please try again later.',
      ),
    );
  },
});

meRouter.get('/profile', getMyProfile);
meRouter.patch('/account', validate({ body: updateAccountProfileBodySchema }), patchMyAccount);
meRouter.get('/profile-modules', getMyProfileModules);
meRouter.get('/stats', getMyStats);
meRouter.get('/sales', validate({ query: workerSalesQuerySchema }), listMySales);
meRouter.get('/seller-report', validate({ query: sellerReportQuerySchema }), getMySellerReport);
meRouter.get('/activity', listMyActivity);
meRouter.get('/attributed-fees', listMyAttributedFees);

/** Read-only own ledger (create/reverse remain admin-only on /api/worker-finances). */
meRouter.get(
  '/finances/summary',
  validate({ query: workerFinancialSummaryQuerySchema }),
  async (req, res, next) => {
    if (!req.auth) return next();
    req.params = { ...req.params, workerId: req.auth.id };
    return getWorkerFinancialSummary(req, res, next);
  },
);
meRouter.get(
  '/finances/transactions',
  validate({ query: workerFinancialTransactionListQuerySchema }),
  async (req, res, next) => {
    if (!req.auth) return next();
    req.params = { ...req.params, workerId: req.auth.id };
    return listWorkerFinancialTransactions(req, res, next);
  },
);

meRouter.delete(
  '/account',
  accountDeleteLimiter,
  validate({ body: deleteAccountBodySchema }),
  deleteOwnAccount,
);
