import {
  GROWTH_LEADERBOARD_METRICS,
  GROWTH_LEADERBOARD_PERIODS,
} from '@furniture-erp/shared';
import { z } from 'zod';
import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';

import { getFriendStreaks, getLeaderboard } from './personal-growth-social.controller.js';

const leaderboardQuerySchema = z.object({
  period: z.enum(GROWTH_LEADERBOARD_PERIODS as [string, ...string[]]).optional(),
  metric: z.enum(GROWTH_LEADERBOARD_METRICS as [string, ...string[]]).optional(),
});

export const personalGrowthSocialRouter = Router();
personalGrowthSocialRouter.use(requireAuth, requirePersonalSession);

personalGrowthSocialRouter.get(
  '/growth/leaderboard',
  validate({ query: leaderboardQuerySchema }),
  getLeaderboard,
);
personalGrowthSocialRouter.get('/growth/friend-streaks', getFriendStreaks);
