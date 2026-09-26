import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';

import {
  ensureCurrentMonthlyCompetition,
  finalizeMonthlyCompetition,
  getCompetitionDetailForAdmin,
  getMonthlyCompetitionOverview,
  listCompetitionsForAdmin,
  listMonthlyWinnersHistory,
  updateWinnerDeliveryStatus,
  upsertCompetitionForAdmin,
  upsertRewardForAdmin,
} from './personal-growth-competition.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

function requireAdmin(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const getMonthlyCompetition = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await getMonthlyCompetitionOverview(user.workspaceId, user.identityId));
});

export const getMonthlyWinnersHistory = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listMonthlyWinnersHistory());
});

export const adminListCompetitions = asyncHandler(async (_req: Request, res: Response) => {
  requireAdmin(_req);
  await ensureCurrentMonthlyCompetition();
  sendSuccess(res, { items: await listCompetitionsForAdmin() });
});

export const adminGetCompetition = asyncHandler(async (req: Request, res: Response) => {
  requireAdmin(req);
  sendSuccess(res, { competition: await getCompetitionDetailForAdmin(String(req.params.id)) });
});

export const adminUpsertCompetition = asyncHandler(async (req: Request, res: Response) => {
  requireAdmin(req);
  sendSuccess(res, { competition: await upsertCompetitionForAdmin(req.body) });
});

export const adminUpsertReward = asyncHandler(async (req: Request, res: Response) => {
  requireAdmin(req);
  sendSuccess(res, { reward: await upsertRewardForAdmin(String(req.params.id), req.body) });
});

export const adminFinalizeCompetition = asyncHandler(async (req: Request, res: Response) => {
  const admin = requireAdmin(req);
  sendSuccess(res, {
    competition: await finalizeMonthlyCompetition(
      String(req.params.id),
      admin.storeId ?? 'platform',
      admin.id,
    ),
  });
});

export const adminUpdateWinnerDelivery = asyncHandler(async (req: Request, res: Response) => {
  requireAdmin(req);
  sendSuccess(res, {
    winner: await updateWinnerDeliveryStatus(String(req.params.id), req.body.deliveryStatus),
  });
});
