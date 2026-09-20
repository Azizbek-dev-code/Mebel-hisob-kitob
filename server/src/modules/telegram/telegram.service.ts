import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getTelegramWebhookUrl, readTelegramRuntime } from './telegram.config.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import {
  EXPECTED_TELEGRAM_BOT_USERNAME,
  TELEGRAM_API_ORIGIN,
  type TelegramApiEnvelope,
  type TelegramBotConnectionResult,
  type TelegramBotIdentity,
  type TelegramGetMeResult,
  type TelegramHealthStatus,
  type TelegramInlineKeyboardMarkup,
  type TelegramLogSink,
  type TelegramRuntimeConfig,
} from './telegram.types.js';

export interface TelegramClientDeps {
  runtime?: TelegramRuntimeConfig;
  fetchFn?: typeof fetch;
  log?: TelegramLogSink;
  timeoutMs?: number;
  nowMs?: () => number;
  isProduction?: boolean;
}

const DEFAULT_TIMEOUT_MS = 4_000;
const HEALTH_PROBE_TTL_MS = 60_000;

let cachedHealth: { at: number; status: TelegramHealthStatus } | null = null;
let ensureWebhookPromise: Promise<{ ok: boolean; reason?: string }> | null = null;

export function resetTelegramHealthCache(): void {
  cachedHealth = null;
}

/** Test helper — clears the one-shot webhook ensure cache. */
export function resetTelegramWebhookEnsureCache(): void {
  ensureWebhookPromise = null;
}

function resolveDeps(deps?: TelegramClientDeps): Required<Omit<TelegramClientDeps, 'runtime'>> & {
  runtime: TelegramRuntimeConfig;
} {
  return {
    runtime: deps?.runtime ?? readTelegramRuntime(),
    fetchFn: deps?.fetchFn ?? fetch,
    log: deps?.log ?? logger,
    timeoutMs: deps?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    nowMs: deps?.nowMs ?? (() => Date.now()),
    isProduction: deps?.isProduction ?? env.isProduction,
  };
}

function normaliseUsername(username: string | undefined): string {
  return (username ?? '').trim().replace(/^@/, '').toLowerCase();
}

function toBotIdentity(result: TelegramGetMeResult): TelegramBotIdentity | null {
  if (!result.is_bot || typeof result.id !== 'number' || !result.first_name) {
    return null;
  }
  const username = normaliseUsername(result.username);
  if (!username) return null;
  return { id: result.id, username, firstName: result.first_name };
}

function isBlockedError(status: number, errorCode: number | undefined, description: string): boolean {
  if (status === 403 || errorCode === 403) return true;
  return /blocked by the user|bot was blocked|user is deactivated|forbidden: bot/i.test(description);
}

export type TelegramApiFailureReason = 'not_configured' | 'request_failed' | 'api_error' | 'blocked';

/**
 * Single gateway for Telegram Bot API HTTP calls.
 * The request URL contains the bot token — never log it.
 */
