import type { CookieOptions, Request, Response } from 'express';

import { env } from '../../config/env.js';

export const REFERRAL_CODE_COOKIE = 'furniture_erp_ref';
export const REFERRAL_VISITOR_COOKIE = 'furniture_erp_ref_vid';
const REFERRAL_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function referralCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE_MS,
  };
}

function readCookie(req: Request, name: string): string | null {
  const value: unknown = req.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function readReferralAttribution(req: Request): {
  code: string | null;
  visitorKey: string | null;
} {
  return {
    code: readCookie(req, REFERRAL_CODE_COOKIE),
    visitorKey: readCookie(req, REFERRAL_VISITOR_COOKIE),
  };
}

export function setReferralCookies(res: Response, code: string, visitorKey: string): void {
  const options = referralCookieOptions();
  res.cookie(REFERRAL_CODE_COOKIE, code, options);
  res.cookie(REFERRAL_VISITOR_COOKIE, visitorKey, options);
}
