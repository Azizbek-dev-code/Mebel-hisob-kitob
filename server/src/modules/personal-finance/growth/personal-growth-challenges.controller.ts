import type { CreateGrowthChallengeRequest } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  declineChallenge,
  getChallenge,
  listChallenges,
} from './personal-growth-challenges.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getChallenges = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listChallenges(user.workspaceId, user.identityId));
});

export const getChallengeById = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    challenge: await getChallenge(user.workspaceId, user.identityId, String(req.params.id)),
  });
});

export const postChallenge = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    challenge: await createChallenge(
      user.workspaceId,
      user.identityId,
      req.body as CreateGrowthChallengeRequest,
    ),
  });
});

export const postAcceptChallenge = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    challenge: await acceptChallenge(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});

export const postDeclineChallenge = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    challenge: await declineChallenge(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});

export const postCancelChallenge = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    challenge: await cancelChallenge(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});
