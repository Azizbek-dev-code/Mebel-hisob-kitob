import type {
  UpsertGrowthMonthlyReportRequest,
  UpsertGrowthWeeklyReviewRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';

import {
  getMonthlyReport,
  getWeeklyReview,
  upsertMonthlyReport,
  upsertWeeklyReview,
} from './personal-growth-reviews.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getWeeklyReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const weekStart = (req.query as { weekStart?: string }).weekStart;
  sendSuccess(res, await getWeeklyReview(user.workspaceId, user.identityId, weekStart));
});

export const putWeeklyReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(
    res,
    await upsertWeeklyReview(
      user.workspaceId,
      user.identityId,
      req.body as UpsertGrowthWeeklyReviewRequest,
    ),
  );
});

export const getMonthlyReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const yearMonth = (req.query as { yearMonth?: string }).yearMonth;
  sendSuccess(res, await getMonthlyReport(user.workspaceId, user.identityId, yearMonth));
});

export const putMonthlyReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(
    res,
    await upsertMonthlyReport(
      user.workspaceId,
      user.identityId,
      req.body as UpsertGrowthMonthlyReportRequest,
    ),
  );
});
