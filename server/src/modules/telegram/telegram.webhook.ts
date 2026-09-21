import { timingSafeEqual } from 'node:crypto';

import type { Request } from 'express';

import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { hydrateTelegramRuntimeFromDb } from './telegram.admin.service.js';
import { handleTelegramUpdate } from './telegram.commands.js';
import { readTelegramRuntime } from './telegram.config.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import {
  TELEGRAM_WEBHOOK_SECRET_HEADER,
  type TelegramLogSink,
  type TelegramRuntimeConfig,
  type TelegramUpdate,
} from './telegram.types.js';

export function telegramWebhookSecretsMatch(
  provided: string | undefined,
  expected: string | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function readTelegramWebhookSecretHeader(req: Request): string | undefined {
  const value = req.header(TELEGRAM_WEBHOOK_SECRET_HEADER);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Public webhook gate. Telegram cannot send our session cookie, so this route
 * is unauthenticated and must verify `X-Telegram-Bot-Api-Secret-Token`.
 */
export function assertTelegramWebhookAuthorized(
  req: Request,
  runtime: TelegramRuntimeConfig = readTelegramRuntime(),
): void {
  if (!runtime.configured) {
    throw ApiError.unauthorized('Telegram webhook is not enabled');
  }
  if (!runtime.webhookSecret) {
    throw ApiError.unauthorized('Telegram webhook is not enabled');
  }
  const provided = readTelegramWebhookSecretHeader(req);
  if (!telegramWebhookSecretsMatch(provided, runtime.webhookSecret)) {
    throw ApiError.unauthorized('Telegram webhook is not enabled');
  }
}

/**
 * Serverless-safe gate: load the admin-saved token from DB before verifying
 * Telegram's secret header. Never logs the token.
 */
export async function authorizeTelegramWebhook(req: Request): Promise<void> {
  await hydrateTelegramRuntimeFromDb();
  assertTelegramWebhookAuthorized(req);
}

/**
 * Acknowledge a validated update and dispatch commands. Handler errors are
 * logged (sanitized) and never fail the HTTP ack — Telegram would otherwise retry.
 */
export async function ingestTelegramWebhookUpdate(
  update: TelegramUpdate,
  log: TelegramLogSink = logger,
): Promise<{ accepted: true; updateId: number }> {
  log.info('Telegram webhook update accepted', { updateId: update.update_id });
  try {
    await handleTelegramUpdate(update, log);
  } catch (error) {
    log.warn('Telegram update handler failed', {
      updateId: update.update_id,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
  return { accepted: true, updateId: update.update_id };
}
