/**
 * Expense soft-void — PostgreSQL E2E.
 * Marker: EXPENSE_SOFT_VOID_E2E_TEMP
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'EXPENSE_SOFT_VOID_E2E_TEMP';
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

function dataOf(body: Json): Json {
  return (body.data as Json) ?? body;
}

async function cleanup(storeId: string) {
  await prisma.expense.deleteMany({
    where: { storeId, description: { contains: MARKER } },
  });
  await prisma.expenseCategory.deleteMany({
    where: { storeId, name: { contains: MARKER } },
  });
}

async function main() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');
  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');

  await cleanup(store.id);

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  const catRes = await request('POST', '/api/expense-categories', {
    cookie,
    body: { name: `${MARKER} Cat`, color: 'slate' },
  });
  if (catRes.status !== 201 && catRes.status !== 200) {
    throw new Error(`create category failed ${catRes.status} ${JSON.stringify(catRes.body)}`);
  }
  const category = dataOf(catRes.body).category as Json;
  const categoryId = category.id as string;

  const createRes = await request('POST', '/api/expenses', {
    cookie,
    body: {
      categoryId,
      amount: 125_000,
      expenseDate: '2026-08-18',
      description: `${MARKER} electricity`,
    },
  });
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`create expense failed ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }
  const expense = dataOf(createRes.body).expense as Json;
  const expenseId = expense.id as string;
  if (expense.status !== 'ACTIVE') throw new Error(`expected ACTIVE got ${expense.status}`);

  const activeList = await request('GET', '/api/expenses?status=ACTIVE&pageSize=100', { cookie });
  if (activeList.status !== 200) {
    throw new Error(`active list failed ${activeList.status}`);
  }
  const activeItems = (dataOf(activeList.body).items as Json[]) ?? [];
  if (!activeItems.some((item) => item.id === expenseId)) {
    throw new Error('created expense missing from ACTIVE list');
  }

  const cancelRes = await request('POST', `/api/expenses/${expenseId}/cancel`, {
    cookie,
    body: { reason: 'E2E duplicate entry' },
  });
  if (cancelRes.status !== 200) {
    throw new Error(`cancel failed ${cancelRes.status} ${JSON.stringify(cancelRes.body)}`);
  }
  const cancelled = dataOf(cancelRes.body).expense as Json;
  if (cancelled.status !== 'CANCELLED') {
    throw new Error(`expected CANCELLED got ${cancelled.status}`);
  }
  if (cancelled.cancellationReason !== 'E2E duplicate entry') {
    throw new Error('cancellation reason not persisted');
  }

  const stillActive = await request('GET', '/api/expenses?status=ACTIVE&pageSize=100', { cookie });
  const stillActiveItems = (dataOf(stillActive.body).items as Json[]) ?? [];
  if (stillActiveItems.some((item) => item.id === expenseId)) {
    throw new Error('cancelled expense still in ACTIVE list');
  }

  const cancelledList = await request('GET', '/api/expenses?status=CANCELLED&pageSize=100', {
    cookie,
  });
  const cancelledItems = (dataOf(cancelledList.body).items as Json[]) ?? [];
  if (!cancelledItems.some((item) => item.id === expenseId)) {
    throw new Error('cancelled expense missing from CANCELLED list');
  }

  const row = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!row || row.status !== 'CANCELLED') {
    throw new Error('DB row not CANCELLED');
  }

  const secondCancel = await request('POST', `/api/expenses/${expenseId}/cancel`, {
    cookie,
    body: { reason: 'again' },
  });
  if (secondCancel.status !== 409) {
    throw new Error(`expected 409 on re-cancel got ${secondCancel.status}`);
  }

  await cleanup(store.id);
  console.log('EXPENSE_SOFT_VOID_E2E_OK');
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
