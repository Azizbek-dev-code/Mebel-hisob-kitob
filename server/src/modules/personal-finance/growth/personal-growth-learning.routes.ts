import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getLearningGoals,
  getLearningStatsHandler,
  patchLearningGoal,
  postLearningGoal,
  postLearningMilestone,
  postLearningSession,
} from './personal-growth-learning.controller.js';
import {
  createLearningGoalBodySchema,
  createMilestoneBodySchema,
  listLearningQuerySchema,
  logLearningSessionBodySchema,
  updateLearningGoalBodySchema,
} from './personal-growth-learning.validators.js';

export const personalGrowthLearningRouter = Router();
personalGrowthLearningRouter.use(requireAuth, requirePersonalSession);

personalGrowthLearningRouter.get(
  '/growth/learning',
  validate({ query: listLearningQuerySchema }),
  getLearningGoals,
);
personalGrowthLearningRouter.get('/growth/learning/stats', getLearningStatsHandler);
personalGrowthLearningRouter.post(
  '/growth/learning/sessions',
  validate({ body: logLearningSessionBodySchema }),
  postLearningSession,
);
personalGrowthLearningRouter.post(
  '/growth/learning',
  validate({ body: createLearningGoalBodySchema }),
  postLearningGoal,
);
personalGrowthLearningRouter.patch(
  '/growth/learning/:id',
  validate({ params: idParamsSchema, body: updateLearningGoalBodySchema }),
  patchLearningGoal,
);
personalGrowthLearningRouter.post(
  '/growth/learning/:id/milestones',
  validate({ params: idParamsSchema, body: createMilestoneBodySchema }),
  postLearningMilestone,
);
