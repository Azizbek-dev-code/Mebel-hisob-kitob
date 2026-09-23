import type { Request, Response } from 'express';
import type { UpdateTelegramPrefsRequest } from '@furniture-erp/shared';

import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { isCronSecretAuthorized } from '../../utils/cron-secret.js';
import { sendSuccess } from '../../utils/http-response.js';
import { hydrateTelegramRuntimeFromDb } from './telegram.admin.service.js';
import { resolveIdentityIdForTelegram, startLinkForRequest } from './telegram.account.service.js';
import {
  getConnectionStatus,
  unlinkConnection,
  updateTelegramPrefs,
} from './telegram.connection.service.js';
import { runTelegramDailySummaries } from './telegram.daily-summary.service.js';
import { setTelegramWebhook } from './telegram.service.js';
import type { TelegramUpdate } from './telegram.types.js';
import { ingestTelegramWebhookUpdate } from './telegram.webhook.js';

export const postTelegramWebhook = asyncHandler(async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;
  const result = await ingestTelegramWebhookUpdate(update);
  sendSuccess(res, { accepted: result.accepted });
});

export const getTelegramStatus = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await resolveIdentityIdForTelegram(req);
  sendSuccess(res, await getConnectionStatus(identityId));
});

export const postTelegramLinkStart = asyncHandler(async (req: Request, res: Response) => {
  // Hydrate admin-saved bot username before building t.me deep-link (serverless-safe).
  await hydrateTelegramRuntimeFromDb();
  sendSuccess(res, await startLinkForRequest(req));
});

export const postTelegramUnlink = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await resolveIdentityIdForTelegram(req);
  sendSuccess(res, await unlinkConnection(identityId));
});

export const patchTelegramPrefs = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await resolveIdentityIdForTelegram(req);
  sendSuccess(res, await updateTelegramPrefs(identityId, req.body as UpdateTelegramPrefsRequest));
});

export const postTelegramSetupWebhook = asyncHandler(async (_req: Request, res: Response) => {
  await hydrateTelegramRuntimeFromDb();
  const result = await setTelegramWebhook();
  if (!result.ok) {
    throw ApiError.badRequest(
      result.reason === 'not_configured' ? 'Telegram sozlanmagan' : 'Webhook o‘rnatilmadi',
    );
  }
  const { getAdminBotStatus } = await import('./telegram.admin.service.js');
  sendSuccess(res, await getAdminBotStatus());
});

export const postTelegramDailySummaryCron = asyncHandler(async (req: Request, res: Response) => {
  if (!isCronSecretAuthorized(req)) {
    throw ApiError.unauthorized('Cron unauthorized');
  }
  const result = await runTelegramDailySummaries();
  sendSuccess(res, result);
});
