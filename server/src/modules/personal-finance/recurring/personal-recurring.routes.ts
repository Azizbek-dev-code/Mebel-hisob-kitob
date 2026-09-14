import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';
import {
  getRecurring,
  patchRecurring,
  postRecurring,
  postRecurringAck,
  postRecurringLog,
} from './personal-recurring.controller.js';
import {
  createPersonalRecurringBodySchema,
  updatePersonalRecurringBodySchema,
} from './personal-recurring.validators.js';

export const personalRecurringRouter = Router();
personalRecurringRouter.use(requireAuth, requirePersonalSession);

personalRecurringRouter.get('/recurring', getRecurring);
personalRecurringRouter.post(
  '/recurring',
  validate({ body: createPersonalRecurringBodySchema }),
  postRecurring,
);
personalRecurringRouter.patch(
  '/recurring/:id',
  validate({ params: idParamsSchema, body: updatePersonalRecurringBodySchema }),
  patchRecurring,
);
personalRecurringRouter.post(
  '/recurring/:id/acknowledge',
  validate({ params: idParamsSchema }),
  postRecurringAck,
);
personalRecurringRouter.post(
  '/recurring/:id/log',
  validate({ params: idParamsSchema }),
  postRecurringLog,
);
