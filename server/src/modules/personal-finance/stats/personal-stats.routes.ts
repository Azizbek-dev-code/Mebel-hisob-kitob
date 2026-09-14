import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../../middleware/require-platform-admin.js';
import { getStats } from './personal-stats.controller.js';

export const platformPersonalRouter = Router();
platformPersonalRouter.use(requireAuth, requirePlatformAdmin);
platformPersonalRouter.get('/stats', getStats);
