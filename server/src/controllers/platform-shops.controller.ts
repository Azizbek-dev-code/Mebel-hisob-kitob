import type { PlatformShopListResponse } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as platformShopsService from '../services/platform-shops.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const listPlatformShops = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await platformShopsService.listPlatformShops(user.role);
  sendSuccess<PlatformShopListResponse>(res, result);
});
