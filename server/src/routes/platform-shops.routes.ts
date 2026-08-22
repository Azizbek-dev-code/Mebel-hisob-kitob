import { Router } from 'express';

import {
  getShop,
  postActivateSubscription,
  postAssignPlan,
  postManualBlock,
} from '../controllers/platform-billing.controller.js';
import { listPlatformShops } from '../controllers/platform-shops.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requirePlatformAdmin } from '../middleware/require-platform-admin.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  assignPlanBodySchema,
  manualActivateBodySchema,
  manualBlockBodySchema,
} from '../validators/platform-billing.validators.js';

/** PLATFORM_ADMIN store directory. Not store-scoped operational data. */
export const platformShopsRouter = Router();

platformShopsRouter.use(requireAuth, requirePlatformAdmin);
platformShopsRouter.get('/', listPlatformShops);
platformShopsRouter.get('/:id', validate({ params: idParamsSchema }), getShop);
platformShopsRouter.post(
  '/:id/plan',
  validate({ params: idParamsSchema, body: assignPlanBodySchema }),
  postAssignPlan,
);
platformShopsRouter.post(
  '/:id/block',
  validate({ params: idParamsSchema, body: manualBlockBodySchema }),
  postManualBlock,
);
platformShopsRouter.post(
  '/:id/activate-subscription',
  validate({ params: idParamsSchema, body: manualActivateBodySchema }),
  postActivateSubscription,
);
