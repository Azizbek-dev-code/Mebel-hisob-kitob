import type {
  MarkGrowthNotificationsRequest,
  UpdateGrowthNotificationPrefsRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';

import {
  dismissGrowthNotification,
  listGrowthNotifications,
  markGrowthNotificationsRead,
  updateGrowthNotificationPrefs,
} from './personal-growth-notifications.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getGrowthNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listGrowthNotifications(user.workspaceId, user.identityId));
});

export const postMarkGrowthNotificationsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requirePersonal(req);
    sendSuccess(
      res,
      await markGrowthNotificationsRead(
        user.workspaceId,
        user.identityId,
        req.body as MarkGrowthNotificationsRequest,
      ),
    );
  },
);

export const postDismissGrowthNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requirePersonal(req);
    await dismissGrowthNotification(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    );
    sendSuccess(res, { ok: true });
  },
);

export const patchGrowthNotificationPrefs = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requirePersonal(req);
    sendSuccess(res, {
      prefs: await updateGrowthNotificationPrefs(
        user.workspaceId,
        user.identityId,
        req.body as UpdateGrowthNotificationPrefsRequest,
      ),
    });
  },
);
