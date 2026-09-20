import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

function envFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = envFile(new URL('../.env', import.meta.url));
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] == null) process.env[key] = value;
}
const base = 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

function pick(obj, keys) {
  const next = {};
  for (const key of keys) next[key] = obj?.[key] ?? null;
  return next;
}

async function json(res) {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 200) };
  }
}

const report = [];

try {
  const health = await json(await fetch(`${base}/api/health`));
  report.push({
    step: 'health',
    status: health.status,
    telegram: health.body?.data?.telegram,
    database: health.body?.data?.database,
  });

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: env.SEED_PLATFORM_ADMIN_EMAIL || 'platform@furniture-erp.local',
      password: env.SEED_PLATFORM_ADMIN_PASSWORD || 'Platform123!',
    }),
  });
  const loginBody = await json(login);
  const cookie = login.headers.getSetCookie?.().join('; ') || login.headers.get('set-cookie') || '';
  report.push({
    step: 'platform-login',
    status: loginBody.status,
    ok: Boolean(loginBody.body?.success),
    role: loginBody.body?.data?.user?.role ?? null,
  });

  const headers = { cookie };
  const adminStatus = await json(await fetch(`${base}/api/telegram/admin/status`, { headers }));
  report.push({
    step: 'admin-status',
    status: adminStatus.status,
    data: pick(adminStatus.body?.data, [
      'connected',
      'botUsername',
      'tokenConfigured',
      'tokenSource',
      'hasDatabaseToken',
      'connectedUsers',
    ]),
    webhook: pick(adminStatus.body?.data?.webhook, ['active', 'pendingUpdateCount']),
    tokenLeaked: JSON.stringify(adminStatus.body).includes(env.TELEGRAM_BOT_TOKEN || '___never___'),
  });

  const denied = await json(
    await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: env.SEED_ADMIN_EMAIL || 'admin@furniture-erp.local',
        password: env.SEED_ADMIN_PASSWORD || 'Admin123!',
      }),
    }),
  );
  const storeCookie = (await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: env.SEED_ADMIN_EMAIL || 'admin@furniture-erp.local',
      password: env.SEED_ADMIN_PASSWORD || 'Admin123!',
    }),
  })).headers.getSetCookie?.().join('; ') || '';
  const storeAdminTelegram = await json(
    await fetch(`${base}/api/telegram/admin/status`, { headers: { cookie: storeCookie } }),
  );
  report.push({
    step: 'store-admin-denied',
    status: storeAdminTelegram.status,
    loginOk: denied.status,
  });

  const menu = await json(await fetch(`${base}/api/telegram/admin/menu`, { headers }));
  report.push({
    step: 'admin-menu',
    status: menu.status,
    slugs: (menu.body?.data ?? []).map((row) => row.slug),
  });

  const automations = await json(await fetch(`${base}/api/telegram/admin/automations`, { headers }));
  report.push({
    step: 'admin-automations',
    status: automations.status,
    kinds: (automations.body?.data ?? []).map((row) => row.kind),
  });

  const connection = await prisma.telegramConnection.findFirst({
    where: { isActive: true },
    select: { telegramChatId: true, telegramUserId: true },
  });

  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    report.push({ step: 'start-webhook', skipped: 'no webhook secret' });
  } else if (!connection) {
    report.push({ step: 'start-webhook', skipped: 'no active telegram connection' });
  } else {
    const chatId = Number(connection.telegramChatId);
    const userId = Number(connection.telegramUserId);
    const start = await json(
      await fetch(`${base}/api/telegram/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': secret,
        },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: 1,
            text: '/start',
            chat: { id: chatId, type: 'private' },
            from: { id: userId, first_name: 'LocalTest' },
          },
        }),
      }),
    );
    report.push({
      step: 'start-webhook',
      status: start.status,
      accepted: start.body?.data?.accepted ?? false,
    });

    const details = await json(
      await fetch(`${base}/api/telegram/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': secret,
        },
        body: JSON.stringify({
          update_id: Date.now() + 1,
          callback_query: {
            id: `local_${Date.now()}`,
            data: 'tg:m:details',
            from: { id: userId },
            message: { message_id: 2, chat: { id: chatId, type: 'private' } },
          },
        }),
      }),
    );
    report.push({
      step: 'details-callback',
      status: details.status,
      accepted: details.body?.data?.accepted ?? false,
    });

    const furniture = await json(
      await fetch(`${base}/api/telegram/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': secret,
        },
        body: JSON.stringify({
          update_id: Date.now() + 2,
          callback_query: {
            id: `local_biz_${Date.now()}`,
            data: 'tg:m:furniture',
            from: { id: userId },
            message: { message_id: 3, chat: { id: chatId, type: 'private' } },
          },
        }),
      }),
    );
    report.push({
      step: 'furniture-callback',
      status: furniture.status,
      accepted: furniture.body?.data?.accepted ?? false,
    });
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
