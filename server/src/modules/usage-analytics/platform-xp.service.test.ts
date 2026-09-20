import { describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    platformXpTransaction: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { tryAwardPlatformXp } = await import('./platform-xp.service.js');

describe('tryAwardPlatformXp', () => {
  it('awards once per referenceKey and skips duplicates', async () => {
    prismaMock.platformXpTransaction.findUnique.mockResolvedValueOnce(null);
    prismaMock.platformXpTransaction.count.mockResolvedValue(0);
    prismaMock.platformXpTransaction.create.mockResolvedValue({ id: 'xp_1' });

    const first = await tryAwardPlatformXp({
      identityId: 'idn_1',
      eventType: 'sale_created',
      entityId: 'sale_1',
      now: new Date('2026-09-21T12:00:00.000Z'),
      db: prismaMock as never,
    });
    expect(first.awarded).toBe(5);
    expect(first.duplicate).toBe(false);

    prismaMock.platformXpTransaction.findUnique.mockResolvedValueOnce({ id: 'xp_1' });
    const second = await tryAwardPlatformXp({
      identityId: 'idn_1',
      eventType: 'sale_created',
      entityId: 'sale_1',
      now: new Date('2026-09-21T12:01:00.000Z'),
      db: prismaMock as never,
    });
    expect(second.awarded).toBe(0);
    expect(second.duplicate).toBe(true);
  });
});
