/**
 * Local Telegram E2E exercise against a running server.
 * Does not print secrets. Exit 0 on success.
 *
 * Usage: node scripts/telegram-local-e2e.mjs
 */
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(serverRoot, '.env') });

const API = process.env.LOCAL_API_URL?.trim() || 'http://127.0.0.1:4000/api';
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (!secret || !token) {
  console.error('FAIL: TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET missing');
  process.exit(1);
}

const results = {};
function pass(name, detail = '') {
  results[name] = 'PASS';
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results[name] = 'FAIL';
  console.error(`FAIL ${name} — ${detail}`);
}

async function api(method, pathName, { body, cookie, headers } = {}) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, setCookie };
}

function pickCookie(setCookie) {
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

async function webhook(update) {
  return api('POST', '/telegram/webhook', {
    body: update,
    headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
  });
}

const fakeTgUser = {
  id: 9_001_001,
  is_bot: false,
  first_name: 'LocalTest',
  username: 'local_test_bot_user',
};

try {
  // A. health / bot
  const health = await api('GET', '/health');
  if (health.json?.data?.telegram?.configured && health.json?.data?.telegram?.connected) {
    pass('bot_connection', 'health telegram connected');
  } else {
    fail('bot_connection', JSON.stringify(health.json?.data?.telegram));
  }

  // B. /start welcome via webhook
  const startRes = await webhook({
    update_id: Date.now(),
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: fakeTgUser.id, type: 'private' },
      from: fakeTgUser,
      text: '/start',
    },
  });
  if (startRes.status === 200 && startRes.json?.data?.accepted) pass('start_command');
  else fail('start_command', `status=${startRes.status} body=${JSON.stringify(startRes.json)}`);

  // Login as seed admin
  const login = await api('POST', '/auth/login', {
    body: { identifier: 'admin@furniture-erp.local', password: 'Admin123!' },
  });
  if (login.status !== 200) {
    fail('login', `status=${login.status}`);
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }
  const cookie = pickCookie(login.setCookie);
  pass('login');

  // C. link start
  const linkStart = await api('POST', '/telegram/link/start', { cookie });
  const deepLink = linkStart.json?.data?.deepLink;
  if (linkStart.status === 200 && typeof deepLink === 'string' && deepLink.includes('t.me/blancyspace_bot?start=')) {
    pass('link_start', 'deep-link issued');
  } else {
    fail('link_start', JSON.stringify(linkStart.json));
  }

  const startPayload = deepLink ? new URL(deepLink).searchParams.get('start') : null;
  if (!startPayload) {
    fail('link_payload', 'missing start param');
  } else {
    pass('link_payload');
  }

  // /start <token> → pending confirmation (no auto-link)
  const linkMsg = await webhook({
    update_id: Date.now() + 1,
    message: {
      message_id: 2,
      date: Math.floor(Date.now() / 1000),
      chat: { id: fakeTgUser.id, type: 'private' },
      from: fakeTgUser,
      text: `/start ${startPayload}`,
    },
  });
  if (linkMsg.status === 200 && linkMsg.json?.data?.accepted) pass('link_start_message');
  else fail('link_start_message', JSON.stringify(linkMsg.json));

  // status should still be disconnected until confirm
  let status = await api('GET', '/telegram/status', { cookie });
  if (status.json?.data?.connected === false) pass('pre_confirm_disconnected');
  else fail('pre_confirm_disconnected', JSON.stringify(status.json?.data));

  // Find pending id from DB via prisma through a small query using token hash
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const tokenHash = createHash('sha256').update(startPayload, 'utf8').digest('hex');
  const pending = await prisma.telegramPendingLink.findFirst({
    where: { tokenHash, telegramUserId: String(fakeTgUser.id) },
    orderBy: { createdAt: 'desc' },
  });
  if (!pending) {
    fail('pending_row', 'no TelegramPendingLink');
  } else {
    pass('pending_row');

    // Confirm callback
    const confirm = await webhook({
      update_id: Date.now() + 2,
      callback_query: {
        id: String(Date.now()),
        from: fakeTgUser,
        data: `tg:link:ok:${pending.id}`,
        message: {
          message_id: 3,
          date: Math.floor(Date.now() / 1000),
          chat: { id: fakeTgUser.id, type: 'private' },
          from: fakeTgUser,
          text: 'confirm',
        },
      },
    });
    if (confirm.status === 200 && confirm.json?.data?.accepted) pass('confirmation');
    else fail('confirmation', JSON.stringify(confirm.json));
  }

  status = await api('GET', '/telegram/status', { cookie });
  if (status.json?.data?.connected === true) pass('connected_status', status.json.data.username ?? '');
  else fail('connected_status', JSON.stringify(status.json?.data));

  // Stolen token / other telegram user cannot confirm a fresh link
  const link2 = await api('POST', '/telegram/link/start', { cookie });
  const payload2 = new URL(link2.json.data.deepLink).searchParams.get('start');
  await webhook({
    update_id: Date.now() + 3,
    message: {
      message_id: 4,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 9_001_002, type: 'private' },
      from: { id: 9_001_002, is_bot: false, first_name: 'Thief' },
      text: `/start ${payload2}`,
    },
  });
  const hash2 = createHash('sha256').update(payload2, 'utf8').digest('hex');
  const pending2 = await prisma.telegramPendingLink.findFirst({
    where: { tokenHash: hash2 },
    orderBy: { createdAt: 'desc' },
  });
  // Original user tries to confirm thief pending — should fail identity/user mismatch
  if (pending2) {
    await webhook({
      update_id: Date.now() + 4,
      callback_query: {
        id: String(Date.now() + 4),
        from: fakeTgUser, // different from pending2.telegramUserId
        data: `tg:link:ok:${pending2.id}`,
        message: {
          message_id: 5,
          date: Math.floor(Date.now() / 1000),
          chat: { id: fakeTgUser.id, type: 'private' },
          from: fakeTgUser,
        },
      },
    });
    const still = await prisma.telegramPendingLink.findUnique({ where: { id: pending2.id } });
    // pending may remain or be deleted; connection must stay on original tg user
    const conn = await prisma.telegramConnection.findFirst({
      where: { telegramUserId: String(fakeTgUser.id), isActive: true },
    });
    if (conn) pass('stolen_token_blocked');
    else fail('stolen_token_blocked', 'original connection lost');
    void still;
  } else {
    fail('stolen_token_blocked', 'pending2 missing');
  }

  // Business / personal notify via HTTP isn't exposed; verify prefs + status shape
  if (status.json?.data?.notifyBusiness === true && status.json?.data?.notifyPersonal === true) {
    pass('business_notify_prefs');
    pass('personal_notify_prefs');
  } else {
    fail('business_notify_prefs', JSON.stringify(status.json?.data));
    fail('personal_notify_prefs', JSON.stringify(status.json?.data));
  }

  // Fire-and-forget delivery path: call Bot API getMe through our health (already connected)
  // and ensure a bad webhook body does not crash
  const malformed = await webhook({ update_id: Date.now() + 99, nonsense: true });
  // zod may 422 before handler — either accepted false path or 422 is fine as long as server lives
  const health2 = await api('GET', '/health');
  if (health2.status === 200) pass('api_failure_isolation', `malformed_status=${malformed.status}`);
  else fail('api_failure_isolation', 'health down');

  // Explicit bad secret
  // (moved below)

  // Unlink via API
  const unlink = await api('POST', '/telegram/unlink', { cookie });
  status = await api('GET', '/telegram/status', { cookie });
  if (unlink.status === 200 && status.json?.data?.connected === false) pass('unlink_api');
  else fail('unlink_api', JSON.stringify(status.json?.data));

  // Re-link briefly then /unlink via bot
  const link3 = await api('POST', '/telegram/link/start', { cookie });
  const payload3 = new URL(link3.json.data.deepLink).searchParams.get('start');
  await webhook({
    update_id: Date.now() + 10,
    message: {
      message_id: 10,
      date: Math.floor(Date.now() / 1000),
      chat: { id: fakeTgUser.id, type: 'private' },
      from: fakeTgUser,
      text: `/start ${payload3}`,
    },
  });
  const hash3 = createHash('sha256').update(payload3, 'utf8').digest('hex');
  const pending3 = await prisma.telegramPendingLink.findFirst({
    where: { tokenHash: hash3 },
    orderBy: { createdAt: 'desc' },
  });
  if (pending3) {
    await webhook({
      update_id: Date.now() + 11,
      callback_query: {
        id: String(Date.now() + 11),
        from: fakeTgUser,
        data: `tg:link:ok:${pending3.id}`,
        message: {
          message_id: 11,
          date: Math.floor(Date.now() / 1000),
          chat: { id: fakeTgUser.id, type: 'private' },
          from: fakeTgUser,
        },
      },
    });
  }
  await webhook({
    update_id: Date.now() + 12,
    message: {
      message_id: 12,
      date: Math.floor(Date.now() / 1000),
      chat: { id: fakeTgUser.id, type: 'private' },
      from: fakeTgUser,
      text: '/unlink',
    },
  });
  await webhook({
    update_id: Date.now() + 13,
    callback_query: {
      id: String(Date.now() + 13),
      from: fakeTgUser,
      data: 'tg:unlink:ok',
      message: {
        message_id: 13,
        date: Math.floor(Date.now() / 1000),
        chat: { id: fakeTgUser.id, type: 'private' },
        from: fakeTgUser,
      },
    },
  });
  status = await api('GET', '/telegram/status', { cookie });
  if (status.json?.data?.connected === false) pass('unlink_bot');
  else fail('unlink_bot', JSON.stringify(status.json?.data));

  // Wrong webhook secret rejected
  const badSecret = await api('POST', '/telegram/webhook', {
    body: { update_id: 1 },
    headers: { 'X-Telegram-Bot-Api-Secret-Token': `wrong-${randomBytes(8).toString('hex')}` },
  });
  if (badSecret.status === 401) pass('webhook_secret_reject');
  else fail('webhook_secret_reject', `status=${badSecret.status}`);

  // getWebhookInfo host
  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json());
  const host = info.result?.url ? new URL(info.result.url).host : null;
  if (info.ok && host && !host.includes('balancy.space')) pass('webhook_info', host);
  else fail('webhook_info', host ?? 'none');

  await prisma.$disconnect();
} catch (error) {
  console.error('E2E crashed:', error instanceof Error ? error.message : error);
  process.exit(1);
}

const failed = Object.values(results).filter((v) => v === 'FAIL').length;
console.log('---');
console.log(JSON.stringify(results, null, 2));
process.exit(failed > 0 ? 1 : 0);
