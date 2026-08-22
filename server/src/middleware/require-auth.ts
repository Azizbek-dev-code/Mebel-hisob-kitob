import { UserRole, isStoreAccessRestricted } from '@furniture-erp/shared';
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
    path.startsWith('/api/store-access/')
  );
}

function isMutating(req: Request): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
}

function allowedWithoutActiveSubscription(req: Request): boolean {
  const path = requestPath(req);
  return (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/billing') ||
    path.startsWith('/api/store-access') ||
    path.startsWith('/api/platform') ||
    path.startsWith('/api/health')
  );
}

/**
 * Gate for every route that needs a signed-in user.
 *
 * The browser router also hides protected screens, but that is only a courtesy
 * to the user: it is trivially bypassed, so the API never assumes it ran.
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
    // Drop the cookie so the browser stops replaying a token that can only fail.
    if (error instanceof ApiError && error.statusCode === 401) {
      clearAuthCookie(res);
    }
    throw error;
  }

  req.auth = session.user;

  if (isDueForRenewal(session.claims)) {
    const renewed = renewSession(session.user);
    setAuthCookie(res, renewed.token, renewed.expiresAt);
  }

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
