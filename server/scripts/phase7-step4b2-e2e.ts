/**
 * Phase 7 Step 4B-2 — Expense analytics reconciliation vs OpEx KPI.
 */
/* eslint-disable no-console */
const API = process.env.PHASE7_API_BASE ?? 'http://localhost:4000/api';

class Session {
  private cookies = '';

  async request(method: string, path: string, body?: unknown) {
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
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, data };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function main() {
  console.log('\n=== Phase 7 Step 4B-2 Expense Analytics E2E ===\n');
  const admin = new Session();
  assert(
    (await admin.request('POST', '/auth/login', { identifier: 'admin', password: 'Admin123!' }))
      .status === 200,
    'login',
  );

  const qs = 'from=2026-08-01&to=2026-08-31';
  const summaryRes = await admin.request(
    'GET',
    `/analytics/financial-summary?${qs}&comparison=previous`,
  );
  const expensesRes = await admin.request('GET', `/analytics/expenses?${qs}`);
  assert(summaryRes.status === 200, `summary ${summaryRes.status}`);
  assert(expensesRes.status === 200, `expenses ${expensesRes.status}`);

  const metrics = (
    (summaryRes.data.data as Record<string, unknown>).summary as Record<string, unknown>
  ).metrics as Record<string, number>;
  const analytics = (expensesRes.data.data as Record<string, unknown>).analytics as {
    total: number;
    count: number;
    byCategory: Array<{ categoryName: string; amount: number; percentage: number | null }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  };

  const dailySum = analytics.dailyTrend.reduce((sum, point) => sum + point.amount, 0);
  const categorySum = analytics.byCategory.reduce((sum, row) => sum + row.amount, 0);
  const elektr = analytics.byCategory.find((row) => row.categoryName === 'Elektr')?.amount ?? 0;
  const boshqa = analytics.byCategory.find((row) => row.categoryName === 'Boshqa')?.amount ?? 0;

  console.log(`  Daily points: ${analytics.dailyTrend.length}`);
  console.log(`  Categories with spend: ${analytics.byCategory.length}`);
  console.log(`  Expense count: ${analytics.count}`);

  console.log('\n| Metric | Value | Match KPI |');
  console.log('|---|---:|---|');
  const rows: Array<[string, number]> = [
    ['Expense KPI', metrics.operatingExpenses],
    ['Expenses API total', analytics.total],
    ['Daily chart Σ', dailySum],
    ['Category chart Σ', categorySum],
    ['Elektr', elektr],
    ['Boshqa', boshqa],
  ];
  for (const [name, value] of rows) {
    const matchOpEx =
      name === 'Elektr' || name === 'Boshqa'
        ? true
        : value === metrics.operatingExpenses;
    if (name !== 'Elektr' && name !== 'Boshqa') {
      assert(matchOpEx, `${name}: ${value} != OpEx ${metrics.operatingExpenses}`);
    }
    console.log(
      `| ${name} | ${value} | ${name === 'Elektr' || name === 'Boshqa' ? 'n/a' : matchOpEx ? 'yes' : 'NO'} |`,
    );
  }

  assert(elektr === 1_600_000, `Elektr expected 1600000 got ${elektr}`);
  assert(boshqa === 500_000, `Boshqa expected 500000 got ${boshqa}`);
  assert(metrics.operatingExpenses === 2_100_000, `OpEx expected 2100000 got ${metrics.operatingExpenses}`);
  assert(analytics.dailyTrend.length >= 31, `expected continuous August days, got ${analytics.dailyTrend.length}`);
  assert(
    analytics.dailyTrend.every((point) => typeof point.amount === 'number'),
    'daily amounts must be numbers',
  );

  console.log('\n=== Phase 7 Step 4B-2 E2E PASSED ===\n');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
