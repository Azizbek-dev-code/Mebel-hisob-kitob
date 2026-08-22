/**
 * Financial reports — read-only PostgreSQL integrity E2E.
 * Marker: REPORTS_INTEGRITY_E2E
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();

type Json = Record<string, unknown>;

async function request(
  method: string,
  path: string,
  options?: { cookie?: string; body?: unknown },
): Promise<{ status: number; body: Json; setCookie: string | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.cookie) headers.Cookie = options.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => ({}))) as Json,
    setCookie: res.headers.get('set-cookie'),
  };
}

function extractCookie(setCookie: string | null, jar: string): string {
  if (!setCookie) return jar;
  const parts = setCookie.split(/,(?=\s*[^;]+=)/);
  const next = [...jar.split(';').map((s) => s.trim()).filter(Boolean)];
  for (const part of parts) {
    const pair = part.split(';')[0]?.trim();
    if (!pair) continue;
    const name = pair.split('=')[0];
    const idx = next.findIndex((c) => c.startsWith(`${name}=`));
    if (idx >= 0) next[idx] = pair;
    else next.push(pair);
  }
  return next.join('; ');
}

async function snapshot(storeId: string) {
  const [sales, expenses, financeTx, payments] = await Promise.all([
    prisma.sale.count({ where: { storeId } }),
    prisma.expense.count({ where: { storeId } }),
    prisma.workerFinancialTransaction.count({ where: { storeId } }),
    prisma.payment.count({ where: { storeId } }),
  ]);
  return { sales, expenses, financeTx, payments };
}

async function main() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');
  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  const before = await snapshot(store.id);

  const summaryBefore = await request('GET', '/api/analytics/financial-summary?preset=THIS_MONTH', {
    cookie,
  });
  if (summaryBefore.status !== 200) {
    throw new Error(`analytics summary failed ${summaryBefore.status}`);
  }
  const metricsBefore = ((summaryBefore.body.data as Json)?.summary as Json)?.metrics as Json;

  const endpoints = [
    '/api/reports/summary?preset=THIS_MONTH',
    '/api/reports/profit-loss?preset=THIS_MONTH',
    '/api/reports/cash-flow?preset=THIS_MONTH',
    '/api/reports/sales?preset=THIS_MONTH',
    '/api/reports/expenses?preset=THIS_MONTH',
    '/api/reports/debts?preset=THIS_MONTH',
    '/api/reports/workers?preset=THIS_MONTH',
    '/api/reports/products?preset=THIS_MONTH&limit=10',
    '/api/reports/inventory?preset=THIS_MONTH',
    '/api/reports/trend?preset=THIS_MONTH',
    '/api/reports/bundle?preset=THIS_MONTH&limit=10',
  ];

  for (const path of endpoints) {
    const res = await request('GET', path, { cookie });
    if (res.status !== 200) {
      throw new Error(`report failed ${path} ${res.status} ${JSON.stringify(res.body)}`);
    }
  }

  const after = await snapshot(store.id);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`mutations detected ${JSON.stringify({ before, after })}`);
  }

  const summaryAfter = await request('GET', '/api/analytics/financial-summary?preset=THIS_MONTH', {
    cookie,
  });
  const metricsAfter = ((summaryAfter.body.data as Json)?.summary as Json)?.metrics as Json;
  if (JSON.stringify(metricsBefore) !== JSON.stringify(metricsAfter)) {
    throw new Error('financial metrics changed after opening reports');
  }

  const forbidden = await request('POST', '/api/auth/login', {
    body: {
      identifier: 'ali',
      password: process.env.SEED_WORKER_PASSWORD ?? 'Worker123!',
    },
  });
  // If worker login works, confirm 403 on reports.
  if (forbidden.status === 200) {
    const workerCookie = extractCookie(forbidden.setCookie, '');
    const denied = await request('GET', '/api/reports/summary?preset=THIS_MONTH', {
      cookie: workerCookie,
    });
    if (denied.status !== 403) {
      throw new Error(`expected worker 403 got ${denied.status}`);
    }
  }

  console.log('REPORTS_INTEGRITY_E2E_OK');
  console.log(
    JSON.stringify({
      before,
      revenue: metricsBefore?.revenue,
      cogs: metricsBefore?.costOfGoodsSold,
      gross: metricsBefore?.grossProfit,
      net: metricsBefore?.netProfit,
    }),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
