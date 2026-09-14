import type { Request, Response } from 'express';

import * as storeBilling from '../services/store-billing.service.js';
import { uploadBillingProof } from '../services/billing-proof.service.js';
import { getPublicPaymentInstructions } from '../services/platform-billing.service.js';
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

export const getPaymentInstructions = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPublicPaymentInstructions());
});

export const postPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!req.file) {
    throw ApiError.validation('To‘lov chekini yuklang', [{ field: 'image', message: 'Rasm majburiy' }]);
  }
  const proof = await uploadBillingProof(`billing-proofs/store/${user.storeId}`, req.file);
  sendCreated(res, { proof });
});

export const postPaymentRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const request = await storeBilling.requestStoreSubscription(
    user,
    req.body as RequestStoreSubscriptionBody,
  );
  sendCreated(res, { request });
});

export const getMySubscriptionRequests = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, await storeBilling.listMySubscriptionRequests(user));
});

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, await storeBilling.listMyPayments(user));
});

export const postCancelMyRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const request = await storeBilling.cancelMySubscriptionRequest(user, req.params.id!);
  sendSuccess(res, { request });
});
