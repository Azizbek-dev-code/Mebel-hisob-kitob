import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { requirePlatformAdmin } from '../../../middleware/require-platform-admin.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  adminFinalizeCompetition,
  adminGetCompetition,
  adminListCompetitions,
  adminUpdateWinnerDelivery,
  adminUpsertCompetition,
  adminUpsertReward,
  getMonthlyCompetition,
  getMonthlyWinnersHistory,
} from './personal-growth-competition.controller.js';
import {
  updateWinnerDeliveryBodySchema,
  upsertCompetitionBodySchema,
  upsertRewardBodySchema,
} from './personal-growth-competition.validators.js';

/** Personal (read-only) monthly competition surfaces. */
export const personalGrowthCompetitionRouter = Router();
personalGrowthCompetitionRouter.use(requireAuth, requirePersonalSession);

personalGrowthCompetitionRouter.get('/growth/monthly-competition', getMonthlyCompetition);
personalGrowthCompetitionRouter.get(
  '/growth/monthly-competition/history',
  getMonthlyWinnersHistory,
);

/** Platform admin — reward / competition management. */
export const platformGlobalRankingRouter = Router();
platformGlobalRankingRouter.use(requireAuth, requirePlatformAdmin);

platformGlobalRankingRouter.get('/competitions', adminListCompetitions);
platformGlobalRankingRouter.get(
  '/competitions/:id',
  validate({ params: idParamsSchema }),
  adminGetCompetition,
);
platformGlobalRankingRouter.post(
  '/competitions',
  validate({ body: upsertCompetitionBodySchema }),
  adminUpsertCompetition,
);
platformGlobalRankingRouter.put(
  '/competitions/:id/rewards',
  validate({ params: idParamsSchema, body: upsertRewardBodySchema }),
  adminUpsertReward,
);
platformGlobalRankingRouter.post(
  '/competitions/:id/finalize',
  validate({ params: idParamsSchema }),
  adminFinalizeCompetition,
);
platformGlobalRankingRouter.patch(
  '/winners/:id/delivery',
  validate({ params: idParamsSchema, body: updateWinnerDeliveryBodySchema }),
  adminUpdateWinnerDelivery,
);
