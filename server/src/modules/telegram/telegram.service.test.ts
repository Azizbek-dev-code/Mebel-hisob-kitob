import { afterEach, describe, expect, it, vi } from 'vitest';

import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import {
  callTelegramApi,
  getTelegramHealthStatus,
  probeTelegramOnBoot,
  resetTelegramHealthCache,
  verifyTelegramBotConnection,
} from './telegram.service.js';
import { EXPECTED_TELEGRAM_BOT_USERNAME, type TelegramRuntimeConfig } from './telegram.types.js';

const TEST_TOKEN = '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK';

const configuredRuntime: TelegramRuntimeConfig = {
  configured: true,
  expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
  token: TEST_TOKEN,
};

function mockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function serialiseLogs(log: ReturnType<typeof mockLogger>): string {
  return JSON.stringify([log.info.mock.calls, log.warn.mock.calls, log.error.mock.calls]);
}

afterEach(() => {
  resetTelegramHealthCache();
});

describe('verifyTelegramBotConnection', () => {
  it('does not crash when the bot token is missing', async () => {
    const log = mockLogger();
    const fetchFn = vi.fn();

    const result = await verifyTelegramBotConnection({
      runtime: { configured: false, expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME },
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    expect(result).toEqual({ ok: false, reason: 'not_configured' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('verifies the expected bot username via getMe', async () => {
    const log = mockLogger();
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          id: 42,
          is_bot: true,
          first_name: 'Blancy',
          username: EXPECTED_TELEGRAM_BOT_USERNAME,
        },
      }),
    });

    const result = await verifyTelegramBotConnection({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    expect(result).toEqual({
      ok: true,
      bot: { id: 42, username: EXPECTED_TELEGRAM_BOT_USERNAME, firstName: 'Blancy' },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchFn.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('/getMe');
  });

  it('accepts getMe identity without rejecting on EXPECTED fallback mismatch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: { id: 1, is_bot: true, first_name: 'Other', username: 'BalancySpace_bot' },
      }),
    });

    const result = await verifyTelegramBotConnection({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(result).toEqual({
      ok: true,
      bot: { id: 1, username: 'BalancySpace_bot', firstName: 'Other' },
    });
  });

  it('preserves Telegram getMe username casing', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          id: 42,
          is_bot: true,
          first_name: 'Balancy',
          username: 'BalancySpace_bot',
        },
      }),
    });

    const result = await verifyTelegramBotConnection({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(result.ok && result.bot.username).toBe('BalancySpace_bot');
  });

  it('does not break the caller when Telegram API fails', async () => {
    const log = mockLogger();
    const fetchFn = vi.fn().mockRejectedValue(new Error(`getaddrinfo ${TEST_TOKEN} failed`));

    const result = await verifyTelegramBotConnection({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    expect(result).toEqual({ ok: false, reason: 'request_failed' });
    expect(serialiseLogs(log)).not.toContain(TEST_TOKEN);
  });

  it('does not break the caller when Telegram returns an API error', async () => {
    const log = mockLogger();
    const fetchFn = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({
        ok: false,
        error_code: 401,
        description: `Unauthorized token=${TEST_TOKEN}`,
      }),
    });

    const result = await verifyTelegramBotConnection({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    expect(result).toEqual({ ok: false, reason: 'api_error' });
    expect(serialiseLogs(log)).not.toContain(TEST_TOKEN);
  });

  it('maps 403 Forbidden to blocked', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 403,
      json: async () => ({
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      }),
    });

    const { sendTelegramMessage } = await import('./telegram.service.js');
    const result = await sendTelegramMessage('1', 'hi', undefined, {
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(result).toEqual({ ok: false, reason: 'blocked' });
  });
});

