import { createHash } from 'node:crypto';

import { ApiErrorCode } from '@furniture-erp/shared';

import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';

/**
 * Have I Been Pwned Passwords — k-anonymity range API.
 *
 * Only the first 5 hex characters of the SHA-1 digest leave this process.
 * Plaintext passwords and full hashes are never sent, logged, or cached.
 */

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range';
const HIBP_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 256;

export const COMPROMISED_PASSWORD_MESSAGE =
  "Bu parol avval ma'lumotlar sizib chiqishida aniqlangan. Iltimos, boshqa va noyob parol tanlang.";

export const PASSWORD_CHECK_UNAVAILABLE_MESSAGE =
  "Parol xavfsizligi tekshiruvi hozir bajarilmadi. Iltimos, birozdan keyin qayta urinib ko'ring.";

export class CompromisedPasswordError extends ApiError {
  constructor(message = COMPROMISED_PASSWORD_MESSAGE) {
    super(400, ApiErrorCode.BAD_REQUEST, message, [{ field: 'newPassword', message }]);
    this.name = 'CompromisedPasswordError';
  }
}

export class PasswordCheckUnavailableError extends ApiError {
  constructor(message = PASSWORD_CHECK_UNAVAILABLE_MESSAGE) {
    super(503, ApiErrorCode.BAD_REQUEST, message, [{ field: 'newPassword', message }]);
    this.name = 'PasswordCheckUnavailableError';
  }
}

/** Prefix → { body, expiresAt }. Never stores plaintext or full hashes. */
const prefixCache = new Map<string, { body: string; expiresAt: number }>();

/** Test hook: clear the in-memory prefix cache. */
export function clearCompromisedPasswordCache(): void {
  prefixCache.clear();
}

export function sha1HexUpper(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

export function splitSha1ForHibp(sha1Upper: string): { prefix: string; suffix: string } {
  return {
    prefix: sha1Upper.slice(0, 5),
    suffix: sha1Upper.slice(5),
  };
}

function readCachedPrefix(prefix: string): string | null {
  const hit = prefixCache.get(prefix);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    prefixCache.delete(prefix);
    return null;
  }
  return hit.body;
}

function writeCachedPrefix(prefix: string, body: string): void {
  if (prefixCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = prefixCache.keys().next().value;
    if (oldest) prefixCache.delete(oldest);
  }
  prefixCache.set(prefix, { body, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Parse a HIBP range response body.
 * Lines look like: `SUFFIX:COUNT` (suffix is 35 hex chars after the 5-char prefix).
 */
export function rangeResponseContainsSuffix(body: string, suffixUpper: string): boolean {
  const target = suffixUpper.toUpperCase();
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    const candidate = (colon === -1 ? line : line.slice(0, colon)).trim().toUpperCase();
    if (candidate === target) return true;
  }
  return false;
}

async function fetchHibpRange(prefix: string): Promise<string> {
  const cached = readCachedPrefix(prefix);
  if (cached != null) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'BalancySpace-PasswordCheck',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new PasswordCheckUnavailableError();
    }

    const body = await response.text();
    writeCachedPrefix(prefix, body);
    return body;
  } catch (error) {
    if (error instanceof PasswordCheckUnavailableError) throw error;
    throw new PasswordCheckUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns true when the password appears in the HIBP corpus.
 * Fail-closed callers should use {@link assertPasswordNotCompromised}.
 */
export async function isCompromisedPassword(plainText: string): Promise<boolean> {
  const digest = sha1HexUpper(plainText);
  const { prefix, suffix } = splitSha1ForHibp(digest);
  const body = await fetchHibpRange(prefix);
  return rangeResponseContainsSuffix(body, suffix);
}

/**
 * Enforce HIBP check for password create/change/reset flows.
 * Login must never call this.
 *
 * When `HIBP_PASSWORD_CHECK_ENABLED` is false (default in test), the check is skipped.
 * When enabled, API failures fail closed — password is rejected.
 */
export async function assertPasswordNotCompromised(plainText: string): Promise<void> {
  if (!env.HIBP_PASSWORD_CHECK_ENABLED) return;

  const compromised = await isCompromisedPassword(plainText);
  if (compromised) {
    throw new CompromisedPasswordError();
  }
}
