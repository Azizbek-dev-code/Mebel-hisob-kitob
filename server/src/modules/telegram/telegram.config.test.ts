import { describe, expect, it } from 'vitest';

import { env } from '../../config/env.js';
import {
  applyTelegramDbRuntime,
  clearTelegramDbRuntimeOverride,
  getActiveBotUsername,
  getPublicAppUrl,
  getTelegramWebhookUrl,
  readTelegramPublicConfig,
  resolveTelegramRuntime,
} from './telegram.config.js';
import { DEFAULT_PUBLIC_APP_URL, EXPECTED_TELEGRAM_BOT_USERNAME } from './telegram.types.js';

describe('resolveTelegramRuntime', () => {
  it('reads optional TELEGRAM_BOT_TOKEN from env without requiring it', () => {
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
    expect(env.TELEGRAM_WEBHOOK_SECRET).toBeUndefined();
  });

  it('reads a present bot token as configured without exposing extra keys', () => {
    const runtime = resolveTelegramRuntime({
      TELEGRAM_BOT_TOKEN: '123456:TESTTOKEN',
      TELEGRAM_WEBHOOK_SECRET: 'hook-secret',
    });

    expect(runtime.configured).toBe(true);
    expect(runtime.expectedUsername).toBe(EXPECTED_TELEGRAM_BOT_USERNAME);
    expect(runtime.token).toBe('123456:TESTTOKEN');
    expect(runtime.webhookSecret).toBe('hook-secret');
  });

  it('treats a missing token as unconfigured and does not crash', () => {
    const runtime = resolveTelegramRuntime({});

    expect(runtime.configured).toBe(false);
    expect(runtime.token).toBeUndefined();
    expect(runtime.expectedUsername).toBe(EXPECTED_TELEGRAM_BOT_USERNAME);
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
    expect(DEFAULT_PUBLIC_APP_URL).toBe('https://www.mebelboshqaruv.uz');
  });

  it('keeps mebelboshqaruv.uz production hosts as-is', () => {
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://www.mebelboshqaruv.uz' })).toBe(
      'https://www.mebelboshqaruv.uz',
    );
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://mebelboshqaruv.uz/' })).toBe(
      'https://mebelboshqaruv.uz',
    );
    expect(
      getTelegramWebhookUrl({
        PUBLIC_APP_URL: 'https://www.mebelboshqaruv.uz',
      }),
    ).toBe('https://www.mebelboshqaruv.uz/api/telegram/webhook');
  });

  it('rewrites retired balancy.space origin to current production host', () => {
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://balancy.space' })).toBe(DEFAULT_PUBLIC_APP_URL);
    expect(getPublicAppUrl({ PUBLIC_APP_URL: 'https://www.balancy.space/' })).toBe(DEFAULT_PUBLIC_APP_URL);
    expect(
      getTelegramWebhookUrl({
        TELEGRAM_WEBHOOK_URL: 'https://balancy.space/api/telegram/webhook',
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
    expect(getActiveBotUsername()).toBe('BalancySpace_bot');
    expect(readTelegramPublicConfig().expectedUsername).toBe('BalancySpace_bot');
    clearTelegramDbRuntimeOverride();
  });

  it('never returns old blancyspace_bot as the code default', () => {
    clearTelegramDbRuntimeOverride();
    expect(EXPECTED_TELEGRAM_BOT_USERNAME).toBe('balancyspace_bot');
    expect(getActiveBotUsername()).toBe('balancyspace_bot');
  });
});
