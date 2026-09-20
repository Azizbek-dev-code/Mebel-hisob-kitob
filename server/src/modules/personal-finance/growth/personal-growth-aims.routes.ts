import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import { getAims, patchAim, postAim } from './personal-growth-aims.controller.js';
import { createAimBodySchema, updateAimBodySchema } from './personal-growth-aims.validators.js';

export const personalGrowthAimsRouter = Router();
personalGrowthAimsRouter.use(requireAuth, requirePersonalSession);

personalGrowthAimsRouter.get('/growth/aims', getAims);
personalGrowthAimsRouter.post('/growth/aims', validate({ body: createAimBodySchema }), postAim);
personalGrowthAimsRouter.patch(
  '/growth/aims/:id',
  validate({ params: idParamsSchema, body: updateAimBodySchema }),
  patchAim,
);
