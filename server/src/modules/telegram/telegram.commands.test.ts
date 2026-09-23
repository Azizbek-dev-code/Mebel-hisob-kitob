import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  sendTelegramMessage,
  sendTelegramContent,
  getActiveStartMessage,
  answerTelegramCallbackQuery,
  activateOrReplaceConnection,
  findActiveByTelegramUserId,
  getConnectionStatus,
  unlinkConnection,
  createPendingLink,
  deletePendingLink,
  findValidLinkTokenByPayload,
  findValidLinkTokenByHash,
  getPendingLink,
  markLinkTokenUsed,
} = vi.hoisted(() => ({
  prismaMock: {
    telegramAccountPreference: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    telegramConnection: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
  sendTelegramMessage: vi.fn(),
  sendTelegramContent: vi.fn(),
  getActiveStartMessage: vi.fn(),
  answerTelegramCallbackQuery: vi.fn(),
  activateOrReplaceConnection: vi.fn(),
  findActiveByTelegramUserId: vi.fn(),
  getConnectionStatus: vi.fn(),
  unlinkConnection: vi.fn(),
  createPendingLink: vi.fn(),
  deletePendingLink: vi.fn(),
  findValidLinkTokenByPayload: vi.fn(),
  findValidLinkTokenByHash: vi.fn(),
  getPendingLink: vi.fn(),
  markLinkTokenUsed: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./telegram.service.js', () => ({
  sendTelegramMessage,
  answerTelegramCallbackQuery,
}));
vi.mock('./telegram.content.js', () => ({
  sendTelegramContent,
}));
vi.mock('./telegram.start-message.js', () => ({
  getActiveStartMessage,
}));
vi.mock('./telegram.connection.service.js', () => ({
  activateOrReplaceConnection,
  findActiveByTelegramUserId,
  getConnectionStatus,
  unlinkConnection,
}));
vi.mock('./telegram.linking.js', () => ({
  createPendingLink,
  deletePendingLink,
  findValidLinkTokenByPayload,
  findValidLinkTokenByHash,
  getPendingLink,
  markLinkTokenUsed,
}));
vi.mock('./telegram.menu.js', () => ({
  sendMenuScreen: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./telegram.config.js', () => ({
  getPublicAppUrl: () => 'https://www.mebelboshqaruv.uz',
}));
vi.mock('./telegram.account-pref.service.js', () => ({
  listAccountPreferences: vi.fn().mockResolvedValue([
    {
      workspaceId: 'ws_p',
      type: 'PERSONAL',
      name: 'Shaxsiy moliya',
      storeId: null,
      businessType: null,
      notifyEnabled: true,
    },
    {
      workspaceId: 'ws_b',
      type: 'BUSINESS',
      name: 'Fayz Mebel',
      storeId: 'st_b',
      businessType: 'FURNITURE',
      notifyEnabled: true,
    },
  ]),
}));
vi.mock('./telegram.cleanup.service.js', () => ({
  countValidTelegramAccountContexts: vi.fn().mockResolvedValue(2),
  unlinkTelegramForIdentity: vi.fn().mockResolvedValue(true),
}));

import { handleTelegramUpdate } from './telegram.commands.js';
import { TELEGRAM_CB_LINK_NO, TELEGRAM_CB_LINK_OK, TELEGRAM_CB_MENU } from './telegram.types.js';
import { sendMenuScreen } from './telegram.menu.js';

describe('handleTelegramUpdate /start confirm flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTelegramMessage.mockResolvedValue({ ok: true });
    answerTelegramCallbackQuery.mockResolvedValue(undefined);
  });

  it('asks for confirmation on /start with a valid payload', async () => {
    findValidLinkTokenByPayload.mockResolvedValue({
      id: 'tok_1',
      identityId: 'idn_1',
      tokenHash: 'hash_1',
    });
    createPendingLink.mockResolvedValue({ id: 'pend_1' });

    await handleTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        text: '/start payload_abc',
        chat: { id: 55, type: 'private' },
        from: { id: 55, first_name: 'Ali', username: 'ali' },
      },
    });

    expect(createPendingLink).toHaveBeenCalledWith(
      expect.objectContaining({
        identityId: 'idn_1',
        tokenHash: 'hash_1',
        telegramUserId: '55',
        telegramChatId: '55',
      }),
    );
    expect(activateOrReplaceConnection).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      '55',
      expect.stringContaining('tasdiqlaysizmi'),
      expect.objectContaining({
        inline_keyboard: expect.any(Array),
      }),
    );
  });

  it('activates on confirm callback when telegram user matches', async () => {
    getPendingLink.mockResolvedValue({
      id: 'pend_1',
      identityId: 'idn_1',
      tokenHash: 'hash_1',
      telegramUserId: '55',
      telegramChatId: '55',
      username: 'ali',
      firstName: 'Ali',
      expiresAt: new Date(Date.now() + 60_000),
    });
    findValidLinkTokenByHash.mockResolvedValue({ id: 'tok_1' });
    activateOrReplaceConnection.mockResolvedValue({ ok: true, connection: {} });

    await handleTelegramUpdate({
      update_id: 2,
      callback_query: {
        id: 'cq_1',
        data: `${TELEGRAM_CB_LINK_OK}pend_1`,
        from: { id: 55, first_name: 'Ali' },
        message: { message_id: 2, chat: { id: 55, type: 'private' } },
      },
    });

    expect(activateOrReplaceConnection).toHaveBeenCalled();
    expect(markLinkTokenUsed).toHaveBeenCalledWith('tok_1');
    expect(deletePendingLink).toHaveBeenCalledWith('pend_1');
    expect(sendTelegramMessage).toHaveBeenCalledWith('55', expect.stringContaining('ulandi'));
  });

  it('rejects stolen confirm from a different telegram user', async () => {
    getPendingLink.mockResolvedValue({
      id: 'pend_1',
      identityId: 'idn_1',
      tokenHash: 'hash_1',
      telegramUserId: '55',
      telegramChatId: '55',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await handleTelegramUpdate({
      update_id: 3,
      callback_query: {
        id: 'cq_2',
        data: `${TELEGRAM_CB_LINK_OK}pend_1`,
        from: { id: 99, first_name: 'Thief' },
        message: { message_id: 3, chat: { id: 99, type: 'private' } },
      },
    });

    expect(activateOrReplaceConnection).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith('99', expect.stringContaining('boshqa'));
  });

  it('deletes pending on cancel', async () => {
    getPendingLink.mockResolvedValue({
      id: 'pend_1',
      identityId: 'idn_1',
      tokenHash: 'hash_1',
      telegramUserId: '55',
      telegramChatId: '55',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await handleTelegramUpdate({
      update_id: 4,
      callback_query: {
        id: 'cq_3',
        data: `${TELEGRAM_CB_LINK_NO}pend_1`,
        from: { id: 55, first_name: 'Ali' },
        message: { message_id: 4, chat: { id: 55, type: 'private' } },
      },
    });

    expect(deletePendingLink).toHaveBeenCalledWith('pend_1');
    expect(activateOrReplaceConnection).not.toHaveBeenCalled();
  });
});

describe('handleTelegramUpdate /start content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTelegramContent.mockResolvedValue({ ok: true });
  });

  it('sends the configured start message on bare /start', async () => {
    await handleTelegramUpdate({
      update_id: 10,
      message: {
        message_id: 10,
        text: '/start',
        chat: { id: 55, type: 'private' },
        from: { id: 55, first_name: 'Ali' },
      },
    });

    expect(sendMenuScreen).toHaveBeenCalledWith('55', 'welcome');
  });

  it('sends image + text + button when configured', async () => {
    await handleTelegramUpdate({
      update_id: 11,
      message: {
        message_id: 11,
        text: '/start',
        chat: { id: 71, type: 'private' },
        from: { id: 71, first_name: 'Vali' },
      },
    });

    expect(sendMenuScreen).toHaveBeenCalledWith('71', 'welcome');
  });

  it('opens nested menus from callback buttons', async () => {
    await handleTelegramUpdate({
      update_id: 12,
      callback_query: {
        id: 'cb_menu',
        from: { id: 71 },
        data: `${TELEGRAM_CB_MENU}details`,
        message: { message_id: 12, chat: { id: 71, type: 'private' } },
      },
    });
    expect(sendMenuScreen).toHaveBeenCalledWith('71', 'details');
  });

  it('lists connected accounts via /accounts', async () => {
    findActiveByTelegramUserId.mockResolvedValue({
      id: 'conn_1',
      identityId: 'idn_1',
      isActive: true,
    });
    await handleTelegramUpdate({
      update_id: 20,
      message: {
        message_id: 20,
        text: '/accounts',
        chat: { id: 90, type: 'private' },
        from: { id: 90, first_name: 'Ali' },
      },
    });
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      '90',
      expect.stringContaining('Ulangan akkauntlar'),
      expect.objectContaining({
        inline_keyboard: expect.any(Array),
      }),
    );
  });
});
