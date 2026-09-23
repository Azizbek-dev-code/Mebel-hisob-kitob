import type { Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveTelegramBotUsername, createPersistedLinkToken, ensureIdentityForUser } = vi.hoisted(
  () => ({
    resolveTelegramBotUsername: vi.fn(),
    createPersistedLinkToken: vi.fn(),
    ensureIdentityForUser: vi.fn(),
  }),
);

vi.mock('./telegram.admin.service.js', () => ({
  resolveTelegramBotUsername,
  hydrateTelegramRuntimeFromDb: vi.fn(),
}));
vi.mock('./telegram.linking.js', () => ({
  createPersistedLinkToken,
}));
vi.mock('../accounts/account-layer.service.js', () => ({
  ensureIdentityForUser,
}));

import { startLinkForRequest } from './telegram.account.service.js';

describe('startLinkForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTelegramBotUsername.mockResolvedValue('BalancySpace_bot');
    createPersistedLinkToken.mockResolvedValue({
      deepLink: 'https://t.me/BalancySpace_bot?start=secure-token',
      expiresAt: new Date('2026-09-23T12:00:00.000Z'),
      startPayload: 'secure-token',
    });
  });

  it('builds connect deep-link from resolveTelegramBotUsername (DB/getMe)', async () => {
    const req = {
      personalAuth: { identityId: 'idn_1' },
    } as unknown as Request;

    const result = await startLinkForRequest(req);

    expect(resolveTelegramBotUsername).toHaveBeenCalledTimes(1);
    expect(createPersistedLinkToken).toHaveBeenCalledWith('idn_1', 'BalancySpace_bot');
    expect(result.deepLink).toBe('https://t.me/BalancySpace_bot?start=secure-token');
    expect(result.deepLink).toContain('BalancySpace_bot');
    expect(result.deepLink.toLowerCase()).not.toContain('blancyspace');
    expect(JSON.stringify(result)).not.toContain('idn_1');
  });
});
