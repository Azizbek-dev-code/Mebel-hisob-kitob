import type {
  CheckInGrowthHabitRequest,
  CreateGrowthHabitRequest,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  checkInGrowthHabit,
  createGrowthHabit,
  getDailyGoals,
  getTodayProgress,
  listGrowthHabits,
  updateDailyGoal,
  updateGrowthHabit,
  upsertDailyGoals,
} from './personal-growth-habits.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getHabits = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const includeArchived =
    String((req.query as { includeArchived?: string }).includeArchived ?? '') === 'true';
  sendSuccess(res, await listGrowthHabits(user.workspaceId, { includeArchived }));
});

export const postHabit = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    habit: await createGrowthHabit(
      user.workspaceId,
      user.identityId,
      req.body as CreateGrowthHabitRequest,
    ),
  });
});

export const patchHabit = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await updateGrowthHabit(
      user.workspaceId,
      String(req.params.id),
      user.identityId,
      req.body as UpdateGrowthHabitRequest,
    ),
  });
});

export const postHabitCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await checkInGrowthHabit(
      user.workspaceId,
      String(req.params.id),
      req.body as CheckInGrowthHabitRequest,
      user.identityId,
    ),
  });
});

export const getDailyGoalsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const dayKey = (req.query as { dayKey?: string }).dayKey;
  sendSuccess(res, await getDailyGoals(user.workspaceId, dayKey));
});

export const putDailyGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await upsertDailyGoals(user.workspaceId, req.body as UpsertGrowthDailyGoalsRequest));
});

export const patchDailyGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    goal: await updateDailyGoal(
      user.workspaceId,
      String(req.params.id),
      req.body as UpdateGrowthDailyGoalRequest,
      user.identityId,
    ),
  });
});

export const getTodayProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { progress: await getTodayProgress(user.workspaceId) });
});
