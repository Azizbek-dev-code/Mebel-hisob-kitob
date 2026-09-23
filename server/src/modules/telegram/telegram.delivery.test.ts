import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findActiveByIdentity,
  deactivateByTelegramUserId,
  sendTelegramMessage,
  prismaMock,
} = vi.hoisted(() => ({
  findActiveByIdentity: vi.fn(),
  deactivateByTelegramUserId: vi.fn(),
  sendTelegramMessage: vi.fn(),
  prismaMock: {
    user: { findMany: vi.fn() },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./telegram.connection.service.js', () => ({
  findActiveByIdentity,
  deactivateByTelegramUserId,
}));
vi.mock('./telegram.service.js', () => ({
  sendTelegramMessage,
}));
vi.mock('./telegram.account-pref.service.js', () => ({
  isWorkspaceNotifyEnabled: vi.fn().mockResolvedValue(true),
  personalWorkspaceIdForIdentity: vi.fn().mockResolvedValue(null),
  workspaceIdForStore: vi.fn().mockResolvedValue(null),
}));

import { tryDeliverTelegram, tryDeliverTelegramToStoreUsers } from './telegram.delivery.js';

const activeRow = {
  id: 'tg_1',
  identityId: 'idn_1',
  telegramUserId: '100',
  telegramChatId: '100',
  isActive: true,
  notifyBusiness: true,
  notifyPersonal: true,
  bizNotifySales: true,
  personalNotifyGoals: false,
};

describe('tryDeliverTelegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTelegramMessage.mockResolvedValue({ ok: true });
  });

  it('skips when no active connection', async () => {
    findActiveByIdentity.mockResolvedValue(null);
    await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'business',
      text: 'hi',
    });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('skips when channel master is off', async () => {
    findActiveByIdentity.mockResolvedValue({ ...activeRow, notifyBusiness: false });
    await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'business',
      text: 'hi',
    });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('skips when prefField is false', async () => {
    findActiveByIdentity.mockResolvedValue(activeRow);
    await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'personal',
      prefField: 'personalNotifyGoals',
      text: 'hi',
    });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('sends when allowed and deactivates on blocked', async () => {
    findActiveByIdentity.mockResolvedValue(activeRow);
    sendTelegramMessage.mockResolvedValue({ ok: false, reason: 'blocked' });
    await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'business',
      prefField: 'bizNotifySales',
      text: 'sale',
    });
    expect(sendTelegramMessage).toHaveBeenCalledWith('100', 'sale');
    expect(deactivateByTelegramUserId).toHaveBeenCalledWith('100');
  });

  it('never throws to the caller', async () => {
    findActiveByIdentity.mockRejectedValue(new Error('db down'));
    await expect(
      tryDeliverTelegram({ identityId: 'idn_1', channel: 'business', text: 'x' }),
    ).resolves.toEqual(
      expect.objectContaining({ delivered: false, reason: 'error' }),
    );
  });

  it('returns delivered true on success', async () => {
    findActiveByIdentity.mockResolvedValue(activeRow);
    const result = await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'business',
      text: 'ok',
    });
    expect(result).toEqual({ delivered: true });
  });

  it('returns channel_off when master switch is off', async () => {
    findActiveByIdentity.mockResolvedValue({ ...activeRow, notifyBusiness: false });
    const result = await tryDeliverTelegram({
      identityId: 'idn_1',
      channel: 'business',
      text: 'hi',
    });
    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('channel_off');
  });
});

describe('tryDeliverTelegramToStoreUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findActiveByIdentity.mockResolvedValue(activeRow);
    sendTelegramMessage.mockResolvedValue({ ok: true });
  });

  it('fans out to distinct identity ids', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { identityId: 'idn_1' },
      { identityId: 'idn_1' },
      { identityId: 'idn_2' },
    ]);
    findActiveByIdentity.mockResolvedValueOnce(activeRow).mockResolvedValueOnce(null);

    await tryDeliverTelegramToStoreUsers('store_1', {
      prefField: 'bizNotifySales',
      text: '🛒 Yangi sotuv',
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store_1', identityId: { not: null } }),
      }),
    );
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });
});
