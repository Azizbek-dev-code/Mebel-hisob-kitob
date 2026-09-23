import type { TelegramLinkStartResponse } from '@furniture-erp/shared';
import type { Request } from 'express';

import { ensureIdentityForUser } from '../accounts/account-layer.service.js';
import { ApiError } from '../../utils/api-error.js';
import { createPersistedLinkToken } from './telegram.linking.js';

/**
 * Resolve the authenticated Identity for Telegram linking.
 * Personal sessions carry `identityId` directly; store sessions are ensured.
 */
export async function resolveIdentityIdForTelegram(req: Request): Promise<string> {
  if (req.personalAuth?.identityId) {
    return req.personalAuth.identityId;
  }
  if (req.auth?.id) {
    return ensureIdentityForUser(req.auth.id);
  }
  throw ApiError.unauthorized('You must be signed in to do that.');
}

export async function startLinkForRequest(req: Request): Promise<TelegramLinkStartResponse> {
  const identityId = await resolveIdentityIdForTelegram(req);
  const issued = await createPersistedLinkToken(identityId);
  return {
    deepLink: issued.deepLink,
    expiresAt: issued.expiresAt.toISOString(),
  };
}
