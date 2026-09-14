import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import {
  getAdminReferralOverview,
  getAdminReferralUsers,
  getAdminReferralWithdrawals,
  getMyReferralDashboard,
  getMyReferralWithdrawals,
  getResolveReferral,
  postAdminApproveWithdrawal,
  postAdminPayWithdrawal,
  postAdminRejectWithdrawal,
  postMyReferralWithdrawal,
  postReferralClick,
} from './referrals.controller.js';
import {
  referralClickBodySchema,
  referralCodeParamsSchema,
  referralWithdrawalIdParamsSchema,
  referralWithdrawalListQuerySchema,
  rejectReferralWithdrawalBodySchema,
} from './referrals.validators.js';

const clickRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
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

export const referralsRouter = Router();

referralsRouter.get(
  '/resolve/:code',
  validate({ params: referralCodeParamsSchema }),
  getResolveReferral,
);
referralsRouter.post(
  '/click',
  clickRateLimiter,
  validate({ body: referralClickBodySchema }),
  postReferralClick,
);

referralsRouter.use(requireAuth);
referralsRouter.get('/me', getMyReferralDashboard);
referralsRouter.get('/withdrawals', getMyReferralWithdrawals);
referralsRouter.post('/withdrawals', postMyReferralWithdrawal);

export const platformReferralsRouter = Router();
platformReferralsRouter.use(requireAuth, requirePlatformAdmin);
platformReferralsRouter.get('/overview', getAdminReferralOverview);
platformReferralsRouter.get('/users', getAdminReferralUsers);
platformReferralsRouter.get(
  '/withdrawals',
  validate({ query: referralWithdrawalListQuerySchema }),
  getAdminReferralWithdrawals,
);
platformReferralsRouter.post(
  '/withdrawals/:id/approve',
  validate({ params: referralWithdrawalIdParamsSchema }),
  postAdminApproveWithdrawal,
);
platformReferralsRouter.post(
  '/withdrawals/:id/reject',
  validate({ params: referralWithdrawalIdParamsSchema, body: rejectReferralWithdrawalBodySchema }),
  postAdminRejectWithdrawal,
);
platformReferralsRouter.post(
  '/withdrawals/:id/pay',
  validate({ params: referralWithdrawalIdParamsSchema }),
  postAdminPayWithdrawal,
);
