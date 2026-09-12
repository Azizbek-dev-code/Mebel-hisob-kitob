/**
 * Phase 8 Step 4C — real PostgreSQL E2E for read-only compensation preview.
 * Marker: PHASE8_STEP4C_TEMP
 * Does NOT reset the database. Cleans up only temporary rows created here.
 */
import {
  PrismaClient,
  UserRole,
  WorkerCompensationType,
  WorkerResponsibility,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'PHASE8_STEP4C_TEMP';
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
  const setCookie = res.headers.get('set-cookie');
  const body = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, body, setCookie };
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

async function snapshot() {
  const [sales, users, expenses, financeTx, compensationRules] = await Promise.all([
    prisma.sale.count(),
    prisma.user.count(),
    prisma.expense.count(),
    prisma.workerFinancialTransaction.count(),
    prisma.workerCompensationRule.count(),
  ]);

  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-09-01T00:00:00.000Z');

  const salesAgg = await prisma.sale.aggregate({
    where: { saleDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
    _sum: { totalSalePrice: true, totalCostPrice: true, grossProfit: true },
  });
  const expenseAgg = await prisma.expense.aggregate({
    where: { expenseDate: { gte: from, lt: to } },
    _sum: { amount: true },
  });

  const revenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
  const cogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
  const gross = Number(salesAgg._sum.grossProfit ?? 0n);
  const operating = Number(expenseAgg._sum.amount ?? 0n);
  const net = gross - operating;

  return {
    sales,
    users,
    expenses,
    financeTx,
    compensationRules,
    august: { revenue, cogs, gross, operating, net },
  };
}

async function main() {
  // Soft-clean any leftover marker rows from a prior interrupted run.
  const staleWorkers = await prisma.user.findMany({
    where: { notes: MARKER },
    select: { id: true },
  });
  for (const stale of staleWorkers) {
    await prisma.workerCompensationRule.deleteMany({ where: { workerId: stale.id, notes: MARKER } });
    await prisma.saleItem.deleteMany({
      where: { sale: { sellerId: stale.id, notes: MARKER } },
    });
    await prisma.sale.deleteMany({ where: { sellerId: stale.id, notes: MARKER } });
    await prisma.userResponsibility.deleteMany({ where: { userId: stale.id } });
    await prisma.user.delete({ where: { id: stale.id } });
  }

  const before = await snapshot();
  console.log('BEFORE', JSON.stringify(before));

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No active store');

  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin user');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) {
    throw new Error(`Admin login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  const cookie = extractCookie(login.setCookie, '');
  console.log('Admin login OK');

  const passwordHash = await bcrypt.hash('TempComp123!', 8);
  const worker = await prisma.user.create({
    data: {
      storeId: store.id,
      email: `phase8step4c.temp.${Date.now()}@furniture-erp.local`,
      username: `p8s4c_${Date.now().toString().slice(-8)}`,
      passwordHash,
      fullName: `${MARKER} Seller`,
      role: UserRole.EMPLOYEE,
      isActive: true,
      notes: MARKER,
      responsibilities: {
        create: [{ storeId: store.id, responsibility: WorkerResponsibility.SELLER }],
      },
    },
  });
  console.log('Temp worker', worker.id);

  const customer = await prisma.customer.findFirst({ where: { storeId: store.id } });
  if (!customer) throw new Error('No customer');

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, status: 'ACTIVE' },
  });
  if (!product) throw new Error('No product');

  const maxSale = await prisma.sale.aggregate({
    where: { storeId: store.id },
    _max: { saleNumber: true },
  });
  const saleNumber = (maxSale._max.saleNumber ?? 0) + 1;

  const sale = await prisma.sale.create({
    data: {
      storeId: store.id,
      saleNumber,
      customerId: customer.id,
      sellerId: worker.id,
      createdById: admin.id,
      saleDate: new Date('2026-08-10T10:00:00.000Z'),
      status: 'ACTIVE',
      paymentType: 'FULL_PAYMENT',
      paymentStatus: 'PAID',
      subtotal: 5_000_000n,
      totalSalePrice: 5_000_000n,
      totalCostPrice: 3_000_000n,
      paidAmount: 5_000_000n,
      remainingAmount: 0n,
      grossProfit: 2_000_000n,
      netProfit: 2_000_000n,
      notes: MARKER,
      items: {
        create: [
          {
            storeId: store.id,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 1,
            unitCostPrice: 3_000_000n,
            unitSalePrice: 5_000_000n,
            lineCostTotal: 3_000_000n,
            lineSaleTotal: 5_000_000n,
          },
        ],
      },
    },
  });
  console.log('Temp sale', sale.id);

  const createRule = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      effectiveFrom: '2026-01-01',
      notes: MARKER,
    },
  });
  if (createRule.status !== 201) {
    throw new Error(`Expected 201 create rule: ${createRule.status} ${JSON.stringify(createRule.body)}`);
  }

  const financeBefore = await prisma.workerFinancialTransaction.count();

  const preview = await request(
    'GET',
    `/api/workers/${worker.id}/compensation-preview?from=2026-08-01&to=2026-08-31`,
    { cookie },
  );
  if (preview.status !== 200) {
    throw new Error(`Expected 200 preview: ${preview.status} ${JSON.stringify(preview.body)}`);
  }

  const data = (preview.body.data as {
    preview: {
      readOnly: boolean;
      summary: { totalCompensation: number; saleEventCount: number };
      breakdown: Array<{ compensationAmount: number }>;
    };
  }).preview;

  if (!data.readOnly) throw new Error('Preview must be readOnly');
  if (data.summary.saleEventCount !== 1) {
    throw new Error(`Expected 1 sale event, got ${data.summary.saleEventCount}`);
  }
  if (data.summary.totalCompensation !== 500_000) {
    throw new Error(`Expected 500000, got ${data.summary.totalCompensation}`);
  }
  console.log('Preview OK', data.summary);

  const financeAfter = await prisma.workerFinancialTransaction.count();
  if (financeAfter !== financeBefore) {
    throw new Error(`Finance tx mutated: ${financeBefore} → ${financeAfter}`);
  }

  const empty = await request(
    'GET',
    `/api/workers/${worker.id}/compensation-preview?from=2026-01-01&to=2026-01-31`,
    { cookie },
  );
  if (empty.status !== 200) throw new Error('Empty period preview failed');
  const emptyTotal = (
    empty.body.data as { preview: { summary: { totalCompensation: number } } }
  ).preview.summary.totalCompensation;
  if (emptyTotal !== 0) throw new Error(`Expected empty total 0, got ${emptyTotal}`);

  const invalid = await request(
    'GET',
    `/api/workers/${worker.id}/compensation-preview?from=2026-08-31&to=2026-08-01`,
    { cookie },
  );
  if (invalid.status !== 422) {
    throw new Error(`Expected 422 invalid range, got ${invalid.status}`);
  }

  const emp = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.EMPLOYEE, isActive: true, id: { not: worker.id } },
  });
  if (emp) {
    const empLogin = await request('POST', '/api/auth/login', {
      body: {
        identifier: emp.username ?? emp.email,
        password: process.env.SEED_ASSEMBLER_PASSWORD ?? 'Ali123!',
      },
    });
    if (empLogin.status === 200) {
      const empCookie = extractCookie(empLogin.setCookie, '');
      const forbidden = await request(
        'GET',
        `/api/workers/${worker.id}/compensation-preview?from=2026-08-01&to=2026-08-31`,
        { cookie: empCookie },
      );
      if (forbidden.status !== 403) {
        throw new Error(`Expected 403 for employee, got ${forbidden.status}`);
      }
      console.log('Employee forbidden OK');
    }
  }

  // Cleanup temp rows only. Production API still has no DELETE for rules.
  await prisma.workerCompensationRule.deleteMany({ where: { notes: MARKER } });
  await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.sale.delete({ where: { id: sale.id } });
  await prisma.userResponsibility.deleteMany({ where: { userId: worker.id } });
  await prisma.user.delete({ where: { id: worker.id } });

  const after = await snapshot();
  console.log('AFTER', JSON.stringify(after));

  if (after.financeTx !== before.financeTx) {
    throw new Error('financeTx changed');
  }
  if (JSON.stringify(after.august) !== JSON.stringify(before.august)) {
    throw new Error(`August figures changed: ${JSON.stringify(before.august)} → ${JSON.stringify(after.august)}`);
  }

  console.log('PHASE8_STEP4C_E2E_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
