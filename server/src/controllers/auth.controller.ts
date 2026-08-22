import {
  AuditEntityType,
  AuditEventType,
  type CurrentUserResponse,
  type LoginResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../lib/auth-cookie.js';
import * as authService from '../services/auth.service.js';
import { recordAudit } from '../services/audit.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendNoContent, sendSuccess } from '../utils/http-response.js';
import type { LoginBody } from '../validators/auth.validators.js';

export const postLogin = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body as LoginBody;

  const { user, accessToken } = await authService.login(identifier, password);

  // The token only ever travels in the cookie. Putting it in the body as well
  // would invite the client to store it somewhere script can read.
  setAuthCookie(res, accessToken.token, accessToken.expiresAt);

  sendSuccess<LoginResponse>(res, { user });
});

export function getCurrentUser(req: Request, res: Response): void {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }

  sendSuccess<CurrentUserResponse>(res, { user: req.auth });
}

/**
 * Deliberately unauthenticated: signing out has to work even when the token has
 * already expired, and the only effect is removing the caller's own cookie.
 * When the cookie is still valid we record a LOGOUT row before clearing it.
 */
export const postLogout = asyncHandler(async (req: Request, res: Response) => {
  const token = readAuthCookie(req);
  if (token) {
    try {
      const { user } = await authService.authenticate(token);
      await recordAudit({
        storeId: user.storeId,
        actorUserId: user.id,
        eventType: AuditEventType.LOGOUT,
        entityType: AuditEntityType.SESSION,
        entityId: user.id,
        summary: `Signed out ${user.username ?? user.fullName}`,
        metadata: { username: user.username },
      });
    } catch {
      // Expired or invalid session — still clear the cookie.
    }
  }

  clearAuthCookie(res);
  sendNoContent(res);
});
