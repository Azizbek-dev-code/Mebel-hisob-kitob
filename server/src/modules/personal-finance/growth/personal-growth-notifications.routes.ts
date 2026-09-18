import { z } from 'zod';
import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getGrowthNotifications,
  patchGrowthNotificationPrefs,
  postDismissGrowthNotification,
  postMarkGrowthNotificationsRead,
} from './personal-growth-notifications.controller.js';

const markReadBodySchema = z.object({
  ids: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
});

const prefsBodySchema = z
  .object({
    notifyReminder: z.boolean().optional(),
    notifyAchievement: z.boolean().optional(),
    notifyFriend: z.boolean().optional(),
    notifyFight: z.boolean().optional(),
    notifyStreak: z.boolean().optional(),
    notifyResult: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.notifyReminder !== undefined ||
      body.notifyAchievement !== undefined ||
      body.notifyFriend !== undefined ||
      body.notifyFight !== undefined ||
      body.notifyStreak !== undefined ||
      body.notifyResult !== undefined,
    { message: 'At least one pref is required' },
  );

export const personalGrowthNotificationsRouter = Router();
personalGrowthNotificationsRouter.use(requireAuth, requirePersonalSession);

personalGrowthNotificationsRouter.get('/growth/notifications', getGrowthNotifications);
personalGrowthNotificationsRouter.post(
  '/growth/notifications/read',
  validate({ body: markReadBodySchema }),
  postMarkGrowthNotificationsRead,
);
personalGrowthNotificationsRouter.post(
  '/growth/notifications/:id/dismiss',
  validate({ params: idParamsSchema }),
  postDismissGrowthNotification,
);
personalGrowthNotificationsRouter.patch(
  '/growth/notifications/prefs',
  validate({ body: prefsBodySchema }),
  patchGrowthNotificationPrefs,
);
