import type { CookieOptions, Request, Response } from 'express';

import { env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'furniture_erp_session';

/**
 * `httpOnly` is the point of the whole design: script on the page can never read
 * the token, so an XSS bug cannot walk away with a session.
 *
 * Default `sameSite: 'lax'` assumes the SPA and API share a site (Vite proxies
 * `/api` in development; production can use Vercel rewrites to the same origin).
 * For a split deploy (Vercel SPA → Render API) set `COOKIE_SAME_SITE=none` and
 * `COOKIE_SECURE=true` so credentialed cross-origin requests keep the cookie.
 */
function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(AUTH_COOKIE_NAME, token, { ...authCookieOptions(), expires: expiresAt });
}

/** Attributes must match the ones used to set it, or the browser keeps the cookie. */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
}

export function readAuthCookie(req: Request): string | null {
  const value: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
