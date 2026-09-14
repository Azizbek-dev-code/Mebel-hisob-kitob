import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { getAnalytics } from './personal-analytics.controller.js';
import { personalAnalyticsQuerySchema } from './personal-analytics.validators.js';

export const personalAnalyticsRouter = Router();
personalAnalyticsRouter.use(requireAuth, requirePersonalSession);
personalAnalyticsRouter.get('/analytics', validate({ query: personalAnalyticsQuerySchema }), getAnalytics);
