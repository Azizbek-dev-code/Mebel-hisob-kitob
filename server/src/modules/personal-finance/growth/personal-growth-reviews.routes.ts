import { z } from 'zod';
import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';

import {
  getMonthlyReportHandler,
  getWeeklyReviewHandler,
  putMonthlyReportHandler,
  putWeeklyReviewHandler,
} from './personal-growth-reviews.controller.js';

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

const weeklyQuerySchema = z.object({
  weekStart: dayKeySchema.optional(),
});

const monthlyQuerySchema = z.object({
  yearMonth: yearMonthSchema.optional(),
});

const weeklyBodySchema = z.object({
  weekStartDayKey: dayKeySchema.optional(),
  wentWell: z.string().trim().max(1000).nullable().optional(),
  wasHard: z.string().trim().max(1000).nullable().optional(),
  nextWeekChange: z.string().trim().max(1000).nullable().optional(),
});

const monthlyBodySchema = z.object({
  yearMonth: yearMonthSchema.optional(),
  highlight: z.string().trim().max(1000).nullable().optional(),
  lesson: z.string().trim().max(1000).nullable().optional(),
  nextMonthIntent: z.string().trim().max(1000).nullable().optional(),
});

export const personalGrowthReviewsRouter = Router();
personalGrowthReviewsRouter.use(requireAuth, requirePersonalSession);

personalGrowthReviewsRouter.get(
  '/growth/reviews/weekly',
  validate({ query: weeklyQuerySchema }),
  getWeeklyReviewHandler,
);
personalGrowthReviewsRouter.put(
  '/growth/reviews/weekly',
  validate({ body: weeklyBodySchema }),
  putWeeklyReviewHandler,
);
personalGrowthReviewsRouter.get(
  '/growth/reports/monthly',
  validate({ query: monthlyQuerySchema }),
  getMonthlyReportHandler,
);
personalGrowthReviewsRouter.put(
  '/growth/reports/monthly',
  validate({ body: monthlyBodySchema }),
  putMonthlyReportHandler,
);
