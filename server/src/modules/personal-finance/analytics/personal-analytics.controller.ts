import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';
import { getPersonalAnalytics } from './personal-analytics.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const months = req.query.months === undefined ? undefined : Number(req.query.months);
  sendSuccess(res, await getPersonalAnalytics(user.workspaceId, months));
});
