import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import {
  getCurrentUser,
  getAuthSessions,
  postChangePassword,
  postConfirmEmailChange,
  postConfirmEmailVerification,
  postConfirmInAppPasswordReset,
  postForgotPassword,
  postLogin,
  postLogout,
  postRequestEmailChange,
  postRequestEmailVerification,
  postRequestInAppPasswordReset,
  postResetPassword,
  postRevokeAuthSession,
  postRevokeOtherAuthSessions,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/api-error.js';
import {
  loginBodySchema,
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  verifyEmailCodeBodySchema,
  inAppResetPasswordBodySchema,
  requestEmailChangeBodySchema,
} from '../validators/auth.validators.js';
import { z } from 'zod';

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

/** Authenticated password change must not share the public login counter. */
const changePasswordRateLimiter = rateLimit({
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
        'Too many password change attempts. Please try again in a few minutes.',
      ),
    );
  },
});

const emailCodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        'Too many requests. Try again later.',
      ),
    );
  },
});

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validate({ body: loginBodySchema }), postLogin);
authRouter.post(
  '/forgot-password',
  loginRateLimiter,
  validate({ body: forgotPasswordBodySchema }),
  postForgotPassword,
);
authRouter.post(
  '/reset-password',
  loginRateLimiter,
  validate({ body: resetPasswordBodySchema }),
  postResetPassword,
);
authRouter.post(
  '/change-password',
  requireAuth,
  changePasswordRateLimiter,
  validate({ body: changePasswordBodySchema }),
  postChangePassword,
);
authRouter.get('/me', requireAuth, getCurrentUser);
authRouter.post('/logout', postLogout);
authRouter.get('/sessions', requireAuth, getAuthSessions);
authRouter.post(
  '/sessions/revoke-others',
  requireAuth,
  postRevokeOtherAuthSessions,
);
authRouter.post(
  '/sessions/:id/revoke',
  requireAuth,
  validate({ params: z.object({ id: z.string().trim().min(1).max(64) }) }),
  postRevokeAuthSession,
);
authRouter.post('/verify-email/request', requireAuth, emailCodeRateLimiter, postRequestEmailVerification);
authRouter.post(
  '/verify-email/confirm',
  requireAuth,
  emailCodeRateLimiter,
  validate({ body: verifyEmailCodeBodySchema }),
  postConfirmEmailVerification,
);
authRouter.post('/change-email/request', requireAuth, emailCodeRateLimiter, validate({ body: requestEmailChangeBodySchema }), postRequestEmailChange);
authRouter.post(
  '/change-email/confirm',
  requireAuth,
  emailCodeRateLimiter,
  validate({ body: verifyEmailCodeBodySchema }),
  postConfirmEmailChange,
);
authRouter.post('/security/email-reset/request', requireAuth, emailCodeRateLimiter, postRequestInAppPasswordReset);
authRouter.post(
  '/security/email-reset/confirm',
  requireAuth,
  emailCodeRateLimiter,
  validate({ body: inAppResetPasswordBodySchema }),
  postConfirmInAppPasswordReset,
);
