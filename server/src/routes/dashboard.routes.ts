import { Router } from 'express';

import { getSummary } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { dashboardSummaryQuerySchema } from '../validators/dashboard.validators.js';

export const dashboardRouter = Router();

/**
 * One endpoint for the whole screen.
 *
 * Every panel is calculated from the same period and the same instant, so the
 * dashboard cannot show a KPI card and a chart that disagree — and the browser
 * makes one request instead of one per card.
 */
dashboardRouter.get(
  '/summary',
  requireAuth,
  validate({ query: dashboardSummaryQuerySchema }),
  getSummary,
);
