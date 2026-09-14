import type {
  CreatePersonalDebtPaymentRequest,
  CreatePersonalDebtRequest,
  UpdatePersonalDebtRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';
import type { IdParams } from '../../../validators/common.validators.js';
import {
  addPersonalDebtPayment,
  createPersonalDebt,
  listPersonalDebts,
  updatePersonalDebt,
} from './personal-debts.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getDebts = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listPersonalDebts(user.workspaceId));
});

export const postDebt = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalDebtRequest;
  sendCreated(res, { debt: await createPersonalDebt(user.workspaceId, user.identityId, body) });
});

export const patchDebt = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalDebtRequest;
  sendSuccess(res, { debt: await updatePersonalDebt(user.workspaceId, user.identityId, id, body) });
});

export const postDebtPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as CreatePersonalDebtPaymentRequest;
  sendSuccess(res, { debt: await addPersonalDebtPayment(user.workspaceId, user.identityId, id, body) });
});
