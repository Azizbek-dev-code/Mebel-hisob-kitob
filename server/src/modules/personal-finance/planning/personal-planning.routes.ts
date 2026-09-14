import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';
import {
  getBudgets,
  getGoals,
  patchBudget,
  patchGoal,
  postBudget,
  postGoal,
  postGoalContribution,
} from './personal-planning.controller.js';
import {
  createPersonalBudgetBodySchema,
  createPersonalGoalContributionBodySchema,
  createPersonalSavingGoalBodySchema,
  updatePersonalBudgetBodySchema,
  updatePersonalSavingGoalBodySchema,
} from './personal-planning.validators.js';

export const personalPlanningRouter = Router();
personalPlanningRouter.use(requireAuth, requirePersonalSession);

personalPlanningRouter.get('/budgets', getBudgets);
personalPlanningRouter.post(
  '/budgets',
  validate({ body: createPersonalBudgetBodySchema }),
  postBudget,
);
personalPlanningRouter.patch(
  '/budgets/:id',
  validate({ params: idParamsSchema, body: updatePersonalBudgetBodySchema }),
  patchBudget,
);

personalPlanningRouter.get('/goals', getGoals);
personalPlanningRouter.post(
  '/goals',
  validate({ body: createPersonalSavingGoalBodySchema }),
  postGoal,
);
personalPlanningRouter.patch(
  '/goals/:id',
  validate({ params: idParamsSchema, body: updatePersonalSavingGoalBodySchema }),
  patchGoal,
);
personalPlanningRouter.post(
  '/goals/:id/contributions',
  validate({ params: idParamsSchema, body: createPersonalGoalContributionBodySchema }),
  postGoalContribution,
);
