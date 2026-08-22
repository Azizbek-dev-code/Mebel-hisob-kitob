/**
 * Phase 6 real-DB E2E verification script.
 * Uses cookie auth against the running API + Prisma for integrity checks.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const API = 'http://localhost:4000/api';
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
      // Replace existing cookie with same name
      const others = this.cookies
        .split('; ')
        .filter((c) => c && !c.startsWith(`${name}=`));
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

  async logout() {
    return this.request('POST', '/auth/logout');
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function ok(label: string) {
  console.log(`  OK  ${label}`);
}

async function main() {
  console.log('\n=== Phase 6 Real PostgreSQL E2E ===\n');

  // Health
  {
    const res = await fetch(`${API}/health`);
    const json = (await res.json()) as Json;
    assert(res.ok && (json.data as Json)?.status === 'ok', 'health');
    ok('GET /api/health');
  }

  const admin = new Session();
  const loginAdmin = await admin.login('admin', 'Admin123!');
  assert(loginAdmin.status === 200, `admin login got ${loginAdmin.status}`);
  ok('Admin login');

  // List workers
  {
    const list = await admin.request('GET', '/workers?page=1&pageSize=20');
    assert(list.status === 200, `workers list ${list.status}`);
    const items = ((list.data.data as Json)?.items ?? []) as Json[];
    assert(items.length >= 1, 'workers list empty');
    ok(`Workers list (${items.length} workers)`);
  }

  // Create worker Ali (username ali_e2e — seed already owns "ali")
  const createBody = {
    firstName: 'Ali',
    lastName: 'E2E',
    username: 'ali_e2e',
    phone: '+998901234000',
    password: 'AliE2E123!',
    responsibilities: ['ASSEMBLER', 'SELLER'],
    isActive: true,
    notes: 'Phase 6 E2E worker',
  };
  const created = await admin.request('POST', '/workers', createBody);
  assert(created.status === 201, `create worker ${created.status} ${JSON.stringify(created.data)}`);
  const worker = (created.data.data as Json).worker as Json;
  const workerId = worker.id as string;
  assert(workerId, 'worker id missing');
  const responsibilities = worker.responsibilities as string[];
  assert(
    responsibilities.includes('ASSEMBLER') && responsibilities.includes('SELLER'),
    `responsibilities=${JSON.stringify(responsibilities)}`,
  );
  ok(`Create worker Ali E2E (${workerId}) with ASSEMBLER+SELLER`);

  // DB: UserResponsibility rows
  const respRows = await prisma.userResponsibility.findMany({ where: { userId: workerId } });
  assert(respRows.length === 2, `expected 2 responsibility rows, got ${respRows.length}`);
  ok('DB UserResponsibility rows exist');

  await admin.logout();
  ok('Admin logout');

  // Login as Ali E2E
  const ali = new Session();
  const loginAli = await ali.login('ali_e2e', 'AliE2E123!');
  assert(loginAli.status === 200, `ali login ${loginAli.status}`);
  assert((loginAli.data.data as Json).user, 'ali user missing from login');
  ok('Ali login');

  // Worker permissions
  {
    const meSales = await ali.request('GET', '/me/sales');
    assert(meSales.status === 200, `me/sales ${meSales.status}`);
    ok('Ali can access My Sales');

    const tasks = await ali.request('GET', '/sales/assembly-tasks/mine');
    assert(tasks.status === 200, `assembly mine ${tasks.status}`);
    ok('Ali can access Assembly Tasks');

    const workersAdmin = await ali.request('GET', '/workers');
    assert(workersAdmin.status === 403, `workers admin expected 403 got ${workersAdmin.status}`);
    ok('Ali cannot access Worker Administration (403)');

    const otherWorker = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    assert(otherWorker, 'admin user missing');
    const otherSales = await ali.request('GET', `/workers/${otherWorker.id}/sales`);
    assert(otherSales.status === 403, `other sales expected 403 got ${otherSales.status}`);
    ok('Ali cannot access another worker sales (403)');
  }

  await ali.logout();

  // Admin creates sale with Ali as seller + assembler
  const admin2 = new Session();
  await admin2.login('admin', 'Admin123!');

  const customer = await prisma.customer.findFirst({ where: { status: 'ACTIVE' } });
  const product = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });
  assert(customer && product, 'seed customer/product missing');

  const saleRes = await admin2.request('POST', '/sales', {
    customerId: customer.id,
    sellerId: workerId,
    items: [{ productId: product.id, quantity: 1 }],
    paymentType: 'DEPOSIT',
    depositAmount: 500_000,
    depositMethod: 'CASH',
    assemblerId: workerId,
    installationRequired: true,
    notes: 'Phase 6 E2E sale',
  });
  assert(saleRes.status === 201, `create sale ${saleRes.status} ${JSON.stringify(saleRes.data)}`);
  const sale = (saleRes.data.data as Json).sale as Json;
  const saleId = sale.id as string;
  assert(saleId, 'sale id missing');
  ok(`Sale created (${saleId}) with Ali as seller+assembler`);

  // DB checks
  const saleDb = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { payments: true, assemblyTasks: true },
  });
  assert(saleDb, 'sale missing in DB');
  assert(saleDb.sellerId === workerId, 'sellerId mismatch');
  assert(saleDb.installerId === workerId, 'installerId mismatch');
  assert(saleDb.payments.length >= 1, 'payment missing');
  assert(saleDb.assemblyTasks.some((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'), 'assembly task missing');
  const task = saleDb.assemblyTasks.find((t) => t.status === 'PENDING')!;
  ok('DB: Sale + Payment + AssemblyTask exist');

  // Activity for assignment
  const activitiesBefore = await prisma.workerActivity.count({ where: { workerId } });
  assert(activitiesBefore >= 1, 'expected worker activity after create/sale');
  ok(`WorkerActivity rows present (${activitiesBefore})`);

  await admin2.logout();

  // Ali starts and completes task
  const ali2 = new Session();
  await ali2.login('ali_e2e', 'AliE2E123!');

  const mine = await ali2.request('GET', '/sales/assembly-tasks/mine');
  const mineItems = ((mine.data.data as Json)?.items ?? []) as Json[];
  const myTask = mineItems.find((t) => t.id === task.id);
  assert(myTask, 'task not visible to Ali');
  ok('Assembly task appears for Ali');

  const start = await ali2.request('PATCH', `/assembly-tasks/${task.id}`, {
    status: 'IN_PROGRESS',
  });
  assert(start.status === 200, `start task ${start.status}`);
  const startedDb = await prisma.assemblyTask.findUnique({ where: { id: task.id } });
  assert(startedDb?.status === 'IN_PROGRESS', `status=${startedDb?.status}`);
  ok('Task started → IN_PROGRESS');

  const complete = await ali2.request('PATCH', `/assembly-tasks/${task.id}`, {
    status: 'COMPLETED',
  });
  assert(complete.status === 200, `complete task ${complete.status}`);
  const completedDb = await prisma.assemblyTask.findUnique({ where: { id: task.id } });
  assert(completedDb?.status === 'COMPLETED', `status=${completedDb?.status}`);
  assert(completedDb?.completedAt != null, 'completedAt missing');
  assert(completedDb?.completedById === workerId, `completedBy=${completedDb?.completedById}`);
  ok('Task completed with completedAt + completedBy');

  const saleAfter = await prisma.sale.findUnique({ where: { id: saleId } });
  assert(saleAfter?.assemblyStatus === 'COMPLETED', `assemblyStatus=${saleAfter?.assemblyStatus}`);
  ok('Sale.assemblyStatus = COMPLETED');

  const stats = await ali2.request('GET', '/me/stats');
  assert(stats.status === 200, `stats ${stats.status}`);
  const s = (stats.data.data as Json).stats as Json;
  assert((s.totalSales as number) >= 1, `totalSales=${s.totalSales}`);
  assert((s.completedAssemblyTasks as number) >= 1, `completedAssemblyTasks=${s.completedAssemblyTasks}`);
  ok(`Ali stats updated (sales=${s.totalSales}, completedTasks=${s.completedAssemblyTasks})`);

  const mySales = await ali2.request('GET', '/me/sales');
  const mySaleItems = ((mySales.data.data as Json)?.items ?? []) as Json[];
  assert(mySaleItems.some((row) => row.id === saleId), 'sale missing from My Sales');
  ok('Ali My Sales contains the sale');

  const activityAfter = await prisma.workerActivity.findMany({
    where: { workerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const types = new Set(activityAfter.map((a) => a.type));
  assert(types.has('ASSEMBLY_COMPLETED') || types.has('ASSEMBLY_STARTED'), 'missing assembly activity');
  ok(`WorkerActivity includes assembly events (${[...types].join(', ')})`);

  await ali2.logout();

  // Deactivate Ali
  const admin3 = new Session();
  await admin3.login('admin', 'Admin123!');
  const deactivate = await admin3.request('PATCH', `/workers/${workerId}`, { isActive: false });
  assert(deactivate.status === 200, `deactivate ${deactivate.status}`);
  const deactivated = await prisma.user.findUnique({ where: { id: workerId } });
  assert(deactivated?.isActive === false, 'worker still active');
  ok('Ali deactivated');

  // Ali cannot login
  const aliBlocked = new Session();
  const blockedLogin = await aliBlocked.login('ali_e2e', 'AliE2E123!');
  assert(blockedLogin.status === 401, `inactive login expected 401 got ${blockedLogin.status}`);
  ok('Inactive Ali cannot login (401)');

  // Historical records remain
  const histSale = await prisma.sale.findUnique({ where: { id: saleId } });
  const histTask = await prisma.assemblyTask.findUnique({ where: { id: task.id } });
  assert(histSale && histTask, 'historical records deleted');
  assert(histTask.status === 'COMPLETED', 'historical task status changed unexpectedly');
  ok('Historical sale + completed task remain');

  // Inactive Ali cannot be assigned
  const product2 = product;
  const badSeller = await admin3.request('POST', '/sales', {
    customerId: customer.id,
    sellerId: workerId,
    items: [{ productId: product2.id, quantity: 1 }],
    paymentType: 'DEPOSIT',
    depositAmount: 0,
  });
  assert(badSeller.status === 400, `inactive seller expected 400 got ${badSeller.status}`);
  ok('Inactive Ali cannot be selected as seller');

  // Use active cashier/admin as seller, inactive as assembler
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  const badAssembler = await admin3.request('POST', '/sales', {
    customerId: customer.id,
    sellerId: adminUser!.id,
    items: [{ productId: product2.id, quantity: 1 }],
    paymentType: 'DEPOSIT',
    depositAmount: 0,
    assemblerId: workerId,
  });
  assert(badAssembler.status === 400, `inactive assembler expected 400 got ${badAssembler.status}`);
  ok('Inactive Ali cannot be selected as assembler');

  // Lookup options should not include inactive Ali
  const sellers = await admin3.request('GET', '/workers/options?responsibility=SELLER');
  const sellerItems = ((sellers.data.data as Json)?.items ?? []) as Json[];
  assert(!sellerItems.some((w) => w.id === workerId), 'inactive worker still in seller options');
  ok('Inactive Ali absent from seller options');

  // Responsibility validation: create worker without SELLER, try as seller
  const noSeller = await admin3.request('POST', '/workers', {
    firstName: 'No',
    lastName: 'Seller',
    username: 'noseller_e2e',
    password: 'NoSeller123!',
    responsibilities: ['ASSEMBLER'],
    isActive: true,
  });
  assert(noSeller.status === 201, `create noseller ${noSeller.status}`);
  const noSellerId = ((noSeller.data.data as Json).worker as Json).id as string;
  const badResp = await admin3.request('POST', '/sales', {
    customerId: customer.id,
    sellerId: noSellerId,
    items: [{ productId: product.id, quantity: 1 }],
    paymentType: 'DEPOSIT',
    depositAmount: 0,
  });
  assert(badResp.status === 400, `missing SELLER expected 400 got ${badResp.status}`);
  ok('Worker without SELLER cannot be assigned as seller');

  // Store isolation: fabricate other-store id access
  const cross = await admin3.request('GET', '/workers/cjld2fake0000qzrmn831i7rn');
  assert(cross.status === 404 || cross.status === 400, `cross-store expected 404 got ${cross.status}`);
  ok('Unknown/other-store worker id rejected');

  // Seeded Ali (from seed) still intact and active
  const seededAli = await prisma.user.findFirst({
    where: { username: 'ali' },
    include: { responsibilities: true },
  });
  assert(seededAli?.isActive === true, 'seeded ali missing/inactive');
  const seededResp = seededAli!.responsibilities.map((r) => r.responsibility);
  assert(seededResp.includes('ASSEMBLER') && seededResp.includes('SELLER'), 'seeded ali responsibilities');
  ok('Seeded Ali remains intact with ASSEMBLER+SELLER');

  await admin3.logout();

  console.log('\n=== E2E PASSED (real PostgreSQL) ===\n');
}

main()
  .catch((err) => {
    console.error('\n=== E2E FAILED ===');
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
