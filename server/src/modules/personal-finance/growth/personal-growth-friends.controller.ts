import type {
  SendFriendRequestBody,
  UpdateGrowthSocialPrivacyRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  acceptFriendRequest,
  blockFriendship,
  declineFriendRequest,
  getSocialPrivacy,
  listFriends,
  removeFriendship,
  searchFriends,
  sendFriendRequest,
  updateSocialPrivacy,
} from './personal-growth-friends.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getFriends = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listFriends(user.workspaceId, user.identityId));
});

export const getFriendSearch = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const q = String((req.query as { q?: string }).q ?? '');
  sendSuccess(res, await searchFriends(user.workspaceId, user.identityId, q));
});

export const postFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    friendship: await sendFriendRequest(
      user.workspaceId,
      user.identityId,
      req.body as SendFriendRequestBody,
    ),
  });
});

export const postAcceptFriend = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    friendship: await acceptFriendRequest(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});

export const postDeclineFriend = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    friendship: await declineFriendRequest(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});

export const postRemoveFriend = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  await removeFriendship(user.workspaceId, user.identityId, String(req.params.id));
  sendSuccess(res, { ok: true });
});

export const postBlockFriend = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    friendship: await blockFriendship(
      user.workspaceId,
      user.identityId,
      String(req.params.id),
    ),
  });
});

export const getPrivacy = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { privacy: await getSocialPrivacy(user.workspaceId, user.identityId) });
});

export const patchPrivacy = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    privacy: await updateSocialPrivacy(
      user.workspaceId,
      user.identityId,
      req.body as UpdateGrowthSocialPrivacyRequest,
    ),
  });
});
