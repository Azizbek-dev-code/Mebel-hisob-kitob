import type { Request, Response } from 'express';

import { clearAuthCookie } from '../lib/auth-cookie.js';
import * as accountDeletionService from '../services/account-deletion.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendNoContent, sendSuccess } from '../utils/http-response.js';
import type { DeleteAccountBody } from '../validators/account-deletion.validators.js';

export const deleteOwnAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const body = req.body as DeleteAccountBody;
  await accountDeletionService.deleteOwnAccount(
    { id: req.auth.id, storeId: req.auth.storeId, role: req.auth.role },
    body,
  );
  clearAuthCookie(res);
  sendNoContent(res);
});

export const listAccountDeletions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const items = await accountDeletionService.listAccountDeletions(req.auth.role);
  sendSuccess(res, { items });
});
