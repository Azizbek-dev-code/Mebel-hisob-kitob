import {
  AuditEntityType,
  AuditEventType,
  type AuthSessionListResponse,
  type CurrentUserResponse,
  type LoginResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../lib/auth-cookie.js';
import * as authService from '../services/auth.service.js';
import * as authSessions from '../services/auth-sessions.service.js';
import { recordAudit } from '../services/audit.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendNoContent, sendSuccess } from '../utils/http-response.js';
import type { LoginBody } from '../validators/auth.validators.js';
import * as accountSecurity from '../services/account-security.service.js';

function sessionMetaFrom(req: Request) {
  const forwarded = req.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null;
  return {
    userAgent: req.get('user-agent') ?? null,
    ipAddress: ip,
  };
}

function principal(req: Request) {
  const user = req.auth ?? req.personalAuth;
  if (!user) throw ApiError.unauthorized();
  return user;
}

export const postLogin = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password, rememberMe } = req.body as LoginBody;

  const { user, accessToken } = await authService.login(
    identifier,
    password,
    Boolean(rememberMe),
    sessionMetaFrom(req),
  );

  // The token only ever travels in the cookie. Putting it in the body as well
  // would invite the client to store it somewhere script can read.
  setAuthCookie(res, accessToken.token, accessToken.expiresAt);

  sendSuccess<LoginResponse>(res, { user });
});

export function getCurrentUser(req: Request, res: Response): void {
  const user = req.auth ?? req.personalAuth;
  if (!user) {
    throw ApiError.unauthorized();
  }

  sendSuccess<CurrentUserResponse>(res, { user });
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
      const { user, claims } = await authService.authenticate(token);
      if (claims.sid) {
        await authSessions.revokeAuthSession(claims.sid);
      }
      await recordAudit({
        storeId: user.storeId,
        actorUserId: 'kind' in user && user.kind === 'PERSONAL' ? null : user.id,
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

export const postChangePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = req.auth ?? req.personalAuth;
  if (!user) throw ApiError.unauthorized();
  await accountSecurity.changePasswordWithCurrent(user, req.body);
  sendNoContent(res);
});

export const postForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const email = String((req.body as { email?: string }).email ?? '');
  await accountSecurity.requestPasswordReset(email);
  sendSuccess(res, { ok: true });
});

export const postResetPassword = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.resetPasswordWithCode(req.body);
  sendSuccess(res, { ok: true });
});

export const patchMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const user = req.auth ?? req.personalAuth;
  if (!user) throw ApiError.unauthorized();
  const next = await accountSecurity.updateAccountProfile(user, req.body);
  sendSuccess<CurrentUserResponse>(res, { user: next });
});

export const getAuthSessions = asyncHandler(async (req: Request, res: Response) => {
  const user = principal(req);
  sendSuccess<AuthSessionListResponse>(
    res,
    await authSessions.listAuthSessions(user, req.authSessionId ?? null),
  );
});

export const postRevokeAuthSession = asyncHandler(async (req: Request, res: Response) => {
  const user = principal(req);
  const sessionId = String(req.params.id ?? '');
  const result = await authSessions.revokeOneSession(user, sessionId, req.authSessionId ?? null);
  if (result.revokedCurrent) {
    clearAuthCookie(res);
  }
  sendNoContent(res);
});

export const postRevokeOtherAuthSessions = asyncHandler(async (req: Request, res: Response) => {
  const user = principal(req);
  await authSessions.revokeOtherSessions(user, req.authSessionId ?? null);
  sendNoContent(res);
});

export const postRequestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.requestEmailVerification(principal(req));
  sendSuccess(res, { ok: true });
});

export const postConfirmEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.confirmEmailVerification(principal(req), String((req.body as { code?: string }).code ?? ''));
  sendSuccess(res, { ok: true });
});

export const postRequestInAppPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.requestInAppPasswordReset(principal(req));
  sendSuccess(res, { ok: true });
});

export const postConfirmInAppPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.confirmInAppPasswordReset(principal(req), req.body);
  sendSuccess(res, { ok: true });
});

export const postRequestEmailChange = asyncHandler(async (req: Request, res: Response) => {
  await accountSecurity.requestEmailChange(principal(req), req.body);
  sendSuccess(res, { ok: true });
});

export const postConfirmEmailChange = asyncHandler(async (req: Request, res: Response) => {
  const next = await accountSecurity.confirmEmailChange(principal(req), req.body);
  sendSuccess<CurrentUserResponse>(res, { user: next });
});
