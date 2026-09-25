/**
 * Server-side Telegram types.
 *
 * Public payloads never include the bot token, webhook secret, or raw chat
 * identity until account linking stores them on `TelegramConnection` (not on `User`).
 */

/**
 * @deprecated Not used for Admin UI, connect deep-links, or webhooks.
 * Connect uses resolveTelegramBotUsername() → DB/getMe only.
 * Kept as a test fixture alias so older unit tests compile.
 */
export const EXPECTED_TELEGRAM_BOT_USERNAME = 'BalancySpace_bot';

export const TELEGRAM_API_ORIGIN = 'https://api.telegram.org';

export const TELEGRAM_WEBHOOK_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

export const TELEGRAM_LINKING_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Production SPA origin used when PUBLIC_APP_URL is unset.
 * Must match the live deployment host — never a retired domain.
 * Canonical primary is apex (non-www).
 */
export const DEFAULT_PUBLIC_APP_URL = 'https://balancy.space';

/** Retired hosts — rewritten to DEFAULT_PUBLIC_APP_URL so stale env cannot break webhooks. */
export const LEGACY_PUBLIC_APP_HOSTS = ['mebelboshqaruv.uz', 'www.mebelboshqaruv.uz'] as const;

export const DEFAULT_TELEGRAM_START_TEXT =
  "👋 Balancy Space'ga xush kelibsiz!\n\n" +
  '🏠 Shaxsiy hisob\n' +
  'Daromad, xarajat, qarz, budjet, maqsad va kundalik moliyangizni boshqaring.\n\n' +
  '💼 Business hisob\n' +
  'Biznesingizning sotuv, ombor, xarajat va hisob-kitoblarini boshqaring.\n\n' +
  '🚀 Hammasini bitta joyda boshqaring.';

export const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;
export const TELEGRAM_CAPTION_MAX_LENGTH = 1024;
export const TELEGRAM_BUTTON_TEXT_MAX_LENGTH = 64;
export const TELEGRAM_BROADCAST_BATCH_SIZE = 25;
export const TELEGRAM_BROADCAST_BATCH_DELAY_MS = 1_100;
export const TELEGRAM_BROADCAST_TICK_MAX_MS = 20_000;

/** Inline callback_data prefixes (max 64 bytes including pending id). */
export const TELEGRAM_CB_LINK_OK = 'tg:link:ok:';
export const TELEGRAM_CB_LINK_NO = 'tg:link:no:';
export const TELEGRAM_CB_UNLINK_OK = 'tg:unlink:ok';
export const TELEGRAM_CB_UNLINK_NO = 'tg:unlink:no';
export const TELEGRAM_CB_MENU = 'tg:m:';

export interface TelegramHealthStatus {
  configured: boolean;
  connected: boolean;
}

export interface TelegramPublicConfig {
  configured: boolean;
  expectedUsername: string;
}

export interface TelegramRuntimeConfig extends TelegramPublicConfig {
  /** Present only in memory. Never serialise this into logs or HTTP bodies. */
  token?: string;
  webhookSecret?: string;
}

export interface TelegramBotIdentity {
  id: number;
  username: string;
  firstName: string;
}

export type TelegramConnectionFailureReason =
  | 'not_configured'
  | 'request_failed'
  | 'api_error'
  | 'blocked'
  | 'invalid_response'
  | 'unexpected_username';

export type TelegramBotConnectionResult =
  | { ok: true; bot: TelegramBotIdentity }
  | { ok: false; reason: TelegramConnectionFailureReason };

/**
 * Minimal Bot API envelope. `result` is untyped at the wire; callers narrow it.
 * Never log the request URL — it embeds the bot token.
 */
export interface TelegramApiEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramGetMeResult {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date?: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
  chat_instance?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: unknown;
  my_chat_member?: unknown;
}

export interface TelegramWebhookAck {
  accepted: boolean;
}

/**
 * In-memory linking issue before persistence. The public start payload is a
 * random token; `identityId` stays server-side and must never appear in the deep-link.
 */
export interface TelegramLinkingIssue {
  identityId: string;
  tokenHash: string;
  startPayload: string;
  deepLink: string;
  expiresAt: Date;
}

export type TelegramBizPrefKey =
  | 'bizNotifySales'
  | 'bizNotifyInventory'
  | 'bizNotifyDelivery'
  | 'bizNotifyAssembly'
  | 'bizNotifyWorkers'
  | 'bizNotifyBilling'
  | 'bizNotifyImportant';

export type TelegramPersonalPrefKey =
  | 'personalNotifyBudget'
  | 'personalNotifyGoals'
  | 'personalNotifyRecurring'
  | 'personalNotifyDebts';

export type TelegramPrefBooleanField =
  | 'notifyBusiness'
  | 'notifyPersonal'
  | TelegramBizPrefKey
  | TelegramPersonalPrefKey
  | 'notifyDailySummaryBusiness'
  | 'notifyDailySummaryPersonal'
  | 'notifyWeeklySummaryBusiness'
  | 'notifyWeeklySummaryPersonal'
  | 'notifyMonthlySummaryBusiness'
  | 'notifyMonthlySummaryPersonal';

export type TelegramLogSink = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};
