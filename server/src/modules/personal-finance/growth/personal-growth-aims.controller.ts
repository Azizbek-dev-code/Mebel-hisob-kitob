import {
  GrowthAimStatus,
  type CreateGrowthAimRequest,
  type UpdateGrowthAimRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import { createGrowthAim, listGrowthAims, updateGrowthAim } from './personal-growth-aims.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getAims = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listGrowthAims(user.workspaceId));
});

export const postAim = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    aim: await createGrowthAim(user.workspaceId, user.identityId, req.body as CreateGrowthAimRequest),
  });
});

export const patchAim = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    aim: await updateGrowthAim(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
      req.body as UpdateGrowthAimRequest,
    ),
  });
});

export const GROWTH_AIM_STATUSES = GrowthAimStatus;
