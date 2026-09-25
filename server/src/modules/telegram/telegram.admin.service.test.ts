import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  inspectTelegramBotToken,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  recordAudit,
} = vi.hoisted(() => ({
  prismaMock: {
    telegramBotConfig: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
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
  ensureTelegramWebhookOnce: vi.fn().mockResolvedValue({ ok: true }),
  resetTelegramHealthCache: vi.fn(),
  resetTelegramWebhookEnsureCache: vi.fn(),
}));
vi.mock('./telegram.config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.config.js')>();
  return {
    ...actual,
    readTelegramRuntime: vi.fn(() => ({
      configured: true,
      expectedUsername: 'balancyspace_bot',
      token: 'env-token-not-for-logs',
      webhookSecret: 'hook-secret',
    })),
    getTelegramWebhookUrl: () => 'https://example.ngrok.app/api/telegram/webhook',
    getPublicAppUrl: () => 'https://balancy.space',
    applyTelegramDbRuntime: vi.fn(),
  };
});

import { getAdminBotStatus, refreshAdminBotInfo, updateAdminBotToken, updateAdminStartMessage } from './telegram.admin.service.js';
import { applyTelegramDbRuntime } from './telegram.config.js';
import { encryptTelegramSecret } from './telegram.crypto.js';

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
      lastErrorDate: null,
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
      bot: { id: 1, username: 'balancyspace_bot', firstName: 'Balancy' },
    });
    prismaMock.telegramBotConfig.upsert.mockResolvedValue({});
    prismaMock.telegramBotConfig.findUnique.mockResolvedValue({
      encryptedBotToken: 'v1:iv:tag:cipher',
      botUsername: 'balancyspace_bot',
      botFirstName: 'Balancy',
      lastValidatedAt: new Date('2026-09-21T00:00:00.000Z'),
    });
    setTelegramWebhook.mockResolvedValue({ ok: true });

    const status = await updateAdminBotToken('user_platform', '123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
    expect(status.botUsername).toBe('@balancyspace_bot');
    expect(status.hasDatabaseToken).toBe(true);
    expect(JSON.stringify(status)).not.toContain('123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TELEGRAM_BOT_TOKEN_UPDATED',
        metadata: { botUsername: 'balancyspace_bot' },
      }),
    );
    expect(JSON.stringify(recordAudit.mock.calls)).not.toContain('123456:VALID-TELEGRAM-BOT-TOKEN-SECRET');
  });

  it('reports bot status without leaking env token', async () => {
    const status = await getAdminBotStatus();
    expect(status.connectedUsers).toBe(3);
    expect(status.webhook?.configuredUrl).toContain('/api/telegram/webhook');
    expect(status.webhook?.active).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.webhookSecretConfigured).toBe(true);
    expect(JSON.stringify(status)).not.toContain('env-token-not-for-logs');
    expect(JSON.stringify(status)).not.toContain('hook-secret');
  });

  it('stays active when Telegram still reports a historical last_error_message', async () => {
    getTelegramWebhookInfo.mockResolvedValue({
      ok: true,
      url: 'https://example.ngrok.app/api/telegram/webhook',
      pendingUpdateCount: 0,
      lastErrorMessage: 'Wrong response from the webhook: 308 Permanent Redirect',
      lastErrorDate: 1_700_000_000,
    });
    const status = await getAdminBotStatus();
    expect(status.webhook?.active).toBe(true);
    expect(status.webhook?.lastErrorMessage).toContain('308 Permanent Redirect');
    expect(status.webhook?.lastErrorDate).toBe(1_700_000_000);
    expect(status.webhook?.url).toBe(status.webhook?.configuredUrl);
  });

  it('marks webhook inactive when Telegram URL does not match expected', async () => {
    getTelegramWebhookInfo.mockResolvedValue({
      ok: true,
      url: 'https://www.mebelboshqaruv.uz/api/telegram/webhook',
      pendingUpdateCount: 0,
      lastErrorMessage: null,
      lastErrorDate: null,
    });
    const status = await getAdminBotStatus();
    expect(status.webhook?.active).toBe(false);
    expect(status.webhook?.url).toContain('mebelboshqaruv.uz');
    expect(status.webhook?.configuredUrl).toBe('https://example.ngrok.app/api/telegram/webhook');
  });

  it('marks webhook inactive when Telegram reports no webhook URL', async () => {
    getTelegramWebhookInfo.mockResolvedValue({
      ok: true,
      url: '',
      pendingUpdateCount: 0,
      lastErrorMessage: null,
      lastErrorDate: null,
    });
    const status = await getAdminBotStatus();
    expect(status.webhook?.active).toBe(false);
    expect(status.webhook?.url).toBe('');
  });

  it('surfaces getWebhookInfo API failure as inactive with an error message', async () => {
    getTelegramWebhookInfo.mockResolvedValue({
      ok: false,
      reason: 'api_error',
      description: 'Bad Gateway',
    });
    const status = await getAdminBotStatus();
    expect(status.webhook?.active).toBe(false);
    expect(status.webhook?.lastErrorMessage).toContain('Bad Gateway');
    expect(status.webhook?.lastErrorDate).toBeNull();
    expect(status.connected).toBe(false);
  });

  it('hydrates a database token before reporting status', async () => {
    const dbToken = '123456:DB-TELEGRAM-BOT-TOKEN-NOT-FOR-LOGS';
    prismaMock.telegramBotConfig.findUnique.mockResolvedValue({
      encryptedBotToken: encryptTelegramSecret(dbToken),
      botUsername: 'balancyspace_bot',
      botFirstName: 'Balancy',
      lastValidatedAt: new Date('2026-09-21T00:00:00.000Z'),
    });

    const status = await getAdminBotStatus();
    expect(applyTelegramDbRuntime).toHaveBeenCalledWith({
      token: dbToken,
      botUsername: 'balancyspace_bot',
    });
    expect(status.hasDatabaseToken).toBe(true);
    expect(JSON.stringify(status)).not.toContain(dbToken);
  });

  it('refreshAdminBotInfo updates username from getMe without requiring a new token', async () => {
    const dbToken = '123456:DB-TELEGRAM-BOT-TOKEN-NOT-FOR-LOGS';
    const encrypted = encryptTelegramSecret(dbToken);
    prismaMock.telegramBotConfig.findUnique
      .mockResolvedValueOnce({
        encryptedBotToken: encrypted,
        botUsername: 'balancyspace_bot',
        botFirstName: 'Old',
        lastValidatedAt: new Date('2026-09-21T00:00:00.000Z'),
      })
      .mockResolvedValue({
        encryptedBotToken: encrypted,
        botUsername: 'BalancySpace_bot',
        botFirstName: 'Balancy',
        lastValidatedAt: new Date('2026-09-23T00:00:00.000Z'),
      });
    prismaMock.telegramBotConfig.update.mockResolvedValue({});
    inspectTelegramBotToken.mockResolvedValue({
      ok: true,
      bot: { id: 1, username: 'BalancySpace_bot', firstName: 'Balancy' },
    });

    const status = await refreshAdminBotInfo('user_platform');
    expect(prismaMock.telegramBotConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          botUsername: 'BalancySpace_bot',
          botFirstName: 'Balancy',
        }),
      }),
    );
    expect(status.botUsername).toBe('@BalancySpace_bot');
    expect(JSON.stringify(status)).not.toContain(dbToken);
  });

  it('resolveTelegramBotUsername returns DB username without calling getMe', async () => {
    const { resolveTelegramBotUsername } = await import('./telegram.admin.service.js');
    prismaMock.telegramBotConfig.findUnique.mockResolvedValue({
      encryptedBotToken: null,
      botUsername: 'BalancySpace_bot',
    });

    const username = await resolveTelegramBotUsername();
    expect(username).toBe('BalancySpace_bot');
    expect(inspectTelegramBotToken).not.toHaveBeenCalled();
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
