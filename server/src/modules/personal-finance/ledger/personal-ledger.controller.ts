import type {
  CreatePersonalCategoryRequest,
  CreatePersonalEntryRequest,
  CreatePersonalTransferRequest,
  CreatePersonalWalletRequest,
  PersonalCategoryKind,
  PersonalEntryListQuery,
  PersonalHistoryListQuery,
  PersonalTransferListQuery,
  UpdatePersonalCategoryRequest,
  UpdatePersonalEntryRequest,
  UpdatePersonalWalletRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/http-response.js';
import type { IdParams } from '../../../validators/common.validators.js';
import {
  cancelPersonalEntry,
  cancelPersonalTransfer,
  createPersonalCategory,
  createPersonalEntry,
  createPersonalTransfer,
  createPersonalWallet,
  getPersonalSummary,
  listPersonalCategories,
  listPersonalEntries,
  listPersonalHistory,
  listPersonalTransfers,
  listPersonalWallets,
  updatePersonalCategory,
  updatePersonalEntry,
  updatePersonalWallet,
} from './personal-ledger.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await getPersonalSummary(user.workspaceId));
});

export const getWallets = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { items: await listPersonalWallets(user.workspaceId) });
});

export const postWallet = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalWalletRequest;
  sendCreated(res, { wallet: await createPersonalWallet(user.workspaceId, user.identityId, body) });
});

export const patchWallet = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalWalletRequest;
  sendSuccess(res, { wallet: await updatePersonalWallet(user.workspaceId, id, body) });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const kind = req.query.kind as PersonalCategoryKind | undefined;
  sendSuccess(res, { items: await listPersonalCategories(user.workspaceId, kind) });
});

export const postCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalCategoryRequest;
  sendCreated(res, { category: await createPersonalCategory(user.workspaceId, body) });
});

export const patchCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalCategoryRequest;
  sendSuccess(res, { category: await updatePersonalCategory(user.workspaceId, id, body) });
});

export const getEntries = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as unknown as PersonalEntryListQuery;
  const result = await listPersonalEntries(user.workspaceId, query);
  sendPaginated(res, result.items, result.meta);
});

export const postEntry = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalEntryRequest;
  sendCreated(res, { entry: await createPersonalEntry(user.workspaceId, user.identityId, body) });
});

export const patchEntry = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdatePersonalEntryRequest;
  sendSuccess(res, {
    entry: await updatePersonalEntry(user.workspaceId, user.identityId, id, body),
  });
});

export const postCancelEntry = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  sendSuccess(res, {
    entry: await cancelPersonalEntry(user.workspaceId, user.identityId, id),
  });
});

export const getTransfers = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as unknown as PersonalTransferListQuery;
  const result = await listPersonalTransfers(user.workspaceId, query);
  sendPaginated(res, result.items, result.meta);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as unknown as PersonalHistoryListQuery;
  sendSuccess(res, await listPersonalHistory(user.workspaceId, query));
});

export const postTransfer = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreatePersonalTransferRequest;
  sendCreated(res, {
    transfer: await createPersonalTransfer(user.workspaceId, user.identityId, body),
  });
});

export const postCancelTransfer = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const { id } = req.params as IdParams;
  sendSuccess(res, {
    transfer: await cancelPersonalTransfer(user.workspaceId, user.identityId, id),
  });
});
