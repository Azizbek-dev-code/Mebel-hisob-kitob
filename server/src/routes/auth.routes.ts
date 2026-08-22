import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { getCurrentUser, postLogin, postLogout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/api-error.js';
import { loginBodySchema } from '../validators/auth.validators.js';

/**
 * Password checking is intentionally slow, which also makes the login route the
 * cheapest place to exhaust the server. Capping attempts per IP blunts both
 * credential stuffing and the accidental retry loop.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // A test suite makes more attempts in a second than a human does in a day.
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        'Too many sign-in attempts. Please try again in a few minutes.',
      ),
    );
  },
});

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validate({ body: loginBodySchema }), postLogin);
authRouter.get('/me', requireAuth, getCurrentUser);
authRouter.post('/logout', postLogout);
