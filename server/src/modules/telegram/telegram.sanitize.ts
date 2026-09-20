const BOT_TOKEN_IN_URL = /bot\d+:[A-Za-z0-9_-]+/g;

/**
 * Strips bot tokens from text before it is logged or returned.
 * The Bot API URL embeds the token (`/bot<token>/<method>`), so raw Error
 * messages and fetch URLs must never be logged as-is.
 */
export function sanitizeTelegramLogText(text: string, token?: string): string {
  let out = text;
  if (token) {
    out = out.split(token).join('[redacted]');
  }
  return out.replace(BOT_TOKEN_IN_URL, 'bot[redacted]');
}

export function assertNoTelegramSecrets(
  value: unknown,
  secrets: Array<string | undefined>,
): void {
  const serialized = JSON.stringify(value);
  if (serialized.includes('TELEGRAM_BOT_TOKEN') || serialized.includes('TELEGRAM_WEBHOOK_SECRET')) {
    throw new Error('Telegram secret key leaked into a serialised payload');
  }
  for (const secret of secrets) {
    if (secret && serialized.includes(secret)) {
      throw new Error('Telegram secret value leaked into a serialised payload');
    }
  }
}
