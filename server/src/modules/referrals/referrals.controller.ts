import { UserRole, type ReferralMeResponse, type ReferralWithdrawalDto } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ensureIdentityForUser } from '../accounts/account-layer.service.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../utils/http-response.js';
import { newVisitorKey } from './referral.service.js';
import {
  approveReferralWithdrawal,
  getMyReferral,
  getReferralAdminOverview,
  listMyReferralWithdrawals,
  listReferralAdminUsers,
  listReferralAdminWithdrawals,
  payReferralWithdrawal,
  recordReferralClick,
  rejectReferralWithdrawal,
  requestReferralWithdrawal,
  resolveReferralCode,
} from './referral.service.js';
import { readReferralAttribution, setReferralCookies } from './referral-cookie.js';
import type {
  referralClickBodySchema,
  referralCodeParamsSchema,
  referralWithdrawalListQuerySchema,
  rejectReferralWithdrawalBodySchema,
} from './referrals.validators.js';

async function requireReferralOwnerIdentity(req: Request): Promise<string> {
  if (req.personalAuth) return req.personalAuth.identityId;
  if (!req.auth) throw ApiError.unauthorized();
  if (req.auth.role !== UserRole.ADMIN && req.auth.role !== UserRole.PLATFORM_ADMIN) {
    throw ApiError.forbidden();
  }
  return ensureIdentityForUser(req.auth.id);
}

function requirePlatformActor(req: Request): { id: string; role: string } {
  if (!req.auth) throw ApiError.unauthorized();
  return { id: req.auth.id, role: req.auth.role };
}

export const getResolveReferral = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params as typeof referralCodeParamsSchema._type;
  sendSuccess(res, await resolveReferralCode(code));
});

export const postReferralClick = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body as typeof referralClickBodySchema._type;
  const existing = readReferralAttribution(req);
  const visitorKey = existing.visitorKey ?? newVisitorKey();
  let actorIdentityId: string | null = null;
  try {
    if (req.personalAuth) {
      actorIdentityId = req.personalAuth.identityId;
    } else if (req.auth && (req.auth.role === UserRole.ADMIN || req.auth.role === UserRole.PLATFORM_ADMIN)) {
      actorIdentityId = await ensureIdentityForUser(req.auth.id);
    }
  } catch {
    actorIdentityId = null;
  }
  const recorded = await recordReferralClick(code, visitorKey, { actorIdentityId });
  setReferralCookies(res, recorded.code, recorded.visitorKey);
  sendSuccess(res, { code: recorded.code });
});

export const getMyReferralDashboard = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await requireReferralOwnerIdentity(req);
  sendSuccess<ReferralMeResponse>(res, await getMyReferral(identityId));
});

export const postMyReferralWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await requireReferralOwnerIdentity(req);
  sendCreated<ReferralWithdrawalDto>(res, await requestReferralWithdrawal(identityId));
});

export const getMyReferralWithdrawals = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await requireReferralOwnerIdentity(req);
  sendSuccess(res, await listMyReferralWithdrawals(identityId));
});

export const getAdminReferralOverview = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await getReferralAdminOverview(actor.role));
});

export const getAdminReferralUsers = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await listReferralAdminUsers(actor.role));
});

export const getAdminReferralWithdrawals = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  const query = req.query as unknown as typeof referralWithdrawalListQuerySchema._type;
  sendSuccess(res, await listReferralAdminWithdrawals(actor.role, query.status));
});

export const postAdminApproveWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await approveReferralWithdrawal(actor, req.params.id as string));
});

export const postAdminRejectWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  const body = req.body as typeof rejectReferralWithdrawalBodySchema._type;
  sendSuccess(res, await rejectReferralWithdrawal(actor, req.params.id as string, body.reason));
});

export const postAdminPayWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await payReferralWithdrawal(actor, req.params.id as string));
});
