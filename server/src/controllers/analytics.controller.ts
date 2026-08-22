import type {
  ExpenseAnalyticsResponse,
  FinancialSummaryResponse,
  FinancialTrendResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as analyticsService from '../services/analytics.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';
import type {
  ExpenseAnalyticsQuery,
  FinancialSummaryQuery,
  FinancialTrendQuery,
} from '../validators/analytics.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const getFinancialSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as FinancialSummaryQuery;

  const summary = await analyticsService.getFinancialSummary({
    storeId: user.storeId,
    actorRole: user.role,
    from: query.from,
    to: query.to,
    preset: query.preset,
    comparison: query.comparison ?? null,
  });

  sendSuccess<FinancialSummaryResponse>(res, { summary });
});

export const getExpenseAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ExpenseAnalyticsQuery;

  const analytics = await analyticsService.getExpenseAnalytics({
    storeId: user.storeId,
    actorRole: user.role,
    from: query.from,
    to: query.to,
    preset: query.preset,
    categoryId: query.categoryId,
  });

  sendSuccess<ExpenseAnalyticsResponse>(res, { analytics });
});

export const getFinancialTrend = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as FinancialTrendQuery;

  const trend = await analyticsService.getFinancialTrend({
    storeId: user.storeId,
    actorRole: user.role,
    from: query.from,
    to: query.to,
    preset: query.preset,
  });

  sendSuccess<FinancialTrendResponse>(res, { trend });
});
