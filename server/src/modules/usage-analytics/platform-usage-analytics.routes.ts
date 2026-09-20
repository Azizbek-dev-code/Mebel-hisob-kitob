import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin.js';
import { validate } from '../../middleware/validate.js';
import { idParamsSchema } from '../../validators/common.validators.js';

import {
  getFeatures,
  getOverview,
  getRetention,
  getUser,
  getUsers,
} from './platform-usage-analytics.controller.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

export const platformUsageAnalyticsRouter = Router();
platformUsageAnalyticsRouter.use(requireAuth, requirePlatformAdmin);

platformUsageAnalyticsRouter.get('/overview', getOverview);
platformUsageAnalyticsRouter.get('/users', validate({ query: listQuerySchema }), getUsers);
platformUsageAnalyticsRouter.get('/users/:id', validate({ params: idParamsSchema }), getUser);
platformUsageAnalyticsRouter.get('/features', getFeatures);
platformUsageAnalyticsRouter.get('/retention', getRetention);
