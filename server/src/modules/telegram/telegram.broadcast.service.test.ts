import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, sendTelegramContent, deactivateByTelegramUserId, recordAudit } = vi.hoisted(() => ({
  prismaMock: {
    telegramConnection: { findMany: vi.fn(), findFirst: vi.fn() },
    telegramBroadcast: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    telegramBroadcastRecipient: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
    },
  },
  sendTelegramContent: vi.fn(),
  deactivateByTelegramUserId: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../services/audit.service.js', () => ({ recordAudit }));
vi.mock('./telegram.content.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.content.js')>();
  return { ...actual, sendTelegramContent };
});
vi.mock('./telegram.connection.service.js', () => ({ deactivateByTelegramUserId }));
vi.mock('./telegram.config.js', () => ({
  readTelegramRuntime: () => ({
    configured: true,
    expectedUsername: 'balancyspace_bot',
    token: 'token',
  }),
}));
vi.mock('./telegram.audience.js', () => ({
  resolveAudienceConnections: vi.fn().mockResolvedValue([
    { id: 'c1', telegramUserId: '11', telegramChatId: '11' },
  ]),
}));

import { TelegramBroadcastRecipientStatus, TelegramBroadcastStatus } from '@furniture-erp/shared';

import {
  createBroadcast,
  kickBroadcastProcessing,
  processBroadcastQueue,
  resetBroadcastKickLock,
} from './telegram.broadcast.service.js';

const broadcastRow = {
  id: 'bc_1',
  title: 'Hello',
  text: 'Hello everyone',
  mediaKind: 'NONE',
  imageUrl: null,
  buttonText: null,
  buttonUrl: null,
  status: TelegramBroadcastStatus.PENDING,
  totalRecipients: 2,
  sentCount: 0,
  failedCount: 0,
  createdById: 'user_platform',
  createdAt: new Date('2026-09-21T00:00:00.000Z'),
  completedAt: null,
  startedAt: null,
};

describe('telegram broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBroadcastKickLock();
    prismaMock.telegramBroadcast.findUnique.mockResolvedValue(broadcastRow);
    prismaMock.telegramBroadcast.update.mockResolvedValue(broadcastRow);
    prismaMock.telegramBroadcast.count.mockResolvedValue(0);
    prismaMock.telegramBroadcast.findMany.mockResolvedValue([]);
    prismaMock.telegramBroadcastRecipient.count.mockResolvedValue(0);
    prismaMock.telegramBroadcastRecipient.createMany.mockResolvedValue({ count: 1 });
    sendTelegramContent.mockResolvedValue({ ok: true });
  });

  it('snapshots only active connections', async () => {
    prismaMock.telegramBroadcast.create.mockResolvedValue(broadcastRow);

    await createBroadcast('user_platform', { text: 'Hello everyone', mediaKind: 'NONE', imageUrl: null, buttonText: null, buttonUrl: null });

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'TELEGRAM_BROADCAST_CREATED' }),
    );
  });

  it('skips unlinked users and deactivates blocked chats', async () => {
    prismaMock.telegramBroadcast.findFirst
      .mockResolvedValueOnce({ id: 'bc_1' })
      .mockResolvedValue(null);
    prismaMock.telegramBroadcastRecipient.findMany
      .mockResolvedValueOnce([
      {
        id: 'r1',
        broadcastId: 'bc_1',
        telegramUserId: '11',
        telegramChatId: '11',
        createdAt: new Date(),
      },
      {
        id: 'r2',
        broadcastId: 'bc_1',
        telegramUserId: '22',
        telegramChatId: '22',
        createdAt: new Date(),
      },
    ])
      .mockResolvedValue([]);
    prismaMock.telegramBroadcastRecipient.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.telegramConnection.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c2' });
    sendTelegramContent.mockResolvedValueOnce({ ok: false, reason: 'blocked' });

    await processBroadcastQueue();

    expect(prismaMock.telegramBroadcastRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ status: TelegramBroadcastRecipientStatus.SKIPPED }),
      }),
    );
    expect(deactivateByTelegramUserId).toHaveBeenCalledWith('22');
  });

  it('does not reject when broadcast tables are missing', async () => {
    prismaMock.telegramBroadcast.findFirst.mockRejectedValue(new Error('table missing'));
    await expect(kickBroadcastProcessing()).resolves.toBeUndefined();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
