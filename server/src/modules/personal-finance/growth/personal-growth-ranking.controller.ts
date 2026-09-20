import type { Request, Response } from 'express';
import type { GlobalLeaderboardPeriod } from '@furniture-erp/shared';

import { sendSuccess } from '../../../utils/http-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';

import {
  getGlobalRankingProfile,
  likePublicFeedback,
  listGlobalRanking,
} from './personal-growth-ranking.service.js';

export const getGlobalRanking = asyncHandler(async (req: Request, res: Response) => {
  const user = req.personalAuth!;
  const period = (req.query.period as GlobalLeaderboardPeriod | undefined) ?? undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
  sendSuccess(
    res,
    await listGlobalRanking(user.workspaceId, user.identityId, { period, page, pageSize }),
  );
});

export const getGlobalRankingProfileById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.personalAuth!;
  sendSuccess(res, {
    profile: await getGlobalRankingProfile(user.workspaceId, user.identityId, String(req.params.id)),
  });
});

export const postLikeFeedback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.personalAuth!;
  sendSuccess(res, await likePublicFeedback(user.workspaceId, user.identityId, String(req.params.id)));
});
