import { timingSafeEqual } from 'node:crypto';

import type { Request } from 'express';

import { env } from '../config/env.js';

export function secretsMatch(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Vercel Cron: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`. */
export function isCronSecretAuthorized(req: Request, expected = env.CRON_SECRET?.trim()): boolean {
  if (!expected) return false;
  const bearer = req.header('authorization');
  const token = bearer?.toLowerCase().startsWith('bearer ') ? bearer.slice(7).trim() : undefined;
  const header = req.header('x-cron-secret')?.trim();
  return secretsMatch(token, expected) || secretsMatch(header, expected);
}
