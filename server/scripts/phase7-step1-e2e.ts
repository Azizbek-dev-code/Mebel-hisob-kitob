/**
 * Phase 7 Step 1 — Expense foundation real-DB E2E.
 * Requires API on localhost:4000 and seeded PostgreSQL.
 */
import { PrismaClient } from '@prisma/client';

const API = process.env.PHASE7_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

type Json = Record<string, unknown>;

class Session {
  private cookies = '';

  async request(method: string, path: string, body?: unknown): Promise<{ status: number; data: Json }> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookies ? { Cookie: this.cookies } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const part = raw.split(';')[0]!;
      const name = part.split('=')[0]!;
      const others = this.cookies.split('; ').filter((c) => c && !c.startsWith(`${name}=`));
      others.push(part);
      this.cookies = others.join('; ');
    }

    let data: Json = {};
    try {
      data = (await res.json()) as Json;
    } catch {
      data = {};
    }
    return { status: res.status, data };
  }

  async login(identifier: string, password: string) {
    return this.request('POST', '/auth/login', { identifier, password });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function ok(label: string) {
  console.log(`  OK  ${label}`);
}

async function main() {
  console.log('\n=== Phase 7 Step 1 Real PostgreSQL E2E (Expenses) ===\n');

  {
    const res = await fetch(`${API}/health`);
    const json = (await res.json()) as Json;
    assert(res.ok && (json.data as Json)?.status === 'ok', 'health');
    ok('GET /api/health');
  }

  // Preserve Phase 5/6 data — only count, never delete.
  const beforeSales = await prisma.sale.count();
  const beforeWorkers = await prisma.user.count();
  const beforeTasks = await prisma.assemblyTask.count();
  const beforeActivities = await prisma.workerActivity.count();
  console.log(
    `  Existing data: sales=${beforeSales}, users=${beforeWorkers}, tasks=${beforeTasks}, activities=${beforeActivities}`,
  );

  const admin = new Session();
  const loginAdmin = await admin.login('admin', 'Admin123!');
  assert(loginAdmin.status === 200, `admin login got ${loginAdmin.status}`);
  ok('Admin login');

  const categories = await admin.request('GET', '/expense-categories');
  assert(categories.status === 200, `categories ${categories.status}`);
  const categoryItems = ((categories.data.data as Json)?.items ?? []) as Json[];
  assert(categoryItems.length >= 13, `expected >=13 categories, got ${categoryItems.length}`);
  const elektr = categoryItems.find((c) => c.name === 'Elektr');
  assert(elektr, 'Elektr category missing');
  ok(`Expense categories (${categoryItems.length})`);

  const unauth = await fetch(`${API}/expenses`);
  assert(unauth.status === 401, `unauth expected 401 got ${unauth.status}`);
  ok('Unauthenticated GET /expenses → 401');

  const zero = await admin.request('POST', '/expenses', {
    categoryId: elektr!.id,
    amount: 0,
    expenseDate: '2026-08-09',
  });
  assert(zero.status === 422, `zero amount expected 422 got ${zero.status}`);
  ok('Reject zero amount');

  const negative = await admin.request('POST', '/expenses', {
    categoryId: elektr!.id,
    amount: -1000,
    expenseDate: '2026-08-09',
  });
  assert(negative.status === 422, `negative expected 422 got ${negative.status}`);
  ok('Reject negative amount');

  const badCategory = await admin.request('POST', '/expenses', {
    categoryId: 'cl9eb9ybw00003b6sjqv3x9xq',
    amount: 100_000,
    expenseDate: '2026-08-09',
  });
  assert(badCategory.status === 422, `bad category expected 422 got ${badCategory.status}`);
  ok('Reject invalid category');

  const create = await admin.request('POST', '/expenses', {
    categoryId: elektr!.id,
    amount: 750_000,
    expenseDate: '2026-08-09',
    description: 'Phase 7 Step 1 E2E expense',
    storeId: 'should-be-ignored',
  });
  assert(create.status === 201, `create expected 201 got ${create.status}: ${JSON.stringify(create.data)}`);
  const created = (create.data.data as Json)?.expense as Json;
  assert(created?.id, 'created expense id missing');
  assert(created.amount === 750_000, `amount ${String(created.amount)}`);
  ok('Create expense');

  const persisted = await prisma.expense.findUnique({ where: { id: created.id as string } });
  assert(persisted, 'expense not in database');
  assert(persisted.amount === 750_000n, 'persisted amount mismatch');
  assert(persisted.categoryId === elektr!.id, 'persisted category mismatch');
  assert(typeof persisted.amount === 'bigint', 'amount must be bigint');
  ok('Expense persisted correctly (BigInt)');

  const getOne = await admin.request('GET', `/expenses/${created.id as string}`);
  assert(getOne.status === 200, `get expense ${getOne.status}`);
  ok('GET /expenses/:id');

  const list = await admin.request('GET', '/expenses');
  assert(list.status === 200, `list ${list.status}`);
  const items = ((list.data.data as Json)?.items ?? []) as Json[];
  assert(
    items.some((i) => i.id === created.id),
    'created expense missing from list',
  );
  ok('GET /expenses list');

  const employee = new Session();
  const loginEmp = await employee.login('ali', 'Ali123!');
  assert(loginEmp.status === 200, `employee login ${loginEmp.status}`);
  const empList = await employee.request('GET', '/expenses');
  assert(empList.status === 403, `employee list expected 403 got ${empList.status}`);
  const empCreate = await employee.request('POST', '/expenses', {
    categoryId: elektr!.id,
    amount: 10_000,
    expenseDate: '2026-08-09',
  });
  assert(empCreate.status === 403, `employee create expected 403 got ${empCreate.status}`);
  ok('EMPLOYEE forbidden from expense management');

  const afterSales = await prisma.sale.count();
  const afterWorkers = await prisma.user.count();
  const afterTasks = await prisma.assemblyTask.count();
  const afterActivities = await prisma.workerActivity.count();
  assert(afterSales === beforeSales, 'sales count changed');
  assert(afterWorkers === beforeWorkers, 'users count changed');
  assert(afterTasks === beforeTasks, 'assembly tasks count changed');
  assert(afterActivities === beforeActivities, 'activities count changed');
  ok('Phase 5/6 data preserved');

  console.log('\n=== Phase 7 Step 1 E2E PASSED ===\n');
}

main()
  .catch((error: unknown) => {
    console.error('\nPhase 7 Step 1 E2E FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
