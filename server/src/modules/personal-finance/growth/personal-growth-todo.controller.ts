import type {
  CreateGrowthTodoRequest,
  GrowthTodoStatus,
  UpdateGrowthTodoRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  createGrowthTodo,
  listGrowthTodos,
  listTodayGrowthTodos,
  suggestGrowthTodo,
  updateGrowthTodo,
} from './personal-growth-todo.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getTodos = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const status = req.query.status as GrowthTodoStatus | 'OPEN' | undefined;
  sendSuccess(res, await listGrowthTodos(user.workspaceId, { status }));
});

export const getTodayTodos = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listTodayGrowthTodos(user.workspaceId));
});

export const postSuggestTodo = asyncHandler(async (req: Request, res: Response) => {
  requirePersonal(req);
  const title = String((req.body as { title?: string }).title ?? '');
  sendSuccess(res, suggestGrowthTodo(title));
});

export const postTodo = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreateGrowthTodoRequest;
  sendCreated(res, {
    todo: await createGrowthTodo(user.workspaceId, body, user.identityId),
  });
});

export const patchTodo = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as UpdateGrowthTodoRequest;
  sendSuccess(res, {
    todo: await updateGrowthTodo(
      user.workspaceId,
      String(req.params.id),
      body,
      user.identityId,
    ),
  });
});
