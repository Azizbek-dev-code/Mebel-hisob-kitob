import {
  AuditEntityType,
  AuditEventType,
  AuthSessionKind,
  WorkspaceStatus,
  WorkspaceType,
  isPersonalAuth,
  type AuthPrincipal,
  type AuthUser,
  type PersonalAuthUser,
} from '@furniture-erp/shared';

import {
  type IssuedAccessToken,
  signAccessToken,
  type VerifiedAccessToken,
  verifyAccessToken,
} from '../lib/jwt.js';
import { equaliseVerificationCost, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import {
  findActiveUserById,
  findSignInCandidate,
  recordSuccessfulLogin,
  toAuthUser,
} from '../repositories/user.repository.js';
import {
  findPersonalSignInCandidate,
  loadPersonalAuthUser,
} from '../modules/personal-finance/billing/personal-subscription.service.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { recordAudit } from './audit.service.js';

export interface StoreAuthenticatedSession {
  kind: typeof AuthSessionKind.STORE;
  user: AuthUser;
  accessToken: IssuedAccessToken;
}

export interface PersonalAuthenticatedSession {
  kind: typeof AuthSessionKind.PERSONAL;
  user: PersonalAuthUser;
  accessToken: IssuedAccessToken;
}

export type AuthenticatedSession = StoreAuthenticatedSession | PersonalAuthenticatedSession;

export type ResolvedSession =
  | { kind: typeof AuthSessionKind.STORE; user: AuthUser; claims: VerifiedAccessToken }
  | { kind: typeof AuthSessionKind.PERSONAL; user: PersonalAuthUser; claims: VerifiedAccessToken };

/**
 * One message for every rejection. Telling the caller which half was wrong turns
 * the login form into an account directory.
 */
function invalidCredentials(): ApiError {
  return ApiError.unauthorized('Incorrect username or password.');
}

function signStoreToken(user: AuthUser): IssuedAccessToken {
  return signAccessToken({ sub: user.id, storeId: user.storeId, role: user.role });
}

function signPersonalToken(user: PersonalAuthUser): IssuedAccessToken {
  return signAccessToken({
    sub: user.identityId,
    ctx: AuthSessionKind.PERSONAL,
    workspaceId: user.workspaceId,
  });
}

export async function issuePersonalSession(
  identityId: string,
  workspaceId: string,
): Promise<PersonalAuthenticatedSession> {
  const user = await loadPersonalAuthUser(identityId, workspaceId);
  return { kind: AuthSessionKind.PERSONAL, user, accessToken: signPersonalToken(user) };
}

export async function issueStoreSession(userId: string): Promise<StoreAuthenticatedSession> {
  const record = await findActiveUserById(userId);
  if (!record) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }
  const user = toAuthUser(record);
  return { kind: AuthSessionKind.STORE, user, accessToken: signStoreToken(user) };
}

export async function switchWorkspace(
  identityId: string,
  workspaceId: string,
): Promise<AuthenticatedSession> {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { identityId_workspaceId: { identityId, workspaceId } },
    include: {
      workspace: {
        select: { id: true, type: true, status: true, storeId: true, name: true },
      },
    },
  });
  if (!membership || membership.workspace.status !== WorkspaceStatus.ACTIVE) {
    throw ApiError.forbidden('Bu ish joyiga o‘tib bo‘lmaydi.');
  }

  if (membership.workspace.type === WorkspaceType.PERSONAL) {
    if (membership.workspace.storeId !== null) {
      throw ApiError.forbidden('Bu ish joyiga o‘tib bo‘lmaydi.');
    }
    const session = await issuePersonalSession(identityId, workspaceId);
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.PERSONAL_WORKSPACE_SWITCHED,
      entityType: AuditEntityType.WORKSPACE,
      entityId: workspaceId,
      summary: `Switched to personal workspace ${membership.workspace.name}`,
      metadata: { identityId, workspaceId, type: WorkspaceType.PERSONAL },
    });
    return session;
  }

  if (!membership.workspace.storeId) {
    throw ApiError.forbidden('Bu ish joyiga o‘tib bo‘lmaydi.');
  }

  const storeUser = await prisma.user.findFirst({
    where: {
      identityId,
      storeId: membership.workspace.storeId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!storeUser) {
    throw ApiError.forbidden('Bu do‘kon sessiyasiga o‘tib bo‘lmaydi.');
  }

  const session = await issueStoreSession(storeUser.id);
  await recordAudit({
    storeId: membership.workspace.storeId,
    actorUserId: storeUser.id,
    eventType: AuditEventType.PERSONAL_WORKSPACE_SWITCHED,
    entityType: AuditEntityType.WORKSPACE,
    entityId: workspaceId,
    summary: `Switched to store workspace ${membership.workspace.name}`,
    metadata: { identityId, workspaceId, type: WorkspaceType.BUSINESS },
  });
  return session;
}

export async function login(identifier: string, password: string): Promise<AuthenticatedSession> {
  const candidate = await findSignInCandidate(identifier);

  if (candidate) {
    if (!(await verifyPassword(password, candidate.passwordHash))) {
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
      kind: AuthSessionKind.STORE,
      user,
      accessToken: signStoreToken(user),
    };
  }

  const personal = await findPersonalSignInCandidate(identifier);
  if (!personal) {
    await equaliseVerificationCost(password);
    throw invalidCredentials();
  }

  if (!(await verifyPassword(password, personal.passwordHash))) {
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.FAILED_LOGIN,
      entityType: AuditEntityType.SESSION,
      entityId: personal.id,
      summary: `Failed personal sign-in attempt for ${personal.email}`,
      metadata: { email: personal.email },
    });
    throw invalidCredentials();
  }

  const session = await issuePersonalSession(personal.id, personal.workspaceId);
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_LOGIN,
    entityType: AuditEntityType.SESSION,
    entityId: personal.id,
    summary: `Signed in personal ${personal.email}`,
    metadata: { workspaceId: personal.workspaceId },
  });
  return session;
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
export async function authenticate(token: string): Promise<ResolvedSession> {
  let claims: VerifiedAccessToken;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  if (claims.ctx === AuthSessionKind.PERSONAL) {
    const user = await loadPersonalAuthUser(claims.sub, claims.workspaceId);
    return { kind: AuthSessionKind.PERSONAL, user, claims };
  }

  const record = await findActiveUserById(claims.sub);
  if (!record) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  return { kind: AuthSessionKind.STORE, user: toAuthUser(record), claims };
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

export function renewSession(user: AuthPrincipal): IssuedAccessToken {
  if (isPersonalAuth(user)) {
    return signPersonalToken(user);
  }
  return signStoreToken(user);
}
