/**
 * Phase 7 Step 4C-1 — Expense PATCH/DELETE against real PostgreSQL.
 *
 * Creates and deletes ONLY a dedicated temporary expense.
 * Must leave permanent August business data at 2,100,000 so'm.
 */
const API = process.env.PHASE7_API_BASE ?? 'http://localhost:4000/api';
const AUGUST_QS = 'from=2026-08-01&to=2026-08-31';

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

    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { raw: text };
      }
    }
    return { status: res.status, data };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function metrics(summaryRes: { data: Record<string, unknown> }) {
  const summary = (summaryRes.data.data as Record<string, unknown>).summary as Record<
    string,
    unknown
  >;
  return summary.metrics as Record<string, number>;
}

function expensePayload(res: { data: Record<string, unknown> }) {
  return (res.data.data as Record<string, unknown>).expense as Record<string, unknown>;
}

async function main() {
  console.log('\n=== Phase 7 Step 4C-1 Expense Edit/Delete E2E ===\n');

  const admin = new Session();
  assert(
    (await admin.request('POST', '/auth/login', { identifier: 'admin', password: 'Admin123!' }))
      .status === 200,
    'admin login',
  );

  const beforeSummary = await admin.request(
    'GET',
    `/analytics/financial-summary?${AUGUST_QS}&comparison=previous`,
  );
  assert(beforeSummary.status === 200, `summary before ${beforeSummary.status}`);
  const before = metrics(beforeSummary);
  const beforeOpEx = before.operatingExpenses;
  const beforeNet = before.netProfit;
  const beforeGross = before.grossProfit;
  console.log(`  August OpEx before: ${beforeOpEx}`);
  console.log(`  August Net before: ${beforeNet}`);

  const categoriesRes = await admin.request('GET', '/expense-categories');
  assert(categoriesRes.status === 200, `categories ${categoriesRes.status}`);
  const categories = (categoriesRes.data.data as { items: Array<{ id: string; name: string }> })
    .items;
  const elektr = categories.find((c) => c.name === 'Elektr');
  const transport = categories.find((c) => c.name === 'Transport') ?? categories.find((c) => c.name !== 'Elektr');
  assert(elektr, 'Elektr category');
  assert(transport, 'second category');

  const createRes = await admin.request('POST', '/expenses', {
    categoryId: elektr.id,
    amount: 123_456,
    expenseDate: '2026-08-20',
    description: 'Phase 7 Step 4C-1 E2E temp',
  });
  assert(createRes.status === 201, `create ${createRes.status}`);
  const created = expensePayload(createRes);
  const expenseId = created.id as string;
  console.log(`  Created temp expense: ${expenseId}`);

  try {
    const getRes = await admin.request('GET', `/expenses/${expenseId}`);
    assert(getRes.status === 200, `get ${getRes.status}`);
    assert(expensePayload(getRes).amount === 123_456, 'get amount');

    const patchAmount = await admin.request('PATCH', `/expenses/${expenseId}`, {
      amount: 222_000,
      storeId: 'store_should_be_ignored',
      createdById: 'user_attacker',
    });
    assert(patchAmount.status === 200, `patch amount ${patchAmount.status}`);
    assert(expensePayload(patchAmount).amount === 222_000, 'patched amount');
    assert(
      !(expensePayload(patchAmount) as { storeId?: string }).storeId,
      'response must not expose storeId as client field',
    );

    const patchCategory = await admin.request('PATCH', `/expenses/${expenseId}`, {
      categoryId: transport.id,
    });
    assert(patchCategory.status === 200, `patch category ${patchCategory.status}`);
    assert(
      (expensePayload(patchCategory).category as { id: string }).id === transport.id,
      'patched category',
    );

    const patchDesc = await admin.request('PATCH', `/expenses/${expenseId}`, {
      description: 'Phase 7 Step 4C-1 E2E temp updated',
      expenseDate: '2026-08-21',
    });
    assert(patchDesc.status === 200, `patch desc ${patchDesc.status}`);
    assert(
      expensePayload(patchDesc).description === 'Phase 7 Step 4C-1 E2E temp updated',
      'patched description',
    );

    const midSummary = await admin.request(
      'GET',
      `/analytics/financial-summary?${AUGUST_QS}&comparison=previous`,
    );
    assert(midSummary.status === 200, `summary mid ${midSummary.status}`);
    const mid = metrics(midSummary);
    assert(mid.operatingExpenses === beforeOpEx + 222_000, `OpEx mid ${mid.operatingExpenses}`);
    assert(
      mid.netProfit === beforeGross - mid.operatingExpenses,
      `Net = Gross − OpEx (${mid.netProfit})`,
    );
    assert(mid.netProfit === beforeNet - 222_000, `Net decreased by 222000 (${mid.netProfit})`);

    const midExpenses = await admin.request('GET', `/analytics/expenses?${AUGUST_QS}`);
    assert(midExpenses.status === 200, `expenses analytics mid ${midExpenses.status}`);
    const analytics = (midExpenses.data.data as { analytics: { total: number } }).analytics;
    assert(analytics.total === mid.operatingExpenses, 'expenses analytics total matches OpEx');

    const delRes = await admin.request('DELETE', `/expenses/${expenseId}`);
    assert(delRes.status === 204, `delete ${delRes.status}`);

    const gone = await admin.request('GET', `/expenses/${expenseId}`);
    assert(gone.status === 404, `get after delete ${gone.status}`);

    const afterSummary = await admin.request(
      'GET',
      `/analytics/financial-summary?${AUGUST_QS}&comparison=previous`,
    );
    assert(afterSummary.status === 200, `summary after ${afterSummary.status}`);
    const after = metrics(afterSummary);
    assert(after.operatingExpenses === beforeOpEx, `OpEx restored ${after.operatingExpenses}`);
    assert(after.netProfit === beforeNet, `Net restored ${after.netProfit}`);
  } catch (error) {
    // Best-effort cleanup if assertions fail mid-run.
    await admin.request('DELETE', `/expenses/${expenseId}`).catch(() => undefined);
    throw error;
  }

  const employee = new Session();
  assert(
    (await employee.request('POST', '/auth/login', { identifier: 'ali', password: 'Ali123!' }))
      .status === 200,
    'employee login',
  );

  // Use a permanent expense id shape; employee must be forbidden before lookup.
  const listRes = await admin.request('GET', '/expenses?pageSize=1');
  assert(listRes.status === 200, 'admin list for forbid target');
  const items = (listRes.data.data as { items: Array<{ id: string }> }).items;
  assert(items.length > 0, 'need at least one expense for forbid tests');
  const targetId = items[0]!.id;

  const empPatch = await employee.request('PATCH', `/expenses/${targetId}`, { amount: 1 });
  assert(empPatch.status === 403, `employee patch ${empPatch.status}`);

  const empDelete = await employee.request('DELETE', `/expenses/${targetId}`);
  assert(empDelete.status === 403, `employee delete ${empDelete.status}`);

  const unauthPatch = await new Session().request('PATCH', `/expenses/${targetId}`, {
    amount: 1,
  });
  assert(unauthPatch.status === 401, `unauth patch ${unauthPatch.status}`);
  const unauthDelete = await new Session().request('DELETE', `/expenses/${targetId}`);
  assert(unauthDelete.status === 401, `unauth delete ${unauthDelete.status}`);

  // Final August integrity — permanent Phase 7 data.
  const finalSummary = await admin.request(
    'GET',
    `/analytics/financial-summary?${AUGUST_QS}&comparison=previous`,
  );
  const finalExpenses = await admin.request('GET', `/analytics/expenses?${AUGUST_QS}`);
  const finalMetrics = metrics(finalSummary);
  const finalAnalytics = (finalExpenses.data.data as {
    analytics: {
      total: number;
      byCategory: Array<{ categoryName: string; amount: number }>;
    };
  }).analytics;
  const elektrAmt =
    finalAnalytics.byCategory.find((row) => row.categoryName === 'Elektr')?.amount ?? 0;
  const boshqaAmt =
    finalAnalytics.byCategory.find((row) => row.categoryName === 'Boshqa')?.amount ?? 0;

  assert(finalMetrics.operatingExpenses === 2_100_000, `final OpEx ${finalMetrics.operatingExpenses}`);
  assert(finalAnalytics.total === 2_100_000, `final analytics total ${finalAnalytics.total}`);
  assert(elektrAmt === 1_600_000, `final Elektr ${elektrAmt}`);
  assert(boshqaAmt === 500_000, `final Boshqa ${boshqaAmt}`);

  console.log('\n| Metric | Value |');
  console.log('|---|---:|');
  console.log(`| Expense KPI | ${finalMetrics.operatingExpenses} |`);
  console.log(`| Analytics total | ${finalAnalytics.total} |`);
  console.log(`| Elektr | ${elektrAmt} |`);
  console.log(`| Boshqa | ${boshqaAmt} |`);
  console.log('\n=== Phase 7 Step 4C-1 E2E PASSED ===\n');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
