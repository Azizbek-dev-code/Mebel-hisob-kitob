import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';

import {
  getAchievementsHandler,
  postEvaluateAchievements,
} from './personal-growth-achievements.controller.js';

export const personalGrowthAchievementsRouter = Router();
personalGrowthAchievementsRouter.use(requireAuth, requirePersonalSession);

personalGrowthAchievementsRouter.get('/growth/achievements', getAchievementsHandler);
personalGrowthAchievementsRouter.post('/growth/achievements/evaluate', postEvaluateAchievements);
