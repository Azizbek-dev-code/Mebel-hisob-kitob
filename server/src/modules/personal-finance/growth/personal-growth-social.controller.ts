import type { Request, Response } from 'express';
import {
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
} from '@furniture-erp/shared';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';

import {
  getFriendsLeaderboard,
  listFriendStreaks,
} from './personal-growth-social.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as { period?: string; metric?: string };
  const period =
    query.period === GrowthLeaderboardPeriod.MONTHLY
      ? GrowthLeaderboardPeriod.MONTHLY
      : GrowthLeaderboardPeriod.WEEKLY;
  const metric = (
    Object.values(GrowthLeaderboardMetric) as string[]
  ).includes(String(query.metric))
    ? (query.metric as (typeof GrowthLeaderboardMetric)[keyof typeof GrowthLeaderboardMetric])
    : GrowthLeaderboardMetric.XP;

  sendSuccess(
    res,
    await getFriendsLeaderboard(user.workspaceId, user.identityId, period, metric),
  );
});

export const getFriendStreaks = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listFriendStreaks(user.workspaceId, user.identityId));
});
