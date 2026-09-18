import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getPlanDay,
  getPlanEvents,
  getPlanReminders,
  patchPlanEvent,
  postPlanEvent,
} from './personal-plan.controller.js';
import {
  createGrowthEventBodySchema,
  dayPlanQuerySchema,
  listGrowthEventsQuerySchema,
  upcomingRemindersQuerySchema,
  updateGrowthEventBodySchema,
} from './personal-plan.validators.js';

export const personalPlanRouter = Router();
personalPlanRouter.use(requireAuth, requirePersonalSession);

personalPlanRouter.get(
  '/plan/events',
  validate({ query: listGrowthEventsQuerySchema }),
  getPlanEvents,
);
personalPlanRouter.get('/plan/day', validate({ query: dayPlanQuerySchema }), getPlanDay);
personalPlanRouter.get(
  '/plan/reminders',
  validate({ query: upcomingRemindersQuerySchema }),
  getPlanReminders,
);
personalPlanRouter.post(
  '/plan/events',
  validate({ body: createGrowthEventBodySchema }),
  postPlanEvent,
);
personalPlanRouter.patch(
  '/plan/events/:id',
  validate({ params: idParamsSchema, body: updateGrowthEventBodySchema }),
  patchPlanEvent,
);