describe('getTelegramHealthStatus', () => {
  it('reports unconfigured without calling Telegram', async () => {
    const fetchFn = vi.fn();
    const status = await getTelegramHealthStatus({
      runtime: { configured: false, expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME },
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(status).toEqual({ configured: false, connected: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reports connected after a successful getMe', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          id: 42,
          is_bot: true,
          first_name: 'Blancy',
          username: `@${EXPECTED_TELEGRAM_BOT_USERNAME}`,
        },
      }),
    });

    const status = await getTelegramHealthStatus({
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(status).toEqual({ configured: true, connected: true });
  });
});

describe('probeTelegramOnBoot', () => {
  it('warns in development when the token is missing and does not throw', async () => {
    const log = mockLogger();
    await expect(
      probeTelegramOnBoot({
        runtime: { configured: false, expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME },
        fetchFn: vi.fn() as unknown as typeof fetch,
        log,
        isProduction: false,
      }),
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith(
      'TELEGRAM_BOT_TOKEN is not set; Telegram features are disabled',
    );
    expect(serialiseLogs(log)).not.toMatch(/123456:/);
  });

  it('reports that Telegram is unconfigured in production without crashing', async () => {
    const log = mockLogger();
    await expect(
      probeTelegramOnBoot({
        runtime: { configured: false, expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME },
        fetchFn: vi.fn() as unknown as typeof fetch,
        log,
        isProduction: true,
      }),
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith('Telegram is not configured; bot features are disabled');
  });
});

describe('callTelegramApi logging', () => {
  it('never logs the bot token even when the fetch URL would contain it', async () => {
    const log = mockLogger();
    const fetchFn = vi.fn().mockRejectedValue(new Error(`Failed to fetch https://api.telegram.org/bot${TEST_TOKEN}/getMe`));

    await callTelegramApi('getMe', undefined, {
      runtime: configuredRuntime,
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    const dumped = serialiseLogs(log);
    expect(dumped).not.toContain(TEST_TOKEN);
    expect(dumped).toContain('[redacted]');
  });
});

describe('sanitizeTelegramLogText', () => {
  it('redacts a bot token embedded in a URL', () => {
    const text = `https://api.telegram.org/bot${TEST_TOKEN}/getMe`;
    expect(sanitizeTelegramLogText(text, TEST_TOKEN)).not.toContain(TEST_TOKEN);
  });
});

describe('setTelegramWebhook', () => {
  it('returns Telegram description when setWebhook fails', async () => {
    const { setTelegramWebhook, resetTelegramWebhookEnsureCache } = await import('./telegram.service.js');
    resetTelegramWebhookEnsureCache();
    const log = mockLogger();
    const fetchFn = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        ok: false,
        error_code: 400,
        description: 'Bad Request: bad webhook: Failed to resolve host',
      }),
    });

    const result = await setTelegramWebhook({
      runtime: {
        ...configuredRuntime,
        webhookSecret: 'valid_webhook_secret_123',
      },
      fetchFn: fetchFn as unknown as typeof fetch,
      log,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('api_error');
    expect(result.httpStatus).toBe(400);
    expect(result.errorCode).toBe(400);
    expect(result.description).toContain('bad webhook');
    expect(result.webhookUrl).toContain('/api/telegram/webhook');
    expect(JSON.stringify(result)).not.toContain(TEST_TOKEN);
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain(TEST_TOKEN);
  });

  it('rejects invalid TELEGRAM_WEBHOOK_SECRET characters without calling Telegram', async () => {
    const { setTelegramWebhook } = await import('./telegram.service.js');
    const fetchFn = vi.fn();
    const result = await setTelegramWebhook({
      runtime: {
        ...configuredRuntime,
        webhookSecret: 'bad secret with spaces!',
      },
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid_webhook_secret');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('calls getWebhookInfo after successful setWebhook', async () => {
    const { setTelegramWebhook, resetTelegramWebhookEnsureCache } = await import('./telegram.service.js');
    resetTelegramWebhookEnsureCache();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ ok: true, result: true }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            url: 'https://www.mebelboshqaruv.uz/api/telegram/webhook',
            pending_update_count: 0,
          },
        }),
      });

    const result = await setTelegramWebhook({
      runtime: {
        ...configuredRuntime,
        webhookSecret: 'valid_webhook_secret_123',
      },
      fetchFn: fetchFn as unknown as typeof fetch,
      log: mockLogger(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.info?.url).toBe('https://www.mebelboshqaruv.uz/api/telegram/webhook');
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('/setWebhook');
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain('/getWebhookInfo');
  });
});
