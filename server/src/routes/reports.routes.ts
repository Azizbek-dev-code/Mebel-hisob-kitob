import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';

import {
  getReportsBundle,
  getReportsCashFlow,
  getReportsDebts,
  getReportsExpenses,
  getReportsInventory,
  getReportsProducts,
  getReportsProfitLoss,
  getReportsSales,
  getReportsSummary,
  getReportsSupplierPayables,
  getReportsTrend,
  getReportsWorkers,
} from '../controllers/reports.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import {
  reportsExpensesQuerySchema,
  reportsPeriodQuerySchema,
  reportsProductsQuerySchema,
  reportsSummaryQuerySchema,
} from '../validators/reports.validators.js';

/**
 * Financial reports — ADMIN / PLATFORM_ADMIN only (enforced in analytics gate).
 * All endpoints are read-only aggregates; storeId comes from the session.
 */
export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireFeature(FeatureKey.REPORTS));

reportsRouter.get(
  '/summary',
  validate({ query: reportsSummaryQuerySchema }),
  getReportsSummary,
);
reportsRouter.get(
  '/profit-loss',
  validate({ query: reportsPeriodQuerySchema }),
  getReportsProfitLoss,
);
reportsRouter.get(
  '/cash-flow',
  validate({ query: reportsPeriodQuerySchema }),
  getReportsCashFlow,
);
reportsRouter.get('/sales', validate({ query: reportsPeriodQuerySchema }), getReportsSales);
reportsRouter.get(
  '/expenses',
  validate({ query: reportsExpensesQuerySchema }),
  getReportsExpenses,
);
reportsRouter.get('/debts', validate({ query: reportsPeriodQuerySchema }), getReportsDebts);
reportsRouter.get(
  '/supplier-payables',
  validate({ query: reportsPeriodQuerySchema }),
  getReportsSupplierPayables,
);
reportsRouter.get('/workers', validate({ query: reportsPeriodQuerySchema }), getReportsWorkers);
reportsRouter.get(
  '/products',
  validate({ query: reportsProductsQuerySchema }),
  getReportsProducts,
);
reportsRouter.get(
  '/inventory',
  validate({ query: reportsPeriodQuerySchema }),
  getReportsInventory,
);
reportsRouter.get('/trend', validate({ query: reportsPeriodQuerySchema }), getReportsTrend);
reportsRouter.get('/bundle', validate({ query: reportsProductsQuerySchema }), getReportsBundle);
