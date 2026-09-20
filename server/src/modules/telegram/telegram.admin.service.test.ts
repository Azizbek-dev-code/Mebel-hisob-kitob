import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  inspectTelegramBotToken,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  recordAudit,
} = vi.hoisted(() => ({
  prismaMock: {
    telegramBotConfig: { findUnique: vi.fn(), upsert: vi.fn() },
    telegramStartMessage: { findUnique: vi.fn(), upsert: vi.fn() },
    telegramConnection: { count: vi.fn() },
  },
  inspectTelegramBotToken: vi.fn(),
  getTelegramWebhookInfo: vi.fn(),
  setTelegramWebhook: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../services/audit.service.js', () => ({ recordAudit }));
vi.mock('./telegram.service.js', () => ({
  inspectTelegramBotToken,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  resetTelegramHealthCache: vi.fn(),
  resetTelegramWebhookEnsureCache: vi.fn(),
}));
vi.mock('./telegram.config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.config.js')>();
  return {
    ...actual,
    readTelegramRuntime: vi.fn(() => ({
      configured: true,
      expectedUsername: 'blancyspace_bot',
      token: 'env-token-not-for-logs',
      webhookSecret: 'hook-secret',
    })),
    getTelegramWebhookUrl: () => 'https://example.ngrok.app/api/telegram/webhook',
    applyTelegramDbRuntime: vi.fn(),
  };
});

import { getAdminBotStatus, updateAdminBotToken, updateAdminStartMessage } from './telegram.admin.service.js';

describe('telegram admin token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.telegramConnection.count.mockResolvedValue(3);
    prismaMock.telegramBotConfig.findUnique.mockResolvedValue(null);
    getTelegramWebhookInfo.mockResolvedValue({
      ok: true,
      url: 'https://example.ngrok.app/api/telegram/webhook',
      pendingUpdateCount: 0,
      lastErrorMessage: null,
    });
  });

  it('rejects an invalid token without saving', async () => {
    inspectTelegramBotToken.mockResolvedValue({ ok: false, reason: 'api_error' });
    await expect(updateAdminBotToken('user_platform', 'not-a-real-token-value-xx')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prismaMock.telegramBotConfig.upsert).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('saves a valid token without returning or auditing the secret', async () => {
    inspectTelegramBotToken.mockResolvedValue({
      ok: true,
      bot: { id: 1, username: 'blancyspace_bot', firstName: 'Balancy' },
    });
    prismaMock.telegramBotConfig.upsert.mockResolvedValue({});
    prismaMock.telegramBotConfig.findUnique.mockResolvedValue({
      encryptedBotToken: 'v1:iv:tag:cipher',
      botUsername: 'blancyspace_bot',
      botFirstName: 'Balancy',
      lastValidatedAt: new Date('2026-09-21T00:00:00.000Z'),
    });
    setTelegramWebhook.mockResolvedValue({ ok: true });

    const status = await updateAdminBotToken('user_platform', '123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
    expect(status.botUsername).toBe('@blancyspace_bot');
    expect(status.hasDatabaseToken).toBe(true);
    expect(JSON.stringify(status)).not.toContain('123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TELEGRAM_BOT_TOKEN_UPDATED',
        metadata: { botUsername: 'blancyspace_bot' },
      }),
    );
    expect(JSON.stringify(recordAudit.mock.calls)).not.toContain('123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
  });

  it('reports bot status without leaking env token', async () => {
    const status = await getAdminBotStatus();
    expect(status.connectedUsers).toBe(3);
    expect(status.webhook?.configuredUrl).toContain('/api/telegram/webhook');
    expect(JSON.stringify(status)).not.toContain('env-token-not-for-logs');
  });
});

describe('telegram start message admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts start content', async () => {
    prismaMock.telegramStartMessage.upsert.mockResolvedValue({
      id: 'default',
      text: 'Hello',
      mediaKind: 'IMAGE',
      imageUrl: 'https://cdn.example.com/a.jpg',
      buttonText: 'Open',
      buttonUrl: 'https://balancy.space',
      buttons: [],
      updatedAt: new Date('2026-09-21T00:00:00.000Z'),
    });
    const dto = await updateAdminStartMessage('user_platform', {
      text: 'Hello',
      mediaKind: 'IMAGE',
      imageUrl: 'https://cdn.example.com/a.jpg',
      buttonText: 'Open',
      buttonUrl: 'https://balancy.space',
    });
    expect(dto.imageUrl).toBe('https://cdn.example.com/a.jpg');
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'TELEGRAM_START_MESSAGE_UPDATED' }),
    );
  });
});
