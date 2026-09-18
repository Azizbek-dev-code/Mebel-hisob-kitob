import { AuthSessionKind, UserRole, isStoreAccessRestricted } from '@furniture-erp/shared';
import type { Request, RequestHandler } from 'express';

import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../lib/auth-cookie.js';
import { authenticate, isDueForRenewal, renewSession } from '../services/auth.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || '';
  const q = raw.indexOf('?');
  return q === -1 ? raw : raw.slice(0, q);
}

function allowedWhileStoreBlocked(req: Request): boolean {
  const path = requestPath(req);
  return (
    path === '/api/auth/me' ||
    path === '/api/auth/logout' ||
    path === '/api/store-access' ||
    path.startsWith('/api/store-access/') ||
    path.startsWith('/api/accounts') ||
    path.startsWith('/api/onboarding') ||
    path.startsWith('/api/referrals')
  );
}

function isMutating(req: Request): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
}

function allowedWithoutActiveSubscription(req: Request): boolean {
  const path = requestPath(req);
  return (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/accounts') ||
    path.startsWith('/api/onboarding') ||
    path.startsWith('/api/billing') ||
    path.startsWith('/api/store-access') ||
    path.startsWith('/api/platform') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/referrals')
  );
}

function allowedForPersonalSession(req: Request): boolean {
  const path = requestPath(req);
  return (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/accounts') ||
    path.startsWith('/api/onboarding') ||
    path.startsWith('/api/personal') ||
    path.startsWith('/api/referrals')
  );
}

function allowedPersonalWithoutSubscription(req: Request): boolean {
  const path = requestPath(req);
  return (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/accounts') ||
    path.startsWith('/api/personal/billing') ||
    path.startsWith('/api/onboarding') ||
    path.startsWith('/api/referrals')
  );
}

/**
 * Gate for every route that needs a signed-in user.
 *
 * Store sessions keep the existing ERP gates. Personal sessions cannot reach
 * store ERP routes; store `canWrite` is never applied to `/api/personal`.
 */
export const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  const token = readAuthCookie(req);

  if (!token) {
    throw ApiError.unauthorized('You must be signed in to do that.');
  }

  let session: Awaited<ReturnType<typeof authenticate>>;
  try {
    session = await authenticate(token);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearAuthCookie(res);
    }
    throw error;
  }

  if (isDueForRenewal(session.claims)) {
    const renewed = renewSession(session.user, session.claims.rememberMe);
    setAuthCookie(res, renewed.token, renewed.expiresAt);
  }

  if (session.kind === AuthSessionKind.PERSONAL) {
    req.personalAuth = session.user;
    if (!allowedForPersonalSession(req)) {
      throw ApiError.forbidden('Shaxsiy sessiya do‘kon ERP marshrutlariga kira olmaydi.');
    }
    if (
      isMutating(req) &&
      !allowedPersonalWithoutSubscription(req) &&
      !session.user.subscription.canWrite
    ) {
      throw ApiError.subscriptionRequired();
    }
    next();
    return;
  }

  req.auth = session.user;

  if (isStoreAccessRestricted(session.user) && !allowedWhileStoreBlocked(req)) {
    throw ApiError.storeBlocked();
  }

  if (
    isMutating(req) &&
    session.user.role !== UserRole.PLATFORM_ADMIN &&
    !allowedWithoutActiveSubscription(req) &&
    session.user.subscription &&
    !session.user.subscription.canWrite
  ) {
    throw ApiError.subscriptionRequired();
  }

  next();
});

/**
 * Attach a session when a cookie is present, but never fail for anonymous callers.
 * Used by public referral click so self-referral can be blocked for signed-in owners.
 */
export const optionalAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  const token = readAuthCookie(req);
  if (!token) {
    next();
    return;
  }

  try {
    const session = await authenticate(token);
    if (session.kind === AuthSessionKind.PERSONAL) {
      req.personalAuth = session.user;
    } else {
      req.auth = session.user;
    }
  } catch {
    /* keep the route public — invalid cookies must not block referral click */
  }

  next();
});
