import { AuthSessionKind, UserRole } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { signAccessToken, verifyAccessToken } from './jwt.js';

describe('access tokens', () => {
  it('round-trips a store token without a ctx claim', () => {
    const { token } = signAccessToken({
      sub: 'user_1',
      storeId: 'store_1',
      role: UserRole.ADMIN,
    });
    const claims = verifyAccessToken(token);
    expect(claims.ctx).toBe(AuthSessionKind.STORE);
    expect(claims.sub).toBe('user_1');
    if (claims.ctx !== AuthSessionKind.STORE) throw new Error('expected store');
    expect(claims.storeId).toBe('store_1');
    expect(claims.role).toBe(UserRole.ADMIN);
  });

  it('round-trips a personal token that has no storeId', () => {
    const { token } = signAccessToken({
      sub: 'idn_1',
      ctx: AuthSessionKind.PERSONAL,
      workspaceId: 'ws_1',
    });
    const claims = verifyAccessToken(token);
    expect(claims.ctx).toBe(AuthSessionKind.PERSONAL);
    if (claims.ctx !== AuthSessionKind.PERSONAL) throw new Error('expected personal');
    expect(claims.workspaceId).toBe('ws_1');
    expect(claims.storeId).toBeUndefined();
  });

  it('rejects a personal token that is missing workspaceId', () => {
    const { token } = signAccessToken({
      sub: 'idn_1',
      ctx: AuthSessionKind.PERSONAL,
      workspaceId: 'ws_1',
    });
    const jwt = token.split('.');
    const payload = JSON.parse(Buffer.from(jwt[1], 'base64url').toString());
    delete payload.workspaceId;
    const forged = [
      jwt[0],
      Buffer.from(JSON.stringify(payload)).toString('base64url'),
      jwt[2],
    ].join('.');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('preserves remember-me claim and longer expiry', () => {
    const short = signAccessToken({
      sub: 'user_1',
      storeId: 'store_1',
      role: UserRole.ADMIN,
    });
    const long = signAccessToken(
      {
        sub: 'user_1',
        storeId: 'store_1',
        role: UserRole.ADMIN,
        rm: true,
      },
      { expiresIn: '7d' },
    );
    const shortClaims = verifyAccessToken(short.token);
    const longClaims = verifyAccessToken(long.token);
    expect(shortClaims.rememberMe).toBe(false);
    expect(longClaims.rememberMe).toBe(true);
    expect(long.expiresAt.getTime() - longClaims.issuedAt.getTime()).toBeGreaterThan(
      short.expiresAt.getTime() - shortClaims.issuedAt.getTime(),
    );
  });
});
