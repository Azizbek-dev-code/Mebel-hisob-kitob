import { AuthSessionKind, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  authSession: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { assertSessionUsable, touchAuthSessionExpiry } = await import('./auth-sessions.service.js');
const { isDueForRenewal, renewSession } = await import('./auth.service.js');
const { signAccessToken, verifyAccessToken } = await import('../lib/jwt.js');

const storeUser = {
  id: 'user_1',
  storeId: 'store_1',
  username: 'ali',
  fullName: 'Ali',
  role: UserRole.ADMIN,
  mustChangePassword: false,
  email: null as string | null,
  phone: null as string | null,
  avatarUrl: null as string | null,
  storeName: 'Demo',
  storeSlug: 'demo',
  permissions: {
    canManageWorkers: true,
    canManageProducts: true,
    canManageSales: true,
    canManageCustomers: true,
    canManageExpenses: true,
    canViewReports: true,
    canManageSettings: true,
  },
  subscription: {
    status: 'ACTIVE' as const,
    planCode: 'START',
    planName: 'START',
    canWrite: true,
    isReadOnly: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
  },
};

describe('isDueForRenewal', () => {
  it('renews once the token is past halfway of its lifetime', () => {
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-01-01T00:15:00.000Z');
    const claims = {
      sub: 'user_1',
      storeId: 'store_1',
      role: UserRole.ADMIN,
      ctx: AuthSessionKind.STORE as const,
      rememberMe: false,
      issuedAt,
      expiresAt,
    };
    expect(isDueForRenewal(claims, issuedAt.getTime() + 7 * 60_000)).toBe(false);
    expect(isDueForRenewal(claims, issuedAt.getTime() + 8 * 60_000)).toBe(true);
  });
});

describe('touchAuthSessionExpiry / renewSession', () => {
  beforeEach(() => {
    prismaMock.authSession.findUnique.mockReset();
    prismaMock.authSession.update.mockReset();
    prismaMock.authSession.update.mockResolvedValue({});
  });

  it('extends DB session expiry when renewing an active sliding session', async () => {
    const renewed = await renewSession(storeUser, false, 'sess_1');
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'sess_1' },
      data: {
        expiresAt: renewed.expiresAt,
        lastActiveAt: expect.any(Date),
      },
    });
    const claims = verifyAccessToken(renewed.token);
    expect(claims.sid).toBe('sess_1');
    expect(claims.rememberMe).toBe(false);
  });

  it('preserves remember-me TTL on renewal', async () => {
    const short = signAccessToken({
      sub: 'user_1',
      storeId: 'store_1',
      role: UserRole.ADMIN,
      sid: 'sess_rm',
    });
    const renewed = await renewSession(storeUser, true, 'sess_rm');
    const shortClaims = verifyAccessToken(short.token);
    const longClaims = verifyAccessToken(renewed.token);
    expect(longClaims.rememberMe).toBe(true);
    expect(renewed.expiresAt.getTime() - longClaims.issuedAt.getTime()).toBeGreaterThan(
      short.expiresAt.getTime() - shortClaims.issuedAt.getTime(),
    );
  });

  it('does not touch DB when renewing a legacy token without sid', async () => {
    await renewSession(storeUser, false, undefined);
    expect(prismaMock.authSession.update).not.toHaveBeenCalled();
  });
});

describe('assertSessionUsable sliding-desync heal', () => {
  beforeEach(() => {
    prismaMock.authSession.findUnique.mockReset();
    prismaMock.authSession.update.mockReset();
    prismaMock.authSession.update.mockResolvedValue({});
  });

  it('heals DB expiry when JWT is still valid but auth_sessions.expiresAt lagged', async () => {
    const jwtExpiresAt = new Date(Date.now() + 10 * 60_000);
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: 'sess_lag',
      identityId: null,
      userId: 'user_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      lastActiveAt: new Date(),
    });

    await expect(
      assertSessionUsable({ sid: 'sess_lag', user: storeUser, jwtExpiresAt }),
    ).resolves.toBeUndefined();

    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'sess_lag' },
      data: {
        expiresAt: jwtExpiresAt,
        lastActiveAt: expect.any(Date),
      },
    });
  });

  it('rejects when both DB session and JWT are expired', async () => {
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: 'sess_dead',
      identityId: null,
      userId: 'user_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      lastActiveAt: new Date(),
    });

    await expect(
      assertSessionUsable({
        sid: 'sess_dead',
        user: storeUser,
        jwtExpiresAt: new Date(Date.now() - 1_000),
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('still rejects revoked sessions even if JWT is valid', async () => {
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: 'sess_rev',
      identityId: null,
      userId: 'user_1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      lastActiveAt: new Date(),
    });

    await expect(
      assertSessionUsable({
        sid: 'sess_rev',
        user: storeUser,
        jwtExpiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('touchAuthSessionExpiry', () => {
  it('updates expiresAt and lastActiveAt together', async () => {
    prismaMock.authSession.update.mockResolvedValue({});
    const expiresAt = new Date('2026-06-01T12:00:00.000Z');
    await touchAuthSessionExpiry('sess_x', expiresAt);
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'sess_x' },
      data: { expiresAt, lastActiveAt: expect.any(Date) },
    });
  });
});
