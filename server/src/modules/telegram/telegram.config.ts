import { env } from '../../config/env.js';

import {
  DEFAULT_PUBLIC_APP_URL,
  EXPECTED_TELEGRAM_BOT_USERNAME,
  LEGACY_PUBLIC_APP_HOSTS,
  type TelegramPublicConfig,
  type TelegramRuntimeConfig,
} from './telegram.types.js';

export interface TelegramEnvSource {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  PUBLIC_APP_URL?: string;
  TELEGRAM_WEBHOOK_URL?: string;
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Reads Telegram settings from an env-like object. Missing or blank token
 * means "not configured" — callers must not crash.
 */
let dbTokenOverride: string | undefined;
let dbBotUsernameOverride: string | undefined;

/** Test helper — clears admin-saved token overlay. */
export function clearTelegramDbRuntimeOverride(): void {
  dbTokenOverride = undefined;
  dbBotUsernameOverride = undefined;
}

/** Applies a decrypted DB token for subsequent Bot API calls. Never logs the token. */
export function applyTelegramDbRuntime(input: { token?: string; botUsername?: string | null }): void {
  dbTokenOverride = blankToUndefined(input.token);
  dbBotUsernameOverride = blankToUndefined(input.botUsername ?? undefined);
}

export function resolveTelegramRuntime(source: TelegramEnvSource): TelegramRuntimeConfig {
  const token = blankToUndefined(source.TELEGRAM_BOT_TOKEN);
  const webhookSecret = blankToUndefined(source.TELEGRAM_WEBHOOK_SECRET);
  return {
    configured: Boolean(token),
    expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
    token,
    webhookSecret,
  };
}

export function readTelegramRuntime(): TelegramRuntimeConfig {
  const envRuntime = resolveTelegramRuntime({
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET,
  });
  const token = dbTokenOverride ?? envRuntime.token;
  return {
    configured: Boolean(token),
    expectedUsername: dbBotUsernameOverride || envRuntime.expectedUsername,
    token,
    webhookSecret: envRuntime.webhookSecret,
  };
}

export function readTelegramPublicConfig(
  source: TelegramEnvSource = {
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET,
  },
): TelegramPublicConfig {
  const runtime = resolveTelegramRuntime(source);
  return {
    configured: runtime.configured,
    expectedUsername: runtime.expectedUsername,
  };
}

function rewriteLegacyPublicOrigin(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    if ((LEGACY_PUBLIC_APP_HOSTS as readonly string[]).includes(parsed.hostname.toLowerCase())) {
      parsed.protocol = 'https:';
      parsed.hostname = new URL(DEFAULT_PUBLIC_APP_URL).hostname;
      parsed.port = '';
      return parsed.toString().replace(/\/+$/, '');
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

/** Public SPA origin used for /app deep-links. Never includes secrets. */
export function getPublicAppUrl(source?: TelegramEnvSource): string {
  // When a source object is passed (tests / overrides), only that object is read —
  // do not fall back to process env, so callers can assert defaults.
  const fromEnv = blankToUndefined(
    source ? source.PUBLIC_APP_URL : env.PUBLIC_APP_URL,
  );
  if (fromEnv) return rewriteLegacyPublicOrigin(fromEnv);
  return DEFAULT_PUBLIC_APP_URL;
}

/** Webhook endpoint Telegram should POST to. */
export function getTelegramWebhookUrl(source?: TelegramEnvSource): string {
  const explicit = blankToUndefined(
    source ? source.TELEGRAM_WEBHOOK_URL : env.TELEGRAM_WEBHOOK_URL,
  );
  if (explicit) return rewriteLegacyPublicOrigin(explicit);
  return `${getPublicAppUrl(source)}/api/telegram/webhook`;
}
