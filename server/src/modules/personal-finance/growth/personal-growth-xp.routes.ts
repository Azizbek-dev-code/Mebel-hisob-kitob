import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';

import { getProgressHandler } from './personal-growth-xp.controller.js';

export const personalGrowthXpRouter = Router();
personalGrowthXpRouter.use(requireAuth, requirePersonalSession);

personalGrowthXpRouter.get('/growth/progress', getProgressHandler);
