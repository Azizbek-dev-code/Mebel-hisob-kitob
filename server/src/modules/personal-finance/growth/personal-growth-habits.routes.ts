import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  deleteHabitLogHandler,
  getDailyGoalsHandler,
  getHabit,
  getHabitDetailHandler,
  getHabitLogsHandler,
  getHabitStatsHandler,
  getHabits,
  getHabitsProgressHandler,
  getTodayProgressHandler,
  patchDailyGoal,
  patchHabit,
  patchHabitLog,
  postChecklistTick,
  postHabit,
  postHabitCheckIn,
  postHabitLog,
  postHabitSkip,
  putDailyGoals,
} from './personal-growth-habits.controller.js';
import {
  checkInHabitBodySchema,
  checklistTickBodySchema,
  createHabitBodySchema,
  createHabitLogBodySchema,
  dailyGoalsQuerySchema,
  habitLogParamsSchema,
  habitRangeQuerySchema,
  listHabitsQuerySchema,
  skipHabitBodySchema,
  updateDailyGoalBodySchema,
  updateHabitBodySchema,
  updateHabitLogBodySchema,
  upsertDailyGoalsBodySchema,
} from './personal-growth-habits.validators.js';

export const personalGrowthHabitsRouter = Router();
personalGrowthHabitsRouter.use(requireAuth, requirePersonalSession);

personalGrowthHabitsRouter.get(
  '/growth/habits',
  validate({ query: listHabitsQuerySchema }),
  getHabits,
);
personalGrowthHabitsRouter.get(
  '/growth/habits/progress',
  validate({ query: habitRangeQuerySchema }),
  getHabitsProgressHandler,
);
personalGrowthHabitsRouter.post(
  '/growth/habits',
  validate({ body: createHabitBodySchema }),
  postHabit,
);
personalGrowthHabitsRouter.get(
  '/growth/habits/:id',
  validate({ params: idParamsSchema }),
  getHabit,
);
personalGrowthHabitsRouter.get(
  '/growth/habits/:id/detail',
  validate({ params: idParamsSchema }),
  getHabitDetailHandler,
);
personalGrowthHabitsRouter.get(
  '/growth/habits/:id/statistics',
  validate({ params: idParamsSchema, query: habitRangeQuerySchema }),
  getHabitStatsHandler,
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
  '/growth/habits/:id/logs',
  validate({ params: idParamsSchema, query: habitRangeQuerySchema }),
  getHabitLogsHandler,
);
personalGrowthHabitsRouter.post(
  '/growth/habits/:id/logs',
  validate({ params: idParamsSchema, body: createHabitLogBodySchema }),
  postHabitLog,
);
personalGrowthHabitsRouter.patch(
  '/growth/habits/:id/logs/:logId',
  validate({ params: habitLogParamsSchema, body: updateHabitLogBodySchema }),
  patchHabitLog,
);
personalGrowthHabitsRouter.delete(
  '/growth/habits/:id/logs/:logId',
  validate({ params: habitLogParamsSchema }),
  deleteHabitLogHandler,
);
personalGrowthHabitsRouter.post(
  '/growth/habits/:id/skip',
  validate({ params: idParamsSchema, body: skipHabitBodySchema }),
  postHabitSkip,
);
personalGrowthHabitsRouter.post(
  '/growth/habits/:id/checklist-ticks',
  validate({ params: idParamsSchema, body: checklistTickBodySchema }),
  postChecklistTick,
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
