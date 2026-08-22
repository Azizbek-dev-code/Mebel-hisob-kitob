import { Router } from 'express';

import {
  getStoreProfile,
  updateStoreProfile,
} from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { updateStoreProfileBodySchema } from '../validators/settings.validators.js';

/**
 * Store profile settings (Sozlamalar).
 *
 * GET — any signed-in store user.
 * PATCH — ADMIN / PLATFORM_ADMIN only (enforced in the service layer).
 * storeId always comes from the session.
 */
export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/store', getStoreProfile);
settingsRouter.patch(
  '/store',
  validate({ body: updateStoreProfileBodySchema }),
  updateStoreProfile,
);
