import type {
  CompleteGrowthFocusRequest,
  StartGrowthFocusRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  completeFocusSession,
  getActiveFocusSession,
  getFocusStats,
  startFocusSession,
} from './personal-growth-focus.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getFocusStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    stats: await getFocusStats(user.workspaceId, user.identityId),
  });
});

export const getActiveFocusHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    session: await getActiveFocusSession(user.workspaceId, user.identityId),
  });
});

export const postStartFocus = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as StartGrowthFocusRequest;
  sendCreated(res, {
    session: await startFocusSession(user.workspaceId, user.identityId, body),
  });
});

export const postCompleteFocus = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CompleteGrowthFocusRequest;
  sendSuccess(res, {
    session: await completeFocusSession(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
      body,
    ),
  });
});
