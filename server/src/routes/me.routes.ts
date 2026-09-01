import { Router } from 'express';

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
import { workerSalesQuerySchema, sellerReportQuerySchema } from '../validators/workers.validators.js';
import {
  workerFinancialSummaryQuerySchema,
  workerFinancialTransactionListQuerySchema,
} from '../validators/worker-financial.validators.js';

/** Self-service endpoints for the signed-in worker. */
export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/profile', getMyProfile);
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
