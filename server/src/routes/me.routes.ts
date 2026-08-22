import { Router } from 'express';

import {
  getMyProfile,
  getMyStats,
  listMyActivity,
  listMySales,
} from '../controllers/workers.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { workerSalesQuerySchema } from '../validators/workers.validators.js';

/** Self-service endpoints for the signed-in worker. */
export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/profile', getMyProfile);
meRouter.get('/stats', getMyStats);
meRouter.get('/sales', validate({ query: workerSalesQuerySchema }), listMySales);
meRouter.get('/activity', listMyActivity);
