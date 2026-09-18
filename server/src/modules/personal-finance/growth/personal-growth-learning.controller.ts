import type {
  CreateGrowthLearningGoalRequest,
  CreateGrowthLearningMilestoneRequest,
  LogGrowthLearningSessionRequest,
  UpdateGrowthLearningGoalRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  addLearningMilestone,
  createLearningGoal,
  getLearningStats,
  listLearningGoals,
  logLearningSession,
  updateLearningGoal,
} from './personal-growth-learning.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getLearningGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const includeArchived =
    String((req.query as { includeArchived?: string }).includeArchived ?? '') === 'true';
  sendSuccess(res, await listLearningGoals(user.workspaceId, { includeArchived }));
});

export const getLearningStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { stats: await getLearningStats(user.workspaceId) });
});

export const postLearningGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    goal: await createLearningGoal(
      user.workspaceId,
      user.identityId,
      req.body as CreateGrowthLearningGoalRequest,
    ),
  });
});

export const patchLearningGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    goal: await updateLearningGoal(
      user.workspaceId,
      String(req.params.id),
      req.body as UpdateGrowthLearningGoalRequest,
      user.identityId,
    ),
  });
});

export const postLearningSession = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    ...(await logLearningSession(
      user.workspaceId,
      user.identityId,
      req.body as LogGrowthLearningSessionRequest,
    )),
  });
});

export const postLearningMilestone = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    goal: await addLearningMilestone(
      user.workspaceId,
      String(req.params.id),
      req.body as CreateGrowthLearningMilestoneRequest,
      user.identityId,
    ),
  });
});