export async function callTelegramApi<T>(
  method: string,
  body: unknown | undefined,
  deps?: TelegramClientDeps,
): Promise<{ ok: true; result: T } | { ok: false; reason: TelegramApiFailureReason }> {
  const { runtime, fetchFn, log, timeoutMs } = resolveDeps(deps);
  if (!runtime.token) {
    return { ok: false, reason: 'not_configured' };
  }

  const url = `${TELEGRAM_API_ORIGIN}/bot${runtime.token}/${method}`;
  try {
    const response = await fetchFn(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const payload = (await response.json()) as TelegramApiEnvelope<T>;
    if (!payload.ok || payload.result === undefined) {
      const description = payload.description ?? 'unknown';
      const blocked = isBlockedError(response.status, payload.error_code, description);
      log.warn('Telegram Bot API returned an error', {
        method,
        status: response.status,
        description: sanitizeTelegramLogText(description, runtime.token),
        ...(blocked ? { blocked: true } : {}),
      });
      return { ok: false, reason: blocked ? 'blocked' : 'api_error' };
    }
    return { ok: true, result: payload.result };
  } catch (error) {
    log.warn('Telegram Bot API request failed', {
      method,
      message: sanitizeTelegramLogText(
        error instanceof Error ? error.message : String(error),
        runtime.token,
      ),
    });
    return { ok: false, reason: 'request_failed' };
  }
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
  deps?: TelegramClientDeps,
): Promise<{ ok: true } | { ok: false; reason: TelegramApiFailureReason }> {
  const api = await callTelegramApi<unknown>(
    'sendMessage',
    {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    },
    deps,
  );
  if (!api.ok) return api;
  return { ok: true };
}

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
  deps?: TelegramClientDeps,
): Promise<{ ok: true } | { ok: false; reason: TelegramApiFailureReason }> {
  const api = await callTelegramApi<unknown>(
    'sendPhoto',
    {
      chat_id: chatId,
      photo: photoUrl,
      ...(caption ? { caption, parse_mode: 'HTML' } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    },
    deps,
  );
  if (!api.ok) return api;
  return { ok: true };
}

export async function getTelegramWebhookInfo(
  deps?: TelegramClientDeps,
): Promise<
  | {
      ok: true;
      url: string;
      pendingUpdateCount: number;
      lastErrorMessage: string | null;
    }
  | { ok: false; reason: TelegramApiFailureReason }
> {
  const api = await callTelegramApi<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  }>('getWebhookInfo', undefined, deps);
  if (!api.ok) return api;
  return {
    ok: true,
    url: api.result.url ?? '',
    pendingUpdateCount: api.result.pending_update_count ?? 0,
    lastErrorMessage: api.result.last_error_message
      ? sanitizeTelegramLogText(api.result.last_error_message, resolveDeps(deps).runtime.token)
      : null,
  };
}

/**
 * Validates a candidate bot token via getMe without requiring the expected username.
 * Used when an admin saves a new token. Never logs the token.
 */
export async function inspectTelegramBotToken(
  token: string,
  deps?: TelegramClientDeps,
): Promise<TelegramBotConnectionResult> {
  const { fetchFn, log, timeoutMs, nowMs, isProduction } = resolveDeps(deps);
  const runtime: TelegramRuntimeConfig = {
    configured: true,
    expectedUsername: EXPECTED_TELEGRAM_BOT_USERNAME,
    token,
    webhookSecret: deps?.runtime?.webhookSecret,
  };
  const api = await callTelegramApi<TelegramGetMeResult>('getMe', undefined, {
    runtime,
    fetchFn,
    log,
    timeoutMs,
    nowMs,
    isProduction,
  });
  if (!api.ok) {
    return { ok: false, reason: api.reason };
  }
  const bot = toBotIdentity(api.result);
  if (!bot) {
    return { ok: false, reason: 'invalid_response' };
  }
  return { ok: true, bot };
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  deps?: TelegramClientDeps,
): Promise<void> {
  await callTelegramApi(
    'answerCallbackQuery',
    {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    },
    deps,
  );
}

/**
 * Registers the production webhook with Telegram. Requires both bot token and
 * webhook secret. Never logs the token or full webhook URL with credentials.
 */
export async function setTelegramWebhook(
  deps?: TelegramClientDeps,
): Promise<{ ok: boolean; reason?: string }> {
  const { runtime, log } = resolveDeps(deps);
  if (!runtime.token || !runtime.webhookSecret) {
    return { ok: false, reason: 'not_configured' };
  }

  const webhookUrl = getTelegramWebhookUrl();
  const api = await callTelegramApi<boolean>(
    'setWebhook',
    {
      url: webhookUrl,
      secret_token: runtime.webhookSecret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    },
    deps,
  );

  if (!api.ok) {
    log.warn('Telegram setWebhook failed', { reason: api.reason });
    return { ok: false, reason: api.reason };
  }

  log.info('Telegram webhook registered');
  return { ok: true };
}

