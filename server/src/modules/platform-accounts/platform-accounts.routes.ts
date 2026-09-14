import { Router } from 'express';

import { requireAuth } from '../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin.js';
import { validate } from '../../middleware/validate.js';

import { getPlatformAccount, listPlatformAccounts } from './platform-accounts.controller.js';
import {
  platformAccountIdParamsSchema,
  platformAccountListQuerySchema,
} from './platform-accounts.validators.js';

export const platformAccountsRouter = Router();

platformAccountsRouter.use(requireAuth, requirePlatformAdmin);
platformAccountsRouter.get('/', validate({ query: platformAccountListQuerySchema }), listPlatformAccounts);
platformAccountsRouter.get(
  '/:id',
  validate({ params: platformAccountIdParamsSchema }),
  getPlatformAccount,
);
