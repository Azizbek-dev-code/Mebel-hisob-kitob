import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../utils/api-error.js';
import { EXPECTED_TELEGRAM_BOT_USERNAME } from './telegram.types.js';
import {
  assertTelegramWebhookAuthorized,
  ingestTelegramWebhookUpdate,
  telegramWebhookSecretsMatch,
} from './telegram.webhook.js';

function fakeRequest(secret?: string) {
  return {
    header: (name: string) =>
      name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? secret : undefined,
  } as never;
}

describe('telegramWebhookSecretsMatch', () => {
  it('accepts an exact secret and rejects mismatches without throwing', () => {
    expect(telegramWebhookSecretsMatch('abc', 'abc')).toBe(true);
    expect(telegramWebhookSecretsMatch('abc', 'abd')).toBe(false);
    expect(telegramWebhookSecretsMatch(undefined, 'abc')).toBe(false);
    expect(telegramWebhookSecretsMatch('abc', undefined)).toBe(false);
  });
});

describe('assertTelegramWebhookAuthorized', () => {
  it('rejects webhooks when Telegram is not configured', () => {
    expect(() =>
      assertTelegramWebhookAuthorized(fakeRequest('secret'), {
        configured: false,
        expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
      }),
    ).toThrow(ApiError);
  });

  it('rejects webhooks when the webhook secret is missing', () => {
    expect(() =>
      assertTelegramWebhookAuthorized(fakeRequest('secret'), {
        configured: true,
        expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
        token: '123456:TEST',
      }),
    ).toThrow(ApiError);
  });

  it('accepts a matching Telegram secret-token header', () => {
    expect(() =>
      assertTelegramWebhookAuthorized(fakeRequest('hook-secret'), {
        configured: true,
        expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
        token: '123456:TEST',
        webhookSecret: 'hook-secret',
      }),
    ).not.toThrow();
  });
});

describe('ingestTelegramWebhookUpdate', () => {
  it('acknowledges an update without logging secrets', async () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const result = await ingestTelegramWebhookUpdate({ update_id: 9 }, log);
    expect(result).toEqual({ accepted: true, updateId: 9 });
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('TELEGRAM_BOT_TOKEN');
  });
});