/**
 * Module-level one-shot ensure for serverless cold starts.
 * Safe no-op when Telegram is not fully configured.
 */
export function ensureTelegramWebhookOnce(
  deps?: TelegramClientDeps,
): Promise<{ ok: boolean; reason?: string }> {
  if (!ensureWebhookPromise) {
    ensureWebhookPromise = setTelegramWebhook(deps).catch((error) => {
      const { runtime, log } = resolveDeps(deps);
      log.warn('Telegram ensureWebhook failed', {
        message: sanitizeTelegramLogText(
          error instanceof Error ? error.message : String(error),
          runtime.token,
        ),
      });
      return { ok: false, reason: 'request_failed' };
    });
  }
  return ensureWebhookPromise;
}

export async function verifyTelegramBotConnection(
  deps?: TelegramClientDeps,
): Promise<TelegramBotConnectionResult> {
  const { runtime } = resolveDeps(deps);
  if (!runtime.configured || !runtime.token) {
    return { ok: false, reason: 'not_configured' };
  }

  const api = await callTelegramApi<TelegramGetMeResult>('getMe', undefined, deps);
  if (!api.ok) {
    return { ok: false, reason: api.reason };
  }

  const bot = toBotIdentity(api.result);
  if (!bot) {
    return { ok: false, reason: 'invalid_response' };
  }

  if (bot.username !== normaliseUsername(runtime.expectedUsername || EXPECTED_TELEGRAM_BOT_USERNAME)) {
    return { ok: false, reason: 'unexpected_username' };
  }

  return { ok: true, bot };
}

export async function probeTelegramConnection(deps?: TelegramClientDeps): Promise<TelegramHealthStatus> {
  const { runtime, nowMs } = resolveDeps(deps);
  if (!runtime.configured) {
    const status = { configured: false, connected: false };
    cachedHealth = { at: nowMs(), status };
    return status;
  }

  const result = await verifyTelegramBotConnection(deps);
  const status: TelegramHealthStatus = {
    configured: true,
    connected: result.ok,
  };
  cachedHealth = { at: nowMs(), status };
  return status;
}

/**
 * Safe health snapshot. Uses a short-lived cache so `/api/health` does not
 * call Telegram on every probe. Never includes secrets.
 */
export async function getTelegramHealthStatus(deps?: TelegramClientDeps): Promise<TelegramHealthStatus> {
  const { runtime, nowMs } = resolveDeps(deps);
  if (!runtime.configured) {
    return { configured: false, connected: false };
  }

  const now = nowMs();
  if (cachedHealth && now - cachedHealth.at < HEALTH_PROBE_TTL_MS) {
    return cachedHealth.status;
  }

  try {
    return await probeTelegramConnection(deps);
  } catch {
    return { configured: true, connected: false };
  }
}

/**
 * Boot-time connection check. Must never throw — a missing or invalid token
 * disables Telegram and leaves the rest of the API running.
 */
export async function probeTelegramOnBoot(deps?: TelegramClientDeps): Promise<void> {
  const { runtime, log, isProduction } = resolveDeps(deps);

  try {
    if (!runtime.configured) {
      if (isProduction) {
        log.warn('Telegram is not configured; bot features are disabled');
      } else {
        log.warn('TELEGRAM_BOT_TOKEN is not set; Telegram features are disabled');
      }
      return;
    }

    const result = await verifyTelegramBotConnection(deps);
    if (!result.ok) {
      log.warn('Telegram bot connection check failed', { reason: result.reason });
      return;
    }

    log.info('Telegram bot connected', { username: result.bot.username });
  } catch (error) {
    log.warn('Telegram boot probe failed', {
      message: sanitizeTelegramLogText(
        error instanceof Error ? error.message : String(error),
        runtime.token,
      ),
    });
  }
}

export type { TelegramHealthStatus };
