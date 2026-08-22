import type {
  ApproveStoreCreationResponse,
  CreateStoreRequestResponse,
  RejectStoreCreationResponse,
  StoreCreationPendingSummary,
  StoreCreationRequestDetailResponse,
  StoreCreationRequestListResponse,
  StoreCreationRequestStatusResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as storeCreationService from '../services/store-creation.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type {
  CreateStoreRequestBody,
  RejectStoreCreationBody,
  StoreCreationRequestListQuery,
} from '../validators/store-creation.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const postStoreRequest = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateStoreRequestBody;
  const request = await storeCreationService.createStoreRequest(body);
  sendCreated<CreateStoreRequestResponse>(res, { request });
});

export const getPublicStoreRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as IdParams;
  const request = await storeCreationService.getPublicStoreRequest(id);
  sendSuccess<StoreCreationRequestStatusResponse>(res, { request });
});

export const listStoreRequests = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as StoreCreationRequestListQuery;
  const result = await storeCreationService.listStoreRequests({
    actorRole: user.role,
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
  });
  sendSuccess<StoreCreationRequestListResponse>(res, result);
});

export const getStoreRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const request = await storeCreationService.getStoreRequestForAdmin(user.role, id);
  sendSuccess<StoreCreationRequestDetailResponse>(res, { request });
});

export const getStoreRequestSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const summary = await storeCreationService.getPendingSummary(user.role);
  sendSuccess<StoreCreationPendingSummary>(res, summary);
});

export const postApproveStoreRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const result = await storeCreationService.approveStoreRequest(user, id);
  sendSuccess<ApproveStoreCreationResponse>(res, result);
});

export const postRejectStoreRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as RejectStoreCreationBody;
  const request = await storeCreationService.rejectStoreRequest(user, id, body.reason);
  sendSuccess<RejectStoreCreationResponse>(res, { request });
});
