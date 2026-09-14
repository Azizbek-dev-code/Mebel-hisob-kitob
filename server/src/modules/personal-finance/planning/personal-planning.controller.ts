import type {
  CreatePersonalBudgetRequest,
  CreatePersonalGoalContributionRequest,
  CreatePersonalSavingGoalRequest,
  UpdatePersonalBudgetRequest,
  UpdatePersonalSavingGoalRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';
import type { IdParams } from '../../../validators/common.validators.js';
import {
  addPersonalGoalContribution,
  createPersonalBudget,
  createPersonalSavingGoal,
  listPersonalBudgets,
  listPersonalSavingGoals,
  updatePersonalBudget,
  updatePersonalSavingGoal,
} from './personal-planning.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { items: await listPersonalBudgets(user.workspaceId) });
});

export const postBudget = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalBudgetRequest;
  sendCreated(res, { budget: await createPersonalBudget(user.workspaceId, user.identityId, body) });
});

export const patchBudget = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalBudgetRequest;
  sendSuccess(res, {
    budget: await updatePersonalBudget(user.workspaceId, id, user.identityId, body),
  });
});

export const getGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { items: await listPersonalSavingGoals(user.workspaceId) });
});

export const postGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalSavingGoalRequest;
  sendCreated(res, { goal: await createPersonalSavingGoal(user.workspaceId, user.identityId, body) });
});

export const patchGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalSavingGoalRequest;
  sendSuccess(res, {
    goal: await updatePersonalSavingGoal(user.workspaceId, id, user.identityId, body),
  });
});

export const postGoalContribution = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as CreatePersonalGoalContributionRequest;
  sendSuccess(res, {
    goal: await addPersonalGoalContribution(user.workspaceId, id, user.identityId, body),
  });
});
