import type { StoreProfileMutationResponse, StoreProfileResponse } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as settingsService from '../services/settings.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';
import type { UpdateStoreProfileBody } from '../validators/settings.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const getStoreProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const store = await settingsService.getStoreProfile(user.storeId, user.role);
  sendSuccess<StoreProfileResponse>(res, { store });
});

export const updateStoreProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdateStoreProfileBody;
  const store = await settingsService.updateStoreProfile(user.storeId, user.role, body, user.id);
  sendSuccess<StoreProfileMutationResponse>(res, { store });
});
