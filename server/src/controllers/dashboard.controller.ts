import type { DashboardSummaryResponse } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as dashboardService from '../services/dashboard.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';
import type { DashboardSummaryQuery } from '../validators/dashboard.validators.js';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }

  const { preset, from, to } = req.query as unknown as DashboardSummaryQuery;

  // The store comes from the session, never from the request: a caller cannot
  // name the store whose figures they would like to see.
  const summary = await dashboardService.getDashboardSummary({
    storeId: req.auth.storeId,
    preset,
    from,
    to,
  });

  sendSuccess<DashboardSummaryResponse>(res, { summary });
});
