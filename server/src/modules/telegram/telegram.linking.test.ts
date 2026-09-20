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
import { EXPECTED_TELEGRAM_BOT_USERNAME } from './telegram.types.js';

describe('issueTelegramLinkingToken', () => {
  it('never puts the identity id into the Telegram start payload or deep-link', () => {
    const identityId = 'clidentity0000000000000001';
    const issued = issueTelegramLinkingToken(identityId);

    expect(issued.identityId).toBe(identityId);
    expect(issued.startPayload).not.toContain(identityId);
    expect(issued.deepLink).not.toContain(identityId);
    expect(issued.deepLink).toBe(buildTelegramStartLink(issued.startPayload));
    expect(issued.deepLink).toContain(`https://t.me/${EXPECTED_TELEGRAM_BOT_USERNAME}?start=`);
    expect(issued.tokenHash).toBe(hashTelegramLinkingToken(issued.startPayload));
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('issues a unique random payload each time', () => {
    const first = issueTelegramLinkingToken('id_a');
    const second = issueTelegramLinkingToken('id_a');
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

  it('stores only the hash and returns deepLink without leaking identity', async () => {
    const identityId = 'idn_persist_1';
    const result = await createPersistedLinkToken(identityId);

    expect(result.deepLink).toContain(`https://t.me/${EXPECTED_TELEGRAM_BOT_USERNAME}?start=`);
    expect(result.deepLink).not.toContain(identityId);
    expect(result.startPayload).toBeTruthy();
    expect(prismaMock.telegramLinkToken.deleteMany).toHaveBeenCalledWith({
      where: { identityId, usedAt: null },
    });
    expect(prismaMock.telegramLinkToken.create).toHaveBeenCalledWith({
      data: {
        identityId,
        tokenHash: hashTelegramLinkingToken(result.startPayload),
        expiresAt: result.expiresAt,
      },
    });
  });
});

describe('findValidLinkTokenByPayload / markLinkTokenUsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up by hash with unused + not expired filters', async () => {
    prismaMock.telegramLinkToken.findFirst.mockResolvedValue({ id: 'tok_1' });
    const payload = 'abc123payload';
    await findValidLinkTokenByPayload(payload);
    expect(prismaMock.telegramLinkToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: hashTelegramLinkingToken(payload),
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    });
  });

  it('marks a token used', async () => {
    prismaMock.telegramLinkToken.update.mockResolvedValue({});
    await markLinkTokenUsed('tok_9');
    expect(prismaMock.telegramLinkToken.update).toHaveBeenCalledWith({
      where: { id: 'tok_9' },
      data: { usedAt: expect.any(Date) },
    });
  });
});

describe('createPendingLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.telegramPendingLink.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.telegramPendingLink.create.mockResolvedValue({ id: 'pend_1' });
  });

  it('creates a pending confirmation row', async () => {
    await createPendingLink({
      identityId: 'idn_1',
      tokenHash: 'hash',
      telegramUserId: '42',
      telegramChatId: '42',
      username: 'ali',
      firstName: 'Ali',
    });
    expect(prismaMock.telegramPendingLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identityId: 'idn_1',
        tokenHash: 'hash',
        telegramUserId: '42',
        telegramChatId: '42',
        username: 'ali',
        firstName: 'Ali',
        expiresAt: expect.any(Date),
      }),
    });
  });
});
