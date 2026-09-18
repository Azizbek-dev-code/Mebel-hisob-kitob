import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getActiveFocusHandler,
  getFocusStatsHandler,
  postCompleteFocus,
  postStartFocus,
} from './personal-growth-focus.controller.js';
import {
  completeFocusBodySchema,
  startFocusBodySchema,
} from './personal-growth-focus.validators.js';

export const personalGrowthFocusRouter = Router();
personalGrowthFocusRouter.use(requireAuth, requirePersonalSession);

personalGrowthFocusRouter.get('/growth/focus/stats', getFocusStatsHandler);
personalGrowthFocusRouter.get('/growth/focus/active', getActiveFocusHandler);
personalGrowthFocusRouter.post(
  '/growth/focus/start',
  validate({ body: startFocusBodySchema }),
  postStartFocus,
);
personalGrowthFocusRouter.post(
  '/growth/focus/:id/complete',
  validate({ params: idParamsSchema, body: completeFocusBodySchema }),
  postCompleteFocus,
);
