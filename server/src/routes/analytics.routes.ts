import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';

import {
  getExpenseAnalytics,
  getFinancialSummary,
  getFinancialTrend,
} from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import {
  expenseAnalyticsQuerySchema,
  financialSummaryQuerySchema,
  financialTrendQuerySchema,
} from '../validators/analytics.validators.js';

/**
 * Store-scoped financial analytics.
 *
 * ADMIN / PLATFORM_ADMIN only (enforced in the service). Period boundaries use
 * the store timezone via the same half-open ranges as the dashboard.
 */
export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireFeature(FeatureKey.ANALYTICS));

analyticsRouter.get(
  '/financial-summary',
  validate({ query: financialSummaryQuerySchema }),
  getFinancialSummary,
);

analyticsRouter.get(
  '/financial-trend',
  validate({ query: financialTrendQuerySchema }),
  getFinancialTrend,
);

analyticsRouter.get(
  '/expenses',
  validate({ query: expenseAnalyticsQuerySchema }),
  getExpenseAnalytics,
);
