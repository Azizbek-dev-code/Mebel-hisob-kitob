import { AuditEntityType, AuditEventType, type AuthUser } from '@furniture-erp/shared';

import {
  type IssuedAccessToken,
  signAccessToken,
  type VerifiedAccessToken,
  verifyAccessToken,
} from '../lib/jwt.js';
import { equaliseVerificationCost, verifyPassword } from '../lib/password.js';
import {
  findActiveUserById,
  findSignInCandidate,
  recordSuccessfulLogin,
  toAuthUser,
} from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { recordAudit } from './audit.service.js';

export interface AuthenticatedSession {
  user: AuthUser;
  accessToken: IssuedAccessToken;
}

/**
 * One message for every rejection. Telling the caller which half was wrong turns
 * the login form into an account directory.
 */
function invalidCredentials(): ApiError {
  return ApiError.unauthorized('Incorrect username or password.');
}

export async function login(identifier: string, password: string): Promise<AuthenticatedSession> {
  const candidate = await findSignInCandidate(identifier);

  if (!candidate) {
    await equaliseVerificationCost(password);
    throw invalidCredentials();
  }

  if (!(await verifyPassword(password, candidate.passwordHash))) {
    // Only recordable because the account exists: an audit row needs a store, and
    // a wrong identifier belongs to no store. The attempted password is never
    // part of the metadata.
    await recordAudit({
      storeId: candidate.storeId,
      actorUserId: candidate.id,
      eventType: AuditEventType.FAILED_LOGIN,
      entityType: AuditEntityType.SESSION,
      entityId: candidate.id,
      summary: `Failed sign-in attempt for ${candidate.username}`,
      metadata: { username: candidate.username },
    });
    throw invalidCredentials();
  }

  const user = toAuthUser(candidate);

  // A failure here means the login still succeeded; the last-seen timestamp is
  // reporting data, not an authorisation decision, so it must not block sign-in.
  try {
    await recordSuccessfulLogin(user.id);
  } catch (error) {
    logger.warn('Could not record last login time', {
      userId: user.id,
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }

  await recordAudit({
    storeId: user.storeId,
    actorUserId: user.id,
    eventType: AuditEventType.LOGIN,
    entityType: AuditEntityType.SESSION,
    entityId: user.id,
    summary: `Signed in ${user.username ?? user.fullName}`,
    metadata: { username: user.username },
  });

  return {
    user,
    accessToken: signAccessToken({ sub: user.id, storeId: user.storeId, role: user.role }),
  };
}

/**
 * Resolves a session cookie to the current principal.
 *
 * The user is re-read on every request rather than trusted from the token, so
 * deactivating an account or changing a role locks the session out at once
 * instead of at the next expiry.
 *
 * @throws {ApiError} 401 when the token or the account behind it is not usable.
 */
export async function authenticate(
  token: string,
): Promise<{ user: AuthUser; claims: VerifiedAccessToken }> {
  let claims: VerifiedAccessToken;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const record = await findActiveUserById(claims.sub);
  if (!record) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  return { user: toAuthUser(record), claims };
}

/**
 * Whether an in-flight session is old enough to be handed a fresh token.
 *
 * Access tokens are deliberately short-lived, which on its own would sign a
 * cashier out mid-shift. Re-issuing once a token is past halfway keeps someone
 * who is actively working signed in while an abandoned session still dies within
 * one token lifetime.
 */
export function isDueForRenewal(claims: VerifiedAccessToken, now = Date.now()): boolean {
  const lifetimeMs = claims.expiresAt.getTime() - claims.issuedAt.getTime();
  if (lifetimeMs <= 0) return false;
  return now - claims.issuedAt.getTime() >= lifetimeMs / 2;
}

export function renewSession(user: AuthUser): IssuedAccessToken {
  return signAccessToken({ sub: user.id, storeId: user.storeId, role: user.role });
}
