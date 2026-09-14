import type { RequestPersonalSubscriptionBody, SelectPersonalPlanRequest } from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { uploadBillingProof } from '../../../services/billing-proof.service.js';
import { getPublicPaymentInstructions } from '../../../services/platform-billing.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';
import {
  cancelPersonalSubscriptionRequest,
  getPersonalBilling,
  listPersonalSubscriptionRequests,
  markPersonalTrialWelcomeSeen,
  requestPersonalSubscription,
  selectPersonalPlan,
} from './personal-subscription.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getBilling = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const billing = await getPersonalBilling(user.workspaceId);
  sendSuccess(res, billing);
});

export const postSelectPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as SelectPersonalPlanRequest;
  const billing = await selectPersonalPlan(user.workspaceId, user.identityId, body);
  sendSuccess(res, billing);
});

export const getPaymentInstructions = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPublicPaymentInstructions());
});

export const postPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  if (!req.file) {
    throw ApiError.validation('To‘lov chekini yuklang', [{ field: 'image', message: 'Rasm majburiy' }]);
  }
  const proof = await uploadBillingProof(`billing-proofs/workspace/${user.workspaceId}`, req.file);
  sendCreated(res, { proof });
});

export const postPaymentRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const request = await requestPersonalSubscription(
    { id: user.identityId, workspaceId: user.workspaceId },
    req.body as RequestPersonalSubscriptionBody,
  );
  sendCreated(res, { request });
});

export const getMyRequests = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await listPersonalSubscriptionRequests(user.workspaceId));
});

export const postCancelMyRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const request = await cancelPersonalSubscriptionRequest(user.workspaceId, req.params.id!);
  sendSuccess(res, { request });
});

export const postTrialWelcomeSeen = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const billing = await markPersonalTrialWelcomeSeen(user.workspaceId);
  sendSuccess(res, billing);
});
