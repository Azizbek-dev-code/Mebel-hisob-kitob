import type { AuthPrincipal, AuthSessionDto, AuthSessionListResponse } from '@furniture-erp/shared';
import { isPersonalAuth } from '@furniture-erp/shared';

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';

const LAST_ACTIVE_THROTTLE_MS = 2 * 60 * 1000;

export interface SessionIssueMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string {
  const value = userAgent ?? '';
  const os = /Windows/i.test(value)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(value)
      ? 'macOS'
      : /Android/i.test(value)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(value)
          ? 'iOS'
          : 'Qurilma';
  const browser = /Edg\//i.test(value)
    ? 'Edge'
    : /Chrome\//i.test(value)
      ? 'Chrome'
      : /Firefox\//i.test(value)
        ? 'Firefox'
        : /Safari\//i.test(value)
          ? 'Safari'
          : 'Brauzer';
  return `${browser} · ${os}`;
}

export async function createAuthSession(input: {
  user: AuthPrincipal;
  expiresAt: Date;
  rememberMe: boolean;
  meta?: SessionIssueMeta;
}): Promise<string> {
  const row = await prisma.authSession.create({
    data: {
      identityId: isPersonalAuth(input.user) ? input.user.identityId : null,
      userId: isPersonalAuth(input.user) ? null : input.user.id,
      deviceLabel: deviceLabelFromUserAgent(input.meta?.userAgent),
      userAgent: input.meta?.userAgent?.slice(0, 400) ?? null,
      ipAddress: input.meta?.ipAddress?.slice(0, 64) ?? null,
      rememberMe: input.rememberMe,
      expiresAt: input.expiresAt,
    },
    select: { id: true },
  });
  return row.id;
}

/**
 * Keep DB session expiry in lockstep with the JWT cookie.
 * Sliding renewal must call this whenever a new access token is issued.
 */
export async function touchAuthSessionExpiry(sid: string, expiresAt: Date): Promise<void> {
  await prisma.authSession
    .update({
      where: { id: sid },
      data: { expiresAt, lastActiveAt: new Date() },
    })
    .catch(() => undefined);
}

export async function assertSessionUsable(input: {
  sid: string;
  user: AuthPrincipal;
  /** When set, heal DB expiry that lagged behind a renewed (still-valid) JWT. */
  jwtExpiresAt?: Date;
}): Promise<void> {
  const row = await prisma.authSession.findUnique({
    where: { id: input.sid },
    select: {
      id: true,
      identityId: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
      lastActiveAt: true,
    },
  });
  if (!row || row.revokedAt) {
    throw ApiError.unauthorized('Sessiyangiz muddati tugadi. Iltimos, qayta kiring.');
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    // Pre-fix renewals updated the cookie JWT but not auth_sessions.expiresAt.
    // If the JWT is still valid, realign DB expiry instead of forcing a logout.
    if (input.jwtExpiresAt && input.jwtExpiresAt.getTime() > Date.now()) {
      await touchAuthSessionExpiry(row.id, input.jwtExpiresAt);
    } else {
      throw ApiError.unauthorized('Sessiyangiz muddati tugadi. Iltimos, qayta kiring.');
    }
  }
  if (isPersonalAuth(input.user)) {
    if (row.identityId !== input.user.identityId) {
      throw ApiError.unauthorized('Sessiyangiz muddati tugadi. Iltimos, qayta kiring.');
    }
  } else if (row.userId !== input.user.id) {
    throw ApiError.unauthorized('Sessiyangiz muddati tugadi. Iltimos, qayta kiring.');
  }

  if (Date.now() - row.lastActiveAt.getTime() >= LAST_ACTIVE_THROTTLE_MS) {
    await prisma.authSession
      .update({
        where: { id: row.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => undefined);
  }
}

export async function revokeAuthSession(sid: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { id: sid, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function ownerWhere(user: AuthPrincipal) {
  return isPersonalAuth(user) ? { identityId: user.identityId } : { userId: user.id };
}

export async function listAuthSessions(
  user: AuthPrincipal,
  currentSid: string | null,
): Promise<AuthSessionListResponse> {
  const rows = await prisma.authSession.findMany({
    where: { ...ownerWhere(user), revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: 'desc' },
    take: 40,
  });

  const items: AuthSessionDto[] = rows.map((row) => ({
    id: row.id,
    deviceLabel: row.deviceLabel || 'Brauzer',
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    isCurrent: Boolean(currentSid && row.id === currentSid),
  }));

  if (currentSid && !items.some((item) => item.id === currentSid)) {
    items.unshift({
      id: currentSid,
      deviceLabel: 'Joriy sessiya',
      ipAddress: null,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isCurrent: true,
    });
  }

  if (!currentSid && items.length === 0) {
    items.push({
      id: 'current',
      deviceLabel: 'Joriy sessiya',
      ipAddress: null,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isCurrent: true,
    });
  }

  return { items };
}

export async function revokeOneSession(
  user: AuthPrincipal,
  sessionId: string,
  currentSid: string | null,
): Promise<{ revokedCurrent: boolean }> {
  if (sessionId === 'current') {
    if (currentSid) await revokeAuthSession(currentSid);
    return { revokedCurrent: true };
  }
  const row = await prisma.authSession.findFirst({
    where: { id: sessionId, ...ownerWhere(user), revokedAt: null },
    select: { id: true },
  });
  if (!row) throw ApiError.notFound('Sessiya topilmadi');
  await revokeAuthSession(row.id);
  return { revokedCurrent: Boolean(currentSid && row.id === currentSid) };
}

export async function revokeOtherSessions(user: AuthPrincipal, currentSid: string | null): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      ...ownerWhere(user),
      revokedAt: null,
      ...(currentSid ? { id: { not: currentSid } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}
