import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    telegramLinkToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    telegramPendingLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

import {
  buildTelegramStartLink,
  createPendingLink,
  createPersistedLinkToken,
  findValidLinkTokenByPayload,
  hashTelegramLinkingToken,
  issueTelegramLinkingToken,
  markLinkTokenUsed,
} from './telegram.linking.js';

describe('buildTelegramStartLink', () => {
  it('builds deep-link with the provided active bot username (canonical casing)', () => {
    expect(buildTelegramStartLink('abc', 'BalancySpace_bot')).toBe(
      'https://t.me/BalancySpace_bot?start=abc',
    );
    expect(buildTelegramStartLink('tok', '@BalancySpace_bot')).toBe(
      'https://t.me/BalancySpace_bot?start=tok',
    );
  });

  it('never falls back to a hardcoded bot username', () => {
    expect(() => buildTelegramStartLink('abc', '')).toThrow(/username is required/i);
    expect(() => buildTelegramStartLink('abc', '   ')).toThrow(/username is required/i);
  });

  it('does not embed legacy bot names when given the active bot', () => {
    const link = buildTelegramStartLink('payload', 'BalancySpace_bot');
    expect(link).toBe('https://t.me/BalancySpace_bot?start=payload');
    expect(link.toLowerCase()).not.toContain('blancyspace');
  });
});

describe('issueTelegramLinkingToken', () => {
  it('never puts the identity id into the Telegram start payload or deep-link', () => {
    const identityId = 'clidentity0000000000000001';
    const issued = issueTelegramLinkingToken(identityId, 'BalancySpace_bot');

    expect(issued.identityId).toBe(identityId);
    expect(issued.startPayload).not.toContain(identityId);
    expect(issued.deepLink).not.toContain(identityId);
    expect(issued.deepLink).toBe(buildTelegramStartLink(issued.startPayload, 'BalancySpace_bot'));
    expect(issued.deepLink).toContain('https://t.me/BalancySpace_bot?start=');
    expect(issued.tokenHash).toBe(hashTelegramLinkingToken(issued.startPayload));
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('issues a unique random payload each time', () => {
    const first = issueTelegramLinkingToken('id_a', 'BalancySpace_bot');
    const second = issueTelegramLinkingToken('id_a', 'BalancySpace_bot');
    expect(first.startPayload).not.toBe(second.startPayload);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});

describe('createPersistedLinkToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.telegramLinkToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.telegramLinkToken.create.mockResolvedValue({ id: 'tok_1' });
  });

  it('stores only the hash and returns deepLink for the active bot username', async () => {
    const identityId = 'idn_connect_1';
    const result = await createPersistedLinkToken(identityId, 'BalancySpace_bot');
    expect(result.deepLink).toContain('https://t.me/BalancySpace_bot?start=');
    expect(result.deepLink).not.toContain(identityId);
    expect(result.startPayload).toBeTruthy();
    expect(prismaMock.telegramLinkToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityId,
          tokenHash: hashTelegramLinkingToken(result.startPayload),
        }),
      }),
    );
  });
});

describe('pending link helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findValidLinkTokenByPayload hashes the payload', async () => {
    prismaMock.telegramLinkToken.findFirst.mockResolvedValue({ id: 'x' });
    await findValidLinkTokenByPayload('raw-token');
    expect(prismaMock.telegramLinkToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: hashTelegramLinkingToken('raw-token'),
        }),
      }),
    );
  });

  it('markLinkTokenUsed sets usedAt', async () => {
    prismaMock.telegramLinkToken.update.mockResolvedValue({});
    await markLinkTokenUsed('tok_1');
    expect(prismaMock.telegramLinkToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tok_1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it('createPendingLink stores telegram ids without identity in deep-link path', async () => {
    prismaMock.telegramPendingLink.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.telegramPendingLink.create.mockResolvedValue({ id: 'pending_1' });
    await createPendingLink({
      identityId: 'idn_1',
      tokenHash: 'hash',
      telegramUserId: '99',
      telegramChatId: '99',
      username: 'user',
      firstName: 'U',
    });
    expect(prismaMock.telegramPendingLink.create).toHaveBeenCalled();
  });
});
