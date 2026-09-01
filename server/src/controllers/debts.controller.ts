import type { AddPaymentResponse, DebtListResponse } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as debtService from '../services/debt.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type { AddPaymentBody } from '../validators/sales.validators.js';
import type { DebtListQuery } from '../validators/debts.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listDebts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as DebtListQuery;
  const result = await debtService.listDebts(user.storeId, query);
  sendSuccess<DebtListResponse>(res, result);
});

export const recordDebtPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as AddPaymentBody;
  const result = await debtService.recordDebtPayment(
    user.storeId,
    { id: user.id, role: user.role },
    id,
    body,
  );
  sendCreated<AddPaymentResponse>(res, result);
});
