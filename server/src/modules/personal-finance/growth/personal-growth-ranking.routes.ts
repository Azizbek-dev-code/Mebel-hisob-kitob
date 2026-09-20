import { GLOBAL_LEADERBOARD_PERIODS } from '@furniture-erp/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getGlobalRanking,
  getGlobalRankingProfileById,
  postLikeFeedback,
} from './personal-growth-ranking.controller.js';

const rankingQuerySchema = z.object({
  period: z.enum(GLOBAL_LEADERBOARD_PERIODS as [string, ...string[]]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

export const personalGrowthRankingRouter = Router();
personalGrowthRankingRouter.use(requireAuth, requirePersonalSession);

personalGrowthRankingRouter.get(
  '/growth/global-ranking',
  validate({ query: rankingQuerySchema }),
  getGlobalRanking,
);
personalGrowthRankingRouter.get(
  '/growth/global-ranking/:id',
  validate({ params: idParamsSchema }),
  getGlobalRankingProfileById,
);
personalGrowthRankingRouter.post(
  '/growth/feedback/:id/like',
  validate({ params: idParamsSchema }),
  postLikeFeedback,
);
