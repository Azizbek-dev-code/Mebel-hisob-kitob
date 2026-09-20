/**
 * One-shot Telegram setWebhook helper.
 * Loads server/.env when present. Never prints the bot token.
 *
 * Usage: node scripts/telegram-set-webhook.mjs
 */
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(serverRoot, '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const publicUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
const webhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL?.trim() ||
  (publicUrl ? `${publicUrl}/api/telegram/webhook` : '');

if (!token || !secret) {
  console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required');
  process.exit(1);
}

if (!webhookUrl) {
  console.error(
    'Set TELEGRAM_WEBHOOK_URL (preferred) or PUBLIC_APP_URL before setWebhook.\n' +
      'Local example: TELEGRAM_WEBHOOK_URL=https://YOUR-TUNNEL/api/telegram/webhook',
  );
  process.exit(1);
}

if (/balancy\.space/i.test(webhookUrl) && process.env.NODE_ENV !== 'production') {
  console.error(
    'Refusing to set webhook to balancy.space while NODE_ENV is not production.\n' +
      'Use your local tunnel URL for local testing.',
  );
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  }),
});

const payload = await response.json().catch(() => ({}));
if (payload?.ok) {
  console.log('Webhook set OK');
  console.log(`URL host: ${new URL(webhookUrl).host}`);
  process.exit(0);
}

console.error('Webhook set failed');
console.error(`HTTP ${response.status}; description: ${payload?.description ?? 'unknown'}`);
process.exit(1);
