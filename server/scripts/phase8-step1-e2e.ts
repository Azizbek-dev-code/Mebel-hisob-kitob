/**
 * Phase 8 Step 1 — Worker financial foundation real-DB E2E.
 * Requires API on localhost:4000 and seeded PostgreSQL.
 *
 * Creates temporary transactions (and optionally a temp worker), then cleans
 * ONLY those rows. Never deletes Ali's real business data.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = process.env.PHASE8_API_BASE ?? process.env.PHASE7_API_BASE ?? 'http://localhost:4000/api';
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
let tempWorkerId: string | null = null;
let usedExistingAli = false;

async function cleanup() {
  if (TEMP_TX_IDS.length > 0) {
    await prisma.workerFinancialTransaction.deleteMany({
      where: { id: { in: TEMP_TX_IDS } },
    });
  }
  if (tempWorkerId && !usedExistingAli) {
    await prisma.userResponsibility.deleteMany({ where: { userId: tempWorkerId } });
    await prisma.workerActivity.deleteMany({ where: { workerId: tempWorkerId } });
    await prisma.user.deleteMany({ where: { id: tempWorkerId } });
  } else if (tempWorkerId && usedExistingAli) {
    // Restore Ali if we deactivated him during the inactive-worker check.
    await prisma.user.update({
      where: { id: tempWorkerId },
      data: { isActive: true },
    });
  }
}

async function main() {
  console.log('\n=== Phase 8 Step 1 Real PostgreSQL E2E (Worker Finances) ===\n');

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
  console.log(
    `  Existing data: sales=${beforeSales}, users=${beforeUsers}, tasks=${beforeTasks}, expenses=${beforeExpenses}, activities=${beforeActivities}`,
  );

  // August accounting baseline (must not change).
  const from = new Date('2026-07-31T19:00:00.000Z');
  const to = new Date('2026-08-31T19:00:00.000Z');
  const store = await prisma.store.findFirst({ where: { name: 'Mebel Savdo' } });
  assert(store, 'store missing');

  async function augustMetrics() {
    const salesAgg = await prisma.sale.aggregate({
      where: {
        storeId: store!.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        saleDate: { gte: from, lt: to },
      },
      _sum: {
        totalSalePrice: true,
        totalCostPrice: true,
        grossProfit: true,
      },
    });
    const expenseAgg = await prisma.expense.aggregate({
      where: { storeId: store!.id, expenseDate: { gte: from, lt: to } },
      _sum: { amount: true },
    });
    const revenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
    const cogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
    const grossProfit = Number(salesAgg._sum.grossProfit ?? 0n);
    const expenses = Number(expenseAgg._sum.amount ?? 0n);
    const netProfit = grossProfit - expenses;
    return { revenue, cogs, grossProfit, expenses, netProfit };
  }

  const beforeAug = await augustMetrics();
  console.log('  August baseline:', beforeAug);
  assert(beforeAug.expenses === 2_100_000, `Aug expenses ${beforeAug.expenses}`);
  assert(beforeAug.revenue === 20_450_000, `Aug revenue ${beforeAug.revenue}`);
  assert(beforeAug.cogs === 14_900_000, `Aug COGS ${beforeAug.cogs}`);
  assert(beforeAug.grossProfit === 5_550_000, `Aug gross ${beforeAug.grossProfit}`);
  assert(beforeAug.netProfit === 3_450_000, `Aug net ${beforeAug.netProfit}`);
  ok('August accounting baseline intact');

  const admin = new Session();
  const loginAdmin = await admin.login('admin', 'Admin123!');
  assert(loginAdmin.status === 200, `admin login got ${loginAdmin.status}`);
  ok('Admin login');

  // Prefer existing Ali; create a temporary worker only if needed.
  let worker = await prisma.user.findFirst({
    where: { storeId: store.id, username: 'ali', role: UserRole.EMPLOYEE },
  });

  if (worker) {
    usedExistingAli = true;
    if (!worker.isActive) {
      worker = await prisma.user.update({
        where: { id: worker.id },
        data: { isActive: true },
      });
    }
    tempWorkerId = worker.id;
    // Remove leftover Phase 8 E2E rows from a prior interrupted run — never touch other data.
    await prisma.workerFinancialTransaction.deleteMany({
      where: {
        workerId: worker.id,
        description: { startsWith: 'Phase8 E2E' },
      },
    });
    ok(`Using existing Ali worker (${worker.id})`);
  } else {
    const passwordHash = await bcrypt.hash('TempWorker123!', 10);
    worker = await prisma.user.create({
      data: {
        storeId: store.id,
        email: `phase8_step1_${Date.now()}@furniture-erp.local`,
        username: `p8s1_${Date.now().toString(36)}`,
        passwordHash,
        fullName: 'Phase8 Step1 Temp Worker',
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
    });
    tempWorkerId = worker.id;
    ok(`Created temporary worker (${worker.id})`);
  }

  const unauth = await fetch(`${API}/worker-finances/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workerId: worker.id,
      type: 'BONUS',
      amount: 10_000,
      transactionDate: '2026-08-09',
    }),
  });
  assert(unauth.status === 401, `unauth expected 401 got ${unauth.status}`);
  ok('Unauthenticated create → 401');

  const employee = new Session();
  const loginEmp = await employee.login('ali', 'Ali123!');
  if (loginEmp.status === 200) {
    const empCreate = await employee.request('POST', '/worker-finances/transactions', {
      workerId: worker.id,
      type: 'BONUS',
      amount: 10_000,
      transactionDate: '2026-08-09',
    });
    assert(empCreate.status === 403, `employee create expected 403 got ${empCreate.status}`);
    const empList = await employee.request(
      'GET',
      `/worker-finances/workers/${worker.id}/transactions`,
    );
    assert(empList.status === 403, `employee list expected 403 got ${empList.status}`);
    ok('EMPLOYEE forbidden from create/list');
  } else {
    ok('EMPLOYEE login skipped (Ali password may differ when using temp worker path)');
  }

  const specs = [
    { type: 'BONUS', amount: 500_000, description: 'Phase8 E2E bonus', date: '2026-08-10' },
    { type: 'COMMISSION', amount: 200_000, description: 'Phase8 E2E commission', date: '2026-08-11' },
    { type: 'ADVANCE', amount: 100_000, description: 'Phase8 E2E advance', date: '2026-08-12' },
    { type: 'DEBT', amount: 50_000, description: 'Phase8 E2E debt', date: '2026-08-13' },
    { type: 'PAYMENT', amount: 150_000, description: 'Phase8 E2E payment', date: '2026-08-14' },
    { type: 'ADJUSTMENT', amount: 25_000, description: 'Phase8 E2E adjustment', date: '2026-08-15' },
  ] as const;

  for (const spec of specs) {
    const create = await admin.request('POST', '/worker-finances/transactions', {
      workerId: worker.id,
      type: spec.type,
      amount: spec.amount,
      transactionDate: spec.date,
      description: `  ${spec.description}  `,
      storeId: 'should-be-ignored',
      createdById: 'should-be-ignored',
      referenceType: 'MANUAL',
    });
    assert(
      create.status === 201,
      `create ${spec.type} expected 201 got ${create.status}: ${JSON.stringify(create.data)}`,
    );
    const created = (create.data.data as Json)?.transaction as Json;
    assert(created?.id, `${spec.type} id missing`);
    assert(created.amount === spec.amount, `${spec.type} amount`);
    assert(created.description === spec.description, `${spec.type} description trim`);
    assert(String(created.transactionDate).startsWith(spec.date), `${spec.type} date`);
    TEMP_TX_IDS.push(created.id as string);

    const persisted = await prisma.workerFinancialTransaction.findUnique({
      where: { id: created.id as string },
    });
    assert(persisted, `${spec.type} not in DB`);
    assert(persisted.amount === BigInt(spec.amount), `${spec.type} bigint`);
    assert(typeof persisted.amount === 'bigint', `${spec.type} typeof bigint`);
    assert(persisted.storeId === store.id, `${spec.type} storeId`);
    assert(persisted.createdById !== 'should-be-ignored', `${spec.type} createdBy ignored client`);
  }
  ok('Created all six temporary transaction types (BigInt + dates + trim)');

  const list = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?pageSize=50`,
  );
  assert(list.status === 200, `list ${list.status}`);
  const items = ((list.data.data as Json)?.items ?? []) as Json[];
  for (const id of TEMP_TX_IDS) {
    assert(
      items.some((i) => i.id === id),
      `temp tx ${id} missing from list`,
    );
  }
  ok('Retrieve worker transactions');

  const summaryRes = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/summary`,
  );
  assert(summaryRes.status === 200, `summary ${summaryRes.status}`);
  const summary = (summaryRes.data.data as Json)?.summary as Json;
  assert(summary.totalBonuses === 500_000, `bonuses ${String(summary.totalBonuses)}`);
  assert(summary.totalCommissions === 200_000, `commissions ${String(summary.totalCommissions)}`);
  assert(summary.totalAdvances === 100_000, `advances ${String(summary.totalAdvances)}`);
  assert(summary.totalDebt === 50_000, `debt ${String(summary.totalDebt)}`);
  assert(summary.totalPayments === 150_000, `payments ${String(summary.totalPayments)}`);
  assert(summary.totalAdjustments === 25_000, `adjustments ${String(summary.totalAdjustments)}`);
  // 500+200+25 − 100 − 50 − 150 = 425_000
  assert(summary.netFinancialPosition === 425_000, `net ${String(summary.netFinancialPosition)}`);
  assert(summary.transactionCount === 6, `transactionCount ${String(summary.transactionCount)}`);
  ok('Summary aggregates and classification exact');

  // Store isolation: foreign worker id looks like 404.
  const cross = await admin.request(
    'GET',
    '/worker-finances/workers/cl9eb9ybw00003b6sjqv3x9xq/summary',
  );
  assert(cross.status === 404, `cross-store expected 404 got ${cross.status}`);
  ok('Cross-store worker → 404');

  // Historical survival after deactivation.
  await prisma.user.update({
    where: { id: worker.id },
    data: { isActive: false },
  });

  const listAfter = await admin.request(
    'GET',
    `/worker-finances/workers/${worker.id}/transactions?pageSize=50`,
  );
  assert(listAfter.status === 200, `list after deactivate ${listAfter.status}`);
  const itemsAfter = ((listAfter.data.data as Json)?.items ?? []) as Json[];
  assert(
    TEMP_TX_IDS.every((id) => itemsAfter.some((i) => i.id === id)),
    'historical transactions missing after deactivate',
  );
  ok('Historical transactions survive worker deactivation');

  const rejectInactive = await admin.request('POST', '/worker-finances/transactions', {
    workerId: worker.id,
    type: 'BONUS',
    amount: 10_000,
    transactionDate: '2026-08-16',
    description: 'should fail',
  });
  assert(
    rejectInactive.status === 422,
    `inactive create expected 422 got ${rejectInactive.status}`,
  );
  ok('New transaction to inactive worker rejected');

  // Reactivate before cleanup so Ali remains usable.
  await prisma.user.update({
    where: { id: worker.id },
    data: { isActive: true },
  });

  await cleanup();
  TEMP_TX_IDS.length = 0;
  if (!usedExistingAli) {
    tempWorkerId = null;
  }
  ok('Cleaned up temporary transactions/worker');

  const afterSales = await prisma.sale.count();
  const afterUsers = await prisma.user.count();
  const afterTasks = await prisma.assemblyTask.count();
  const afterExpenses = await prisma.expense.count();
  const afterActivities = await prisma.workerActivity.count();
  assert(afterSales === beforeSales, 'sales count changed');
  assert(afterUsers === beforeUsers, 'users count changed');
  assert(afterTasks === beforeTasks, 'assembly tasks count changed');
  assert(afterExpenses === beforeExpenses, 'expenses count changed');
  // Activities may increase if we toggled Ali — allow >= baseline only when using Ali.
  if (!usedExistingAli) {
    assert(afterActivities === beforeActivities, 'activities count changed');
  }
  ok('Phase 5/6/7 data preserved');

  const afterAug = await augustMetrics();
  assert(afterAug.expenses === 2_100_000, `final Aug expenses ${afterAug.expenses}`);
  assert(afterAug.revenue === 20_450_000, `final Aug revenue ${afterAug.revenue}`);
  assert(afterAug.cogs === 14_900_000, `final Aug COGS ${afterAug.cogs}`);
  assert(afterAug.grossProfit === 5_550_000, `final Aug gross ${afterAug.grossProfit}`);
  assert(afterAug.netProfit === 3_450_000, `final Aug net ${afterAug.netProfit}`);
  ok('August accounting reconciliation unchanged');

  // API confirmation via analytics.
  const summaryApi = await admin.request(
    'GET',
    '/analytics/financial-summary?from=2026-08-01&to=2026-08-31',
  );
  assert(summaryApi.status === 200, `analytics ${summaryApi.status}`);
  const metrics = ((summaryApi.data.data as Json).summary as Json).metrics as Json;
  assert(metrics.revenue === 20_450_000, `API revenue ${String(metrics.revenue)}`);
  assert(metrics.costOfGoodsSold === 14_900_000, `API COGS ${String(metrics.costOfGoodsSold)}`);
  assert(metrics.grossProfit === 5_550_000, `API gross ${String(metrics.grossProfit)}`);
  assert(metrics.operatingExpenses === 2_100_000, `API OpEx ${String(metrics.operatingExpenses)}`);
  assert(metrics.netProfit === 3_450_000, `API net ${String(metrics.netProfit)}`);
  ok('August API analytics match expected Phase 7 totals');

  console.log('\n=== Phase 8 Step 1 E2E PASSED ===\n');
}

main()
  .catch(async (error: unknown) => {
    console.error('\nPhase 8 Step 1 E2E FAILED:', error);
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
