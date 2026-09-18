import {
  GROWTH_CHALLENGE_KINDS,
  GROWTH_CHALLENGE_METRICS,
} from '@furniture-erp/shared';
import { z } from 'zod';
import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getChallengeById,
  getChallenges,
  postAcceptChallenge,
  postCancelChallenge,
  postChallenge,
  postDeclineChallenge,
} from './personal-growth-challenges.controller.js';

const createBodySchema = z
  .object({
    kind: z.enum(GROWTH_CHALLENGE_KINDS as [string, ...string[]]),
    title: z.string().trim().min(2).max(120),
    metric: z.enum(GROWTH_CHALLENGE_METRICS as [string, ...string[]]),
    durationDays: z.number().int().min(1).max(30),
    inviteeIds: z.array(z.string().trim().min(1).max(64)).min(1).max(9),
    targetValue: z.number().int().min(1).max(1_000_000).nullable().optional(),
    rewardXp: z.number().int().min(0).max(200).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.kind === 'FIGHT' && body.inviteeIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fight requires exactly one opponent',
        path: ['inviteeIds'],
      });
    }
    if (body.kind === 'GROUP' && (body.inviteeIds.length < 2 || body.inviteeIds.length > 9)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Group requires 2–9 invitees',
        path: ['inviteeIds'],
      });
    }
    if (body.kind === 'GROUP' && (body.targetValue == null || body.targetValue < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Group requires targetValue',
        path: ['targetValue'],
      });
    }
  });

export const personalGrowthChallengesRouter = Router();
personalGrowthChallengesRouter.use(requireAuth, requirePersonalSession);

personalGrowthChallengesRouter.get('/growth/challenges', getChallenges);
personalGrowthChallengesRouter.post(
  '/growth/challenges',
  validate({ body: createBodySchema }),
  postChallenge,
);
personalGrowthChallengesRouter.get(
  '/growth/challenges/:id',
  validate({ params: idParamsSchema }),
  getChallengeById,
);
personalGrowthChallengesRouter.post(
  '/growth/challenges/:id/accept',
  validate({ params: idParamsSchema }),
  postAcceptChallenge,
);
personalGrowthChallengesRouter.post(
  '/growth/challenges/:id/decline',
  validate({ params: idParamsSchema }),
  postDeclineChallenge,
);
personalGrowthChallengesRouter.post(
  '/growth/challenges/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelChallenge,
);
