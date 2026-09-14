import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { getNotifications, patchNotificationPrefs } from './personal-notifications.controller.js';
import { updatePersonalNotificationPrefsBodySchema } from './personal-notifications.validators.js';

export const personalNotificationsRouter = Router();
personalNotificationsRouter.use(requireAuth, requirePersonalSession);

personalNotificationsRouter.get('/notifications', getNotifications);
personalNotificationsRouter.patch(
  '/notifications/prefs',
  validate({ body: updatePersonalNotificationPrefsBodySchema }),
  patchNotificationPrefs,
);
