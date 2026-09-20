import { Router } from 'express';

import {
  getBusinessNotifications,
  patchBusinessNotificationPrefs,
  postBusinessNotificationsRead,
} from '../controllers/business-notifications.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import {
  markBusinessNotificationsReadBodySchema,
  updateBusinessNotificationPrefsBodySchema,
} from '../validators/business-notifications.validators.js';

export const businessNotificationsRouter = Router();

businessNotificationsRouter.use(requireAuth);

businessNotificationsRouter.get('/', getBusinessNotifications);
businessNotificationsRouter.patch(
  '/prefs',
  validate({ body: updateBusinessNotificationPrefsBodySchema }),
  patchBusinessNotificationPrefs,
);
businessNotificationsRouter.post(
  '/read',
  validate({ body: markBusinessNotificationsReadBodySchema }),
  postBusinessNotificationsRead,
);
