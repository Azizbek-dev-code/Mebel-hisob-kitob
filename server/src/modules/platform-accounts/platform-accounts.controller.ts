import type {
  PlatformAccountDetailResponse,
  PlatformAccountListResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/http-response.js';

import * as platformAccountsService from './platform-accounts.service.js';
import type { PlatformAccountListQueryInput } from './platform-accounts.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const listPlatformAccounts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as PlatformAccountListQueryInput;
  const result = await platformAccountsService.listPlatformAccounts(user.role, query);
  sendSuccess<PlatformAccountListResponse>(res, result);
});

export const getPlatformAccount = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await platformAccountsService.getPlatformAccount(user.role, req.params.id!);
  sendSuccess<PlatformAccountDetailResponse>(res, result);
});
