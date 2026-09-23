import { env } from '../../config/env.js';

import {
  DEFAULT_PUBLIC_APP_URL,
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
/** Canonical username from getMe/DB (preserves Telegram casing). Never a hardcode. */
let dbBotUsernameOverride: string | undefined;

/** Test helper — clears admin-saved token overlay. */
export function clearTelegramDbRuntimeOverride(): void {
  dbTokenOverride = undefined;
  dbBotUsernameOverride = undefined;
}

/** Strip @ only — preserve Telegram getMe casing for display and deep-links. */
export function canonicalBotUsername(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^@+/, '');
}

/** Case-insensitive compare key for usernames. */
export function normaliseBotUsername(value: string | null | undefined): string {
  return canonicalBotUsername(value).toLowerCase();
}

/**
 * Applies decrypted DB token and/or getMe username for subsequent calls.
 * Only updates fields that are provided — never wipes the other overlay.
 * Never logs the token.
 */
export function applyTelegramDbRuntime(input: {
  token?: string;
  botUsername?: string | null;
}): void {
  if ('token' in input) {
    dbTokenOverride = blankToUndefined(input.token);
  }
  if ('botUsername' in input) {
    const canonical = canonicalBotUsername(input.botUsername);
    dbBotUsernameOverride = canonical || undefined;
  }
}

export function resolveTelegramRuntime(source: TelegramEnvSource): TelegramRuntimeConfig {
  const token = blankToUndefined(source.TELEGRAM_BOT_TOKEN);
  const webhookSecret = blankToUndefined(source.TELEGRAM_WEBHOOK_SECRET);
  return {
    configured: Boolean(token),
    // Env-only path has no getMe yet — empty until DB hydrate / Refresh / resolveTelegramBotUsername.
    expectedUsername: '',
    token,
    webhookSecret,
  };
}

/**
 * Active runtime: admin DB token/username overlay env fallbacks.
 * Bot username source of truth: DB (from Telegram getMe) via applyTelegramDbRuntime.
 * Never invents a hardcoded bot username.
 */
export function readTelegramRuntime(): TelegramRuntimeConfig {
  const envRuntime = resolveTelegramRuntime({
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET,
  });
  const token = dbTokenOverride ?? envRuntime.token;
  return {
    configured: Boolean(token),
    expectedUsername: canonicalBotUsername(dbBotUsernameOverride),
    token,
    webhookSecret: envRuntime.webhookSecret,
  };
}

/**
 * Public (non-secret) bot identity for deep-links.
 * Uses the same active runtime as Bot API calls (DB username when hydrated).
 */
export function readTelegramPublicConfig(source?: TelegramEnvSource): TelegramPublicConfig {
  if (source) {
    const runtime = resolveTelegramRuntime(source);
    return {
      configured: runtime.configured,
      expectedUsername: runtime.expectedUsername,
    };
  }
  const runtime = readTelegramRuntime();
  return {
    configured: runtime.configured,
    expectedUsername: runtime.expectedUsername,
  };
}

/**
 * Sync active bot username (no @) from runtime overlay.
 * Prefer `resolveTelegramBotUsername()` for connect/deep-links — that reads DB/getMe.
 * Returns '' when not yet hydrated (never a hardcoded legacy bot).
 */
export function getTelegramBotUsername(): string {
  return readTelegramPublicConfig().expectedUsername;
}

/** @deprecated Use getTelegramBotUsername — same runtime source. */
export function getActiveBotUsername(): string {
  return getTelegramBotUsername();
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
  const fromEnv = blankToUndefined(source ? source.PUBLIC_APP_URL : env.PUBLIC_APP_URL);
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
