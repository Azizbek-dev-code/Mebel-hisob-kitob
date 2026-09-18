import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getDailyGoalsHandler,
  getHabits,
  getTodayProgressHandler,
  patchDailyGoal,
  patchHabit,
  postHabit,
  postHabitCheckIn,
  putDailyGoals,
} from './personal-growth-habits.controller.js';
import {
  checkInHabitBodySchema,
  createHabitBodySchema,
  dailyGoalsQuerySchema,
  listHabitsQuerySchema,
  updateDailyGoalBodySchema,
  updateHabitBodySchema,
  upsertDailyGoalsBodySchema,
} from './personal-growth-habits.validators.js';

export const personalGrowthHabitsRouter = Router();
personalGrowthHabitsRouter.use(requireAuth, requirePersonalSession);

personalGrowthHabitsRouter.get(
  '/growth/habits',
  validate({ query: listHabitsQuerySchema }),
  getHabits,
);
personalGrowthHabitsRouter.post(
  '/growth/habits',
  validate({ body: createHabitBodySchema }),
  postHabit,
);
personalGrowthHabitsRouter.patch(
  '/growth/habits/:id',
  validate({ params: idParamsSchema, body: updateHabitBodySchema }),
  patchHabit,
);
personalGrowthHabitsRouter.post(
  '/growth/habits/:id/check-in',
  validate({ params: idParamsSchema, body: checkInHabitBodySchema }),
  postHabitCheckIn,
);

personalGrowthHabitsRouter.get(
  '/growth/daily-goals',
  validate({ query: dailyGoalsQuerySchema }),
  getDailyGoalsHandler,
);
personalGrowthHabitsRouter.put(
  '/growth/daily-goals',
  validate({ body: upsertDailyGoalsBodySchema }),
  putDailyGoals,
);
personalGrowthHabitsRouter.patch(
  '/growth/daily-goals/:id',
  validate({ params: idParamsSchema, body: updateDailyGoalBodySchema }),
  patchDailyGoal,
);

personalGrowthHabitsRouter.get('/growth/today-progress', getTodayProgressHandler);
