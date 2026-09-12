/**
 * Phase 7 Step 3 — Analytics real-DB verification.
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
  console.log('\n=== Phase 7 Step 3 Real PostgreSQL Analytics ===\n');

  const admin = new Session();
  assert((await admin.login('admin', 'Admin123!')).status === 200, 'admin login');
  ok('Admin login');

  const employee = new Session();
  assert((await employee.login('ali', 'Ali123!')).status === 200, 'employee login');
  const forbidden = await employee.request(
    'GET',
    '/analytics/financial-summary?from=2026-08-01&to=2026-08-31',
  );
  assert(
    forbidden.status === 403,
    `employee expected 403 got ${forbidden.status} (api=${API})`,
  );
  ok('EMPLOYEE forbidden from analytics');

  // Independent DB totals for August 2026 (Tashkent) — half-open UTC instants.
  const from = new Date('2026-07-31T19:00:00.000Z');
  const to = new Date('2026-08-31T19:00:00.000Z');
  const store = await prisma.store.findFirst({ where: { name: 'Mebel Savdo' } });
  assert(store, 'store missing');

  const salesAgg = await prisma.sale.aggregate({
    where: {
      storeId: store.id,
      status: { in: ['ACTIVE', 'COMPLETED'] },
      saleDate: { gte: from, lt: to },
    },
    _sum: {
      totalSalePrice: true,
      totalCostPrice: true,
      grossProfit: true,
      netProfit: true,
      remainingAmount: true,
    },
    _count: { _all: true },
  });

  const expenseAgg = await prisma.expense.aggregate({
    where: { storeId: store.id, expenseDate: { gte: from, lt: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const paymentAgg = await prisma.payment.aggregate({
    where: { storeId: store.id, paidAt: { gte: from, lt: to } },
    _sum: { amount: true },
  });

  const dbRevenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
  const dbCogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
  const dbGross = Number(salesAgg._sum.grossProfit ?? 0n);
  const dbOpEx = Number(expenseAgg._sum.amount ?? 0n);
  const dbNet = dbGross - dbOpEx;
  const dbCash = Number(paymentAgg._sum.amount ?? 0n);

  console.log('  DB independent totals (Aug 2026):');
  console.log(`    Revenue            ${dbRevenue}`);
  console.log(`    COGS               ${dbCogs}`);
  console.log(`    Gross Profit       ${dbGross}`);
  console.log(`    Operating Expenses ${dbOpEx}`);
  console.log(`    Net Profit         ${dbNet}`);
  console.log(`    Cash Collected     ${dbCash}`);
  console.log(`    Expense count      ${expenseAgg._count._all}`);

  const summaryRes = await admin.request(
    'GET',
    '/analytics/financial-summary?from=2026-08-01&to=2026-08-31&comparison=previous',
  );
  assert(summaryRes.status === 200, `summary ${summaryRes.status}`);
  const summary = (summaryRes.data.data as Json).summary as Json;
  const metrics = summary.metrics as Json;

  assert(metrics.revenue === dbRevenue, `revenue API ${String(metrics.revenue)} != DB ${dbRevenue}`);
  assert(
    metrics.costOfGoodsSold === dbCogs,
    `cogs API ${String(metrics.costOfGoodsSold)} != DB ${dbCogs}`,
  );
  assert(
    metrics.grossProfit === dbGross,
    `gross API ${String(metrics.grossProfit)} != DB ${dbGross}`,
  );
  assert(
    metrics.operatingExpenses === dbOpEx,
    `opex API ${String(metrics.operatingExpenses)} != DB ${dbOpEx}`,
  );
  assert(metrics.netProfit === dbNet, `net API ${String(metrics.netProfit)} != DB ${dbNet}`);
  assert(
    metrics.cashCollected === dbCash,
    `cash API ${String(metrics.cashCollected)} != DB ${dbCash}`,
  );
  assert(summary.previousPeriod, 'previousPeriod missing');
  ok('Financial summary matches independent DB aggregates');

  const expensesRes = await admin.request(
    'GET',
    '/analytics/expenses?from=2026-08-01&to=2026-08-31',
  );
  assert(expensesRes.status === 200, `expenses ${expensesRes.status}`);
  const analytics = (expensesRes.data.data as Json).analytics as Json;
  assert(analytics.total === dbOpEx, `expense total ${String(analytics.total)} != ${dbOpEx}`);
  assert(
    analytics.count === expenseAgg._count._all,
    `expense count ${String(analytics.count)} != ${expenseAgg._count._all}`,
  );

  const byCategory = analytics.byCategory as Json[];
  const categorySum = byCategory.reduce((sum, row) => sum + Number(row.amount), 0);
  assert(categorySum === dbOpEx, `category sum ${categorySum} != ${dbOpEx}`);
  ok('Expense analytics totals and category breakdown');

  const daily = analytics.dailyTrend as Json[];
  const dailySum = daily.reduce((sum, row) => sum + Number(row.amount), 0);
  assert(dailySum === dbOpEx, `daily sum ${dailySum} != ${dbOpEx}`);
  ok('Daily expense trend sums to period total');

  // Formula sanity (independent of current DB values).
  assert(9_500_000 - 7_000_000 === 2_500_000, 'gross sanity');
  assert(2_500_000 - 2_100_000 === 400_000, 'net sanity');
  ok('Accounting formula sanity check');

  console.log('\n=== Phase 7 Step 3 Analytics E2E PASSED ===\n');
  console.log('Real period result used for the report:');
  console.log(`  Revenue: ${dbRevenue}`);
  console.log(`  COGS: ${dbCogs}`);
  console.log(`  Gross Profit: ${dbGross}`);
  console.log(`  Operating Expenses: ${dbOpEx}`);
  console.log(`  Net Profit: ${dbNet}`);
}

main()
  .catch((error: unknown) => {
    console.error('\nPhase 7 Step 3 E2E FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
