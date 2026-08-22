/**
 * Phase 7 Step 4B-1 — Financial trend reconciliation against summary KPIs.
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
  console.log('\n=== Phase 7 Step 4B-1 Financial Trend E2E ===\n');
  const admin = new Session();
  assert((await admin.request('POST', '/auth/login', { identifier: 'admin', password: 'Admin123!' })).status === 200, 'login');

  const qs = 'from=2026-08-01&to=2026-08-31';
  const summaryRes = await admin.request('GET', `/analytics/financial-summary?${qs}&comparison=previous`);
  const trendRes = await admin.request('GET', `/analytics/financial-trend?${qs}`);
  assert(summaryRes.status === 200, `summary ${summaryRes.status}`);
  assert(trendRes.status === 200, `trend ${trendRes.status}`);

  const metrics = ((summaryRes.data.data as Record<string, unknown>).summary as Record<string, unknown>)
    .metrics as Record<string, number>;
  const trend = (trendRes.data.data as Record<string, unknown>).trend as {
    granularity: string;
    points: Array<{ revenue: number; cogs: number; grossProfit: number; netProfit: number }>;
    totals: Record<string, number>;
  };

  const sumPoints = (key: 'revenue' | 'cogs' | 'grossProfit' | 'netProfit') =>
    trend.points.reduce((acc, point) => acc + point[key], 0);

  console.log(`  Granularity: ${trend.granularity}`);
  console.log(`  Points: ${trend.points.length}`);

  const rows = [
    ['Revenue', metrics.revenue, trend.totals.revenue, sumPoints('revenue')],
    ['COGS', metrics.costOfGoodsSold, trend.totals.cogs, sumPoints('cogs')],
    ['Gross Profit', metrics.grossProfit, trend.totals.grossProfit, sumPoints('grossProfit')],
    ['Net Profit', metrics.netProfit, trend.totals.netProfit, sumPoints('netProfit')],
  ] as const;

  console.log('\n| Metric | KPI | Chart totals | Points Σ | Match |');
  console.log('|---|---:|---:|---:|---|');
  for (const [name, kpi, totals, pointsSum] of rows) {
    const match = kpi === totals && totals === pointsSum;
    assert(match, `${name}: KPI ${kpi} != trend ${totals} / points ${pointsSum}`);
    console.log(`| ${name} | ${kpi} | ${totals} | ${pointsSum} | yes |`);
  }

  console.log('\n=== Phase 7 Step 4B-1 E2E PASSED ===\n');
}

main().catch((error: unknown) => {
  console.error('\nPhase 7 Step 4B-1 E2E FAILED:', error);
  process.exitCode = 1;
});
