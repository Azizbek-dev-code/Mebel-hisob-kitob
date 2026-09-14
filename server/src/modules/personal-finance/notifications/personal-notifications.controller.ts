import type { UpdatePersonalNotificationPrefsRequest } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';
import {
  listPersonalNotifications,
  updatePersonalNotificationPrefs,
} from './personal-notifications.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listPersonalNotifications(user.workspaceId));
});

export const patchNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as UpdatePersonalNotificationPrefsRequest;
  sendSuccess(res, {
    prefs: await updatePersonalNotificationPrefs(user.workspaceId, user.identityId, body),
  });
});
