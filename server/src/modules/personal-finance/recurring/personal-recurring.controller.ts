import type {
  CreatePersonalRecurringRuleRequest,
  UpdatePersonalRecurringRuleRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';
import type { IdParams } from '../../../validators/common.validators.js';
import {
  acknowledgePersonalRecurringRule,
  createPersonalRecurringRule,
  listPersonalRecurringRules,
  logPersonalRecurringRule,
  updatePersonalRecurringRule,
} from './personal-recurring.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getRecurring = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listPersonalRecurringRules(user.workspaceId));
});

export const postRecurring = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalRecurringRuleRequest;
  sendCreated(res, { rule: await createPersonalRecurringRule(user.workspaceId, user.identityId, body) });
});

export const patchRecurring = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalRecurringRuleRequest;
  sendSuccess(res, {
    rule: await updatePersonalRecurringRule(user.workspaceId, user.identityId, id, body),
  });
});

export const postRecurringAck = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  sendSuccess(res, {
    rule: await acknowledgePersonalRecurringRule(user.workspaceId, user.identityId, id),
  });
});

export const postRecurringLog = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  sendSuccess(res, { rule: await logPersonalRecurringRule(user.workspaceId, user.identityId, id) });
});
