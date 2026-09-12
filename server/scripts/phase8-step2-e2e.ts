/**
 * Phase 8 Step 2 — Worker financial ledger management real-DB E2E.
 * Requires API on localhost:4000 and seeded PostgreSQL.
 *
 * Creates temporary transactions only; cleans ONLY those rows.
 * Never deletes Ali's existing business ledger data.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const API =
  process.env.PHASE8_API_BASE ?? process.env.PHASE7_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

type Json = Record<string, unknown>;

class Session {
  private cookies = '';

  async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: Json }> {
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

const TEMP_TX_IDS: string[] = [];
let workerId: string | null = null;
let storeId: string | null = null;

async function cleanup() {
  if (TEMP_TX_IDS.length > 0 && storeId) {
    // Delete reversals first (they reference originals), then originals.
    await prisma.workerFinancialTransaction.deleteMany({
      where: {
        storeId,
        id: { in: TEMP_TX_IDS },
        type: 'REVERSAL',
      },
    });
    await prisma.workerFinancialTransaction.deleteMany({
      where: { storeId, id: { in: TEMP_TX_IDS } },
    });
  }
  if (workerId) {
    await prisma.user.update({
      where: { id: workerId },
      data: { isActive: true },
    });
  }
}

async function main() {
  console.log('\n=== Phase 8 Step 2 Real PostgreSQL E2E (Worker Ledger Management) ===\n');

  {
    const res = await fetch(`${API}/health`);
    const json = (await res.json()) as Json;
    assert(res.ok && (json.data as Json)?.status === 'ok', 'health');
    ok('GET /api/health');
  }

  const beforeSales = await prisma.sale.count();
  const beforeUsers = await prisma.user.count();
  const beforeTasks = await prisma.assemblyTask.count();
  const beforeExpenses = await prisma.expense.count();
  const beforeActivities = await prisma.workerActivity.count();

  const from = new Date('2026-07-31T19:00:00.000Z');
  const to = new Date('2026-08-31T19:00:00.000Z');
  const store = await prisma.store.findFirst({ where: { name: 'Mebel Savdo' } });
  assert(store, 'store missing');
  storeId = store.id;

  async function augustMetrics() {
    const salesAgg = await prisma.sale.aggregate({
      where: {
        storeId: store!.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        saleDate: { gte: from, lt: to },
      },
      _sum: { totalSalePrice: true, totalCostPrice: true, grossProfit: true },
    });
    const expenseAgg = await prisma.expense.aggregate({
      where: { storeId: store!.id, expenseDate: { gte: from, lt: to } },
      _sum: { amount: true },
    });
    const revenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
    const cogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
    const grossProfit = Number(salesAgg._sum.grossProfit ?? 0n);
    const expenses = Number(expenseAgg._sum.amount ?? 0n);
    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      netProfit: grossProfit - expenses,
    };
  }

  const beforeAug = await augustMetrics();
  assert(beforeAug.expenses === 2_100_000, `Aug expenses ${beforeAug.expenses}`);
  assert(beforeAug.revenue === 20_450_000, `Aug revenue ${beforeAug.revenue}`);
  assert(beforeAug.cogs === 14_900_000, `Aug COGS ${beforeAug.cogs}`);
  assert(beforeAug.grossProfit === 5_550_000, `Aug gross ${beforeAug.grossProfit}`);
  assert(beforeAug.netProfit === 3_450_000, `Aug net ${beforeAug.netProfit}`);
  ok('August accounting baseline intact');

  const admin = new Session();
  assert((await admin.login('admin', 'Admin123!')).status === 200, 'admin login');
  ok('Admin login');

  const worker = await prisma.user.findFirst({
    where: { storeId: store.id, username: 'ali', role: UserRole.EMPLOYEE },
  });
  assert(worker, 'Ali worker missing');
  workerId = worker.id;
  if (!worker.isActive) {
    await prisma.user.update({ where: { id: worker.id }, data: { isActive: true } });
  }

  // Remove leftover Step 2 E2E rows only.
  await prisma.workerFinancialTransaction.deleteMany({
    where: {
      workerId: worker.id,
      description: { startsWith: 'Phase8S2 E2E' },
    },
  });
  ok(`Using Ali worker (${worker.id})`);

  const unauth = await fetch(`${API}/worker-finances/transactions/cl9eb9ybw00003b6sjqv3x9xq`);
  assert(unauth.status === 401, `unauth detail ${unauth.status}`);
  ok('Unauthenticated detail → 401');

  const employee = new Session();
  assert((await employee.login('ali', 'Ali123!')).status === 200, 'employee login');
  const empDetail = await employee.request(
    'GET',
    `/worker-finances/transactions/cl9eb9ybw00003b6sjqv3x9xq`,
  );
  assert(empDetail.status === 403, `employee detail ${empDetail.status}`);
  const empReverse = await employee.request(
    'POST',
    `/worker-finances/transactions/cl9eb9ybw00003b6sjqv3x9xq/reverse`,
    {},
  );
  assert(empReverse.status === 403, `employee reverse ${empReverse.status}`);
  ok('EMPLOYEE forbidden from detail/reverse');

  const specs = [
    { type: 'BONUS', amount: 500_000, date: '2026-08-10', description: 'Phase8S2 E2E bonus' },
    {
      type: 'COMMISSION',
      amount: 200_000,
      date: '2026-08-11',
      description: 'Phase8S2 E2E commission',
    },
    { type: 'ADVANCE', amount: 100_000, date: '2026-08-12', description: 'Phase8S2 E2E advance' },
    { type: 'DEBT', amount: 50_000, date: '2026-08-13', description: 'Phase8S2 E2E debt' },
    { type: 'PAYMENT', amount: 150_000, date: '2026-08-14', description: 'Phase8S2 E2E payment' },
  ] as const;

  const createdByType: Record<string, string> = {};
  for (const spec of specs) {
    const create = await admin.request('POST', '/worker-finances/transactions', {
      workerId: worker.id,
      type: spec.type,
      amount: spec.amount,
      transactionDate: spec.date,
      description: spec.description,
    });
    assert(create.status === 201, `create ${spec.type} ${create.status}`);
    const tx = (create.data.data as Json).transaction as Json;
    TEMP_TX_IDS.push(tx.id as string);
    createdByType[spec.type] = tx.id as string;
  }
  ok('Created temporary BONUS/COMMISSION/ADVANCE/DEBT/PAYMENT');

  const list = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?pageSize=50&search=Phase8S2`,
  );
  assert(list.status === 200, `list ${list.status}`);
  const listItems = ((list.data.data as Json).items ?? []) as Json[];
  assert(listItems.length === 5, `list count ${listItems.length}`);
  ok('List transactions');

  const typeFilter = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?type=BONUS&search=Phase8S2`,
  );
  assert(typeFilter.status === 200, `type filter ${typeFilter.status}`);
  const bonusItems = ((typeFilter.data.data as Json).items ?? []) as Json[];
  assert(bonusItems.length === 1, `bonus filter ${bonusItems.length}`);
  assert(bonusItems[0]!.type === 'BONUS', 'bonus type');
  ok('Filter by type');

  const dateFilter = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?from=2026-08-10&to=2026-08-12&search=Phase8S2`,
  );
  assert(dateFilter.status === 200, `date filter ${dateFilter.status}`);
  const dated = ((dateFilter.data.data as Json).items ?? []) as Json[];
  assert(dated.length === 3, `date filter count ${dated.length}`);
  ok('Filter by date (inclusive end)');

  const page1 = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?page=1&pageSize=2&search=Phase8S2`,
  );
  const page2 = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?page=2&pageSize=2&search=Phase8S2`,
  );
  assert(page1.status === 200 && page2.status === 200, 'pagination status');
  const p1 = page1.data.data as Json;
  const p2 = page2.data.data as Json;
  const meta1 = p1.meta as Json;
  assert(meta1.page === 1 && meta1.pageSize === 2, 'page1 meta');
  assert(meta1.totalItems === 5, `totalItems ${String(meta1.totalItems)}`);
  assert(meta1.totalPages === 3, `totalPages ${String(meta1.totalPages)}`);
  assert(((p1.items as Json[]) ?? []).length === 2, 'page1 items');
  assert(((p2.items as Json[]) ?? []).length === 2, 'page2 items');
  ok('Pagination (DB-backed meta)');

  const bonusId = createdByType.BONUS!;
  const detail = await admin.request('GET', `/worker-finances/transactions/${bonusId}`);
  assert(detail.status === 200, `detail ${detail.status}`);
  const detailTx = (detail.data.data as Json).transaction as Json;
  assert(detailTx.id === bonusId, 'detail id');
  assert(detailTx.amount === 500_000, 'detail amount');
  ok('Get transaction detail');

  const crossDetail = await admin.request(
    'GET',
    '/worker-finances/transactions/cl9eb9ybw00003b6sjqv3x9xq',
  );
  assert(crossDetail.status === 404, `cross detail ${crossDetail.status}`);
  ok('Cross-store detail → 404');

  const summary = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/summary?from=2026-08-01&to=2026-08-31`,
  );
  assert(summary.status === 200, `summary ${summary.status}`);
  const s = (summary.data.data as Json).summary as Json;
  assert(s.totalBonuses === 500_000, `bonuses ${String(s.totalBonuses)}`);
  assert(s.totalCommissions === 200_000, `commissions ${String(s.totalCommissions)}`);
  assert(s.totalAdvances === 100_000, `advances ${String(s.totalAdvances)}`);
  assert(s.totalDebt === 50_000, `debt ${String(s.totalDebt)}`);
  assert(s.totalPayments === 150_000, `payments ${String(s.totalPayments)}`);
  assert(s.netFinancialPosition === 400_000, `net ${String(s.netFinancialPosition)}`);
  ok('Summary aggregates for August period');

  const reverse = await admin.request('POST', `/worker-finances/transactions/${bonusId}/reverse`, {
    description: 'Phase8S2 E2E reverse bonus',
    storeId: 'ignored',
    createdById: 'ignored',
  });
  assert(reverse.status === 201, `reverse ${reverse.status}: ${JSON.stringify(reverse.data)}`);
  const reverseData = reverse.data.data as Json;
  const original = reverseData.original as Json;
  const reversal = reverseData.reversal as Json;
  assert(original.id === bonusId, 'original preserved id');
  assert(original.amount === 500_000, 'original amount unchanged');
  assert(reversal.type === 'REVERSAL', 'reversal type');
  assert(reversal.amount === 500_000, 'reversal amount');
  assert(reversal.referenceId === bonusId, 'reversal references original');
  assert(reversal.reversesType === 'BONUS', 'reversesType BONUS');
  TEMP_TX_IDS.push(reversal.id as string);

  const persistedOriginal = await prisma.workerFinancialTransaction.findUnique({
    where: { id: bonusId },
  });
  assert(persistedOriginal?.amount === 500_000n, 'original still in DB');
  assert(persistedOriginal?.type === 'BONUS', 'original type unchanged');
  ok('Reverse BONUS — original preserved, reversal created');

  const summaryAfter = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/summary?from=2026-08-01&to=2026-08-31`,
  );
  const s2 = (summaryAfter.data.data as Json).summary as Json;
  assert(s2.totalBonuses === 500_000, 'bonus gross unchanged');
  assert(s2.totalReversals === 500_000, `totalReversals ${String(s2.totalReversals)}`);
  assert(s2.netFinancialPosition === -100_000, `net after reverse ${String(s2.netFinancialPosition)}`);
  // 500+200−100−50−150 − 500(reversal of bonus) = -100_000
  ok('Summary net updated after reversal');

  const dup = await admin.request('POST', `/worker-finances/transactions/${bonusId}/reverse`, {});
  assert(dup.status === 409, `duplicate reverse ${dup.status}`);
  ok('Duplicate reversal rejected');

  await prisma.user.update({ where: { id: worker.id }, data: { isActive: false } });
  const listInactive = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?search=Phase8S2&pageSize=50`,
  );
  assert(listInactive.status === 200, `list inactive ${listInactive.status}`);
  const inactiveItems = ((listInactive.data.data as Json).items ?? []) as Json[];
  assert(inactiveItems.length >= 6, `inactive readable ${inactiveItems.length}`);
  ok('Historical transactions readable after deactivate');

  const createInactive = await admin.request('POST', '/worker-finances/transactions', {
    workerId: worker.id,
    type: 'BONUS',
    amount: 10_000,
    transactionDate: '2026-08-20',
    description: 'Phase8S2 E2E should fail',
  });
  assert(createInactive.status === 422, `inactive create ${createInactive.status}`);
  ok('Inactive worker cannot receive new transaction');

  await prisma.user.update({ where: { id: worker.id }, data: { isActive: true } });
  await cleanup();
  TEMP_TX_IDS.length = 0;
  ok('Cleaned up temporary ledger rows only');

  const afterSales = await prisma.sale.count();
  const afterUsers = await prisma.user.count();
  const afterTasks = await prisma.assemblyTask.count();
  const afterExpenses = await prisma.expense.count();
  const afterActivities = await prisma.workerActivity.count();
  assert(afterSales === beforeSales, 'sales changed');
  assert(afterUsers === beforeUsers, 'users changed');
  assert(afterTasks === beforeTasks, 'tasks changed');
  assert(afterExpenses === beforeExpenses, 'expenses changed');
  assert(afterActivities === beforeActivities, 'activities changed');
  ok('Phase 5/6/7 data preserved');

  const afterAug = await augustMetrics();
  assert(afterAug.expenses === 2_100_000, `final expenses ${afterAug.expenses}`);
  assert(afterAug.revenue === 20_450_000, `final revenue ${afterAug.revenue}`);
  assert(afterAug.cogs === 14_900_000, `final cogs ${afterAug.cogs}`);
  assert(afterAug.grossProfit === 5_550_000, `final gross ${afterAug.grossProfit}`);
  assert(afterAug.netProfit === 3_450_000, `final net ${afterAug.netProfit}`);

  const analytics = await admin.request(
    'GET',
    '/analytics/financial-summary?from=2026-08-01&to=2026-08-31',
  );
  assert(analytics.status === 200, `analytics ${analytics.status}`);
  const metrics = ((analytics.data.data as Json).summary as Json).metrics as Json;
  assert(metrics.revenue === 20_450_000, `API revenue ${String(metrics.revenue)}`);
  assert(metrics.costOfGoodsSold === 14_900_000, `API COGS ${String(metrics.costOfGoodsSold)}`);
  assert(metrics.grossProfit === 5_550_000, `API gross ${String(metrics.grossProfit)}`);
  assert(metrics.operatingExpenses === 2_100_000, `API OpEx ${String(metrics.operatingExpenses)}`);
  assert(metrics.netProfit === 3_450_000, `API net ${String(metrics.netProfit)}`);
  ok('August accounting reconciliation unchanged');

  console.log('\n=== Phase 8 Step 2 E2E PASSED ===\n');
}

main()
  .catch(async (error: unknown) => {
    console.error('\nPhase 8 Step 2 E2E FAILED:', error);
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error('Cleanup after failure also failed:', cleanupError);
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
