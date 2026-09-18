import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';

import { getGrowthQuotasHandler } from './personal-growth-premium.controller.js';

export const personalGrowthPremiumRouter = Router();
personalGrowthPremiumRouter.use(requireAuth, requirePersonalSession);

personalGrowthPremiumRouter.get('/growth/quotas', getGrowthQuotasHandler);
