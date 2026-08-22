import type { Request, Response } from 'express';

import * as storeBilling from '../services/store-billing.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { RequestStoreSubscriptionBody } from '@furniture-erp/shared';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const getBillingPlans = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await storeBilling.listStorePlans());
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, { subscription: await storeBilling.getStoreSubscription(user.storeId) });
});

export const postTrialWelcomeSeen = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, { subscription: await storeBilling.markTrialWelcomeSeen(user.storeId) });
});

export const postPaymentRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const request = await storeBilling.requestStoreSubscription(
    user,
    req.body as RequestStoreSubscriptionBody,
  );
  sendCreated(res, { request });
});
