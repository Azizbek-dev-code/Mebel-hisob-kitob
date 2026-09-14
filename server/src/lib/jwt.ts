import { type AccessTokenPayload, AuthSessionKind, UserRole } from '@furniture-erp/shared';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

/** Rejects a token minted by an unrelated service that happens to share a secret. */
const TOKEN_ISSUER = 'furniture-erp';
const TOKEN_AUDIENCE = 'furniture-erp-web';

export interface IssuedAccessToken {
  token: string;
  /** Taken from the token's own `exp`, so the cookie and the token cannot disagree. */
  expiresAt: Date;
}

export type VerifiedAccessToken = {
  sub: string;
  issuedAt: Date;
  expiresAt: Date;
} & (
  | {
      ctx: typeof AuthSessionKind.STORE;
      storeId: string;
      role: UserRole;
      workspaceId?: undefined;
    }
  | {
      ctx: typeof AuthSessionKind.PERSONAL;
      workspaceId: string;
      storeId?: undefined;
      role?: undefined;
    }
);

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid access token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export function signAccessToken(payload: AccessTokenPayload): IssuedAccessToken {
  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    // The env value is a free-form duration string ("15m", "7d"); the published
    // types narrow it to a literal union that a validated string cannot satisfy.
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });

  const decoded = jwt.decode(token);
  if (typeof decoded !== 'object' || decoded === null || typeof decoded.exp !== 'number') {
    throw new Error('Signed access token is missing an expiry claim');
  }

  return { token, expiresAt: new Date(decoded.exp * 1000) };
}

/**
 * Verifies the signature and expiry, then checks the claims are the shape this
 * version of the API expects. A token signed by us but predating a claim change
 * must be rejected rather than silently producing `undefined` fields.
 *
 * Store tokens minted before Personal sessions omit `ctx` and still require
 * `storeId` + `role`. Personal tokens set `ctx: 'PERSONAL'` and never carry storeId.
 *
 * @throws {InvalidTokenError} for any token that must not be trusted.
 */
export function verifyAccessToken(token: string): VerifiedAccessToken {
  let claims: unknown;
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
  } catch {
    throw new InvalidTokenError();
  }

  if (typeof claims !== 'object' || claims === null) {
    throw new InvalidTokenError();
  }

  const raw = claims as Record<string, unknown>;
  const { sub, storeId, role, iat, exp, ctx, workspaceId } = raw;

  if (typeof sub !== 'string' || typeof iat !== 'number' || typeof exp !== 'number') {
    throw new InvalidTokenError('Access token claims are malformed');
  }

  const issuedAt = new Date(iat * 1000);
  const expiresAt = new Date(exp * 1000);

  if (ctx === AuthSessionKind.PERSONAL) {
    if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
      throw new InvalidTokenError('Access token claims are malformed');
    }
    return { sub, ctx: AuthSessionKind.PERSONAL, workspaceId, issuedAt, expiresAt };
  }

  if (
    typeof storeId !== 'string' ||
    typeof role !== 'string' ||
    !isUserRole(role)
  ) {
    throw new InvalidTokenError('Access token claims are malformed');
  }

  return { sub, ctx: AuthSessionKind.STORE, storeId, role, issuedAt, expiresAt };
}

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}
