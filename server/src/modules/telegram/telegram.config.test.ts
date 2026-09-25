import { describe, expect, it } from 'vitest';

import { env } from '../../config/env.js';
import {
  applyTelegramDbRuntime,
  clearTelegramDbRuntimeOverride,
  getTelegramBotUsername,
  getPublicAppUrl,
  getTelegramWebhookUrl,
  readTelegramPublicConfig,
  resolveTelegramRuntime,
} from './telegram.config.js';
import { DEFAULT_PUBLIC_APP_URL } from './telegram.types.js';

describe('resolveTelegramRuntime', () => {
  it('reads optional TELEGRAM_BOT_TOKEN from env without requiring it', () => {
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
    expect(env.TELEGRAM_WEBHOOK_SECRET).toBeUndefined();
  });

  it('reads a present bot token as configured without inventing a bot username', () => {
    const runtime = resolveTelegramRuntime({
      TELEGRAM_BOT_TOKEN: '123456:TESTTOKEN',
      TELEGRAM_WEBHOOK_SECRET: 'hook-secret',
    });

    expect(runtime.configured).toBe(true);
    expect(runtime.expectedUsername).toBe('');
    expect(runtime.token).toBe('123456:TESTTOKEN');
    expect(runtime.webhookSecret).toBe('hook-secret');
  });

  it('treats a missing token as unconfigured and does not crash', () => {
    const runtime = resolveTelegramRuntime({});

    expect(runtime.configured).toBe(false);
    expect(runtime.token).toBeUndefined();
    expect(runtime.expectedUsername).toBe('');
  });

  it('treats a blank token as unconfigured', () => {
    const runtime = resolveTelegramRuntime({ TELEGRAM_BOT_TOKEN: '   ' });

    expect(runtime.configured).toBe(false);
    expect(runtime.token).toBeUndefined();
  });
});

describe('getPublicAppUrl / getTelegramWebhookUrl', () => {
  it('defaults to the current production origin when PUBLIC_APP_URL is unset', () => {
    expect(getPublicAppUrl({})).toBe(DEFAULT_PUBLIC_APP_URL);
    expect(getTelegramWebhookUrl({})).toBe(`${DEFAULT_PUBLIC_APP_URL}/api/telegram/webhook`);
    expect(DEFAULT_PUBLIC_APP_URL).toBe('https://balancy.space');
  });

  it('keeps balancy.space production hosts as-is', () => {
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://balancy.space' })).toBe(
      'https://balancy.space',
    );
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://www.balancy.space/' })).toBe(
      'https://www.balancy.space',
    );
    expect(
      getTelegramWebhookUrl({
        PUBLIC_APP_URL: 'https://balancy.space',
      }),
    ).toBe('https://balancy.space/api/telegram/webhook');
  });

  it('rewrites retired mebelboshqaruv.uz origin to current production host', () => {
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://www.mebelboshqaruv.uz' })).toBe(
      DEFAULT_PUBLIC_APP_URL,
    );
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://mebelboshqaruv.uz/' })).toBe(
      DEFAULT_PUBLIC_APP_URL,
    );
    expect(
      getTelegramWebhookUrl({
        TELEGRAM_WEBHOOK_URL: 'https://www.mebelboshqaruv.uz/api/telegram/webhook',
      }),
    ).toBe(`${DEFAULT_PUBLIC_APP_URL}/api/telegram/webhook`);
  });

  it('honours explicit TELEGRAM_WEBHOOK_URL on non-legacy hosts', () => {
    expect(
      getTelegramWebhookUrl({
        PUBLIC_APP_URL: 'https://example.com',
        TELEGRAM_WEBHOOK_URL: 'https://hooks.example.com/tg',
      }),
    ).toBe('https://hooks.example.com/tg');
  });
});

describe('active bot username', () => {
  it('uses DB username override for deep-links after admin token save (preserves casing)', () => {
    clearTelegramDbRuntimeOverride();
    applyTelegramDbRuntime({ token: '123:ABC', botUsername: '@BalancySpace_bot' });
    expect(getTelegramBotUsername()).toBe('BalancySpace_bot');
    expect(readTelegramPublicConfig().expectedUsername).toBe('BalancySpace_bot');
    clearTelegramDbRuntimeOverride();
  });

  it('does not invent a username when runtime is empty', () => {
    clearTelegramDbRuntimeOverride();
    expect(getTelegramBotUsername()).toBe('');
  });

  it('can apply username without wiping an existing token overlay', () => {
    clearTelegramDbRuntimeOverride();
    applyTelegramDbRuntime({ token: '123:ABC' });
    applyTelegramDbRuntime({ botUsername: 'BalancySpace_bot' });
    expect(getTelegramBotUsername()).toBe('BalancySpace_bot');
    expect(readTelegramPublicConfig().configured).toBe(true);
    clearTelegramDbRuntimeOverride();
  });
});
