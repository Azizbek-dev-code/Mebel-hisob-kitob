import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import {
  getAccounts,
  postCreateBusinessRequest,
  postCreatePersonalAccount,
  postRegisterPersonalAccount,
  postSwitchWorkspace,
} from './accounts.controller.js';
import {
  createAuthenticatedBusinessRequestBodySchema,
  createPersonalAccountBodySchema,
  registerPersonalAccountBodySchema,
  switchWorkspaceBodySchema,
} from './accounts.validators.js';

const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring.",
      ),
    );
  },
});

/**
 * Account overlay APIs. Public Personal register does not create a Store.
 * Authenticated list/switch work for both store and personal sessions.
 */
export const accountsRouter = Router();

accountsRouter.post(
  '/personal/register',
  registerRateLimiter,
  validate({ body: registerPersonalAccountBodySchema }),
  postRegisterPersonalAccount,
);

accountsRouter.use(requireAuth);
accountsRouter.get('/', getAccounts);
accountsRouter.post(
  '/switch',
  validate({ body: switchWorkspaceBodySchema }),
  postSwitchWorkspace,
);
accountsRouter.post(
  '/personal',
  validate({ body: createPersonalAccountBodySchema }),
  postCreatePersonalAccount,
);
accountsRouter.post(
  '/business-requests',
  validate({ body: createAuthenticatedBusinessRequestBodySchema }),
  postCreateBusinessRequest,
);
