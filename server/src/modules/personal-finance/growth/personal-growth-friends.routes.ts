import { z } from 'zod';
import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getFriendSearch,
  getFriends,
  getPrivacy,
  patchPrivacy,
  postAcceptFriend,
  postBlockFriend,
  postDeclineFriend,
  postFriendRequest,
  postRemoveFriend,
} from './personal-growth-friends.controller.js';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
});

const sendRequestBodySchema = z
  .object({
    query: z.string().trim().min(2).max(120).optional(),
    identityId: z.string().trim().min(1).max(64).optional(),
  })
  .refine((body) => Boolean(body.identityId) || Boolean(body.query), {
    message: 'query yoki identityId kerak',
  });

const privacyBodySchema = z
  .object({
    handle: z.string().trim().max(24).nullable().optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    showLevel: z.boolean().optional(),
    showActivity: z.boolean().optional(),
    allowFriendRequests: z.boolean().optional(),
    onlineStatusVisibility: z.enum(['EVERYONE', 'FRIENDS', 'NOBODY']).optional(),
    lastSeenVisibility: z.enum(['EVERYONE', 'FRIENDS', 'NOBODY']).optional(),
    showInGlobalRanking: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.handle !== undefined ||
      body.bio !== undefined ||
      body.showLevel !== undefined ||
      body.showActivity !== undefined ||
      body.allowFriendRequests !== undefined ||
      body.onlineStatusVisibility !== undefined ||
      body.lastSeenVisibility !== undefined ||
      body.showInGlobalRanking !== undefined,
    { message: 'At least one field is required' },
  );

export const personalGrowthFriendsRouter = Router();
personalGrowthFriendsRouter.use(requireAuth, requirePersonalSession);

personalGrowthFriendsRouter.get('/growth/friends', getFriends);
personalGrowthFriendsRouter.get(
  '/growth/friends/search',
  validate({ query: searchQuerySchema }),
  getFriendSearch,
);
personalGrowthFriendsRouter.get('/growth/friends/privacy', getPrivacy);
personalGrowthFriendsRouter.patch(
  '/growth/friends/privacy',
  validate({ body: privacyBodySchema }),
  patchPrivacy,
);
personalGrowthFriendsRouter.post(
  '/growth/friends/request',
  validate({ body: sendRequestBodySchema }),
  postFriendRequest,
);
personalGrowthFriendsRouter.post(
  '/growth/friends/:id/accept',
  validate({ params: idParamsSchema }),
  postAcceptFriend,
);
personalGrowthFriendsRouter.post(
  '/growth/friends/:id/decline',
  validate({ params: idParamsSchema }),
  postDeclineFriend,
);
personalGrowthFriendsRouter.post(
  '/growth/friends/:id/remove',
  validate({ params: idParamsSchema }),
  postRemoveFriend,
);
personalGrowthFriendsRouter.post(
  '/growth/friends/:id/block',
  validate({ params: idParamsSchema }),
  postBlockFriend,
);
