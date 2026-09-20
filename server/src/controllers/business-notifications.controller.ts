import type {
  MarkBusinessNotificationsReadRequest,
  UpdateBusinessNotificationPrefsRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import {
  listBusinessNotifications,
  markBusinessNotificationsRead,
  updateBusinessNotificationPrefs,
} from '../services/business-notifications.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';

function requireStoreUser(req: Request) {
  if (!req.auth?.storeId) throw ApiError.unauthorized();
  return req.auth;
}

export const getBusinessNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = requireStoreUser(req);
  sendSuccess(
    res,
    await listBusinessNotifications(user.storeId, {
      id: user.id,
      role: user.role,
      responsibilities: user.responsibilities,
    }),
  );
});

export const patchBusinessNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
  const user = requireStoreUser(req);
  const body = req.body as UpdateBusinessNotificationPrefsRequest;
  sendSuccess(res, {
    prefs: await updateBusinessNotificationPrefs(user.storeId, user.id, body),
  });
});

export const postBusinessNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = requireStoreUser(req);
  const body = req.body as MarkBusinessNotificationsReadRequest;
  sendSuccess(res, await markBusinessNotificationsRead(user.storeId, user.id, body ?? {}));
});
