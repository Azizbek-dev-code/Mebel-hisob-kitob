/**
 * Worker compensation settle → COMMISSION ledger — PostgreSQL E2E.
 * Marker: COMP_SETTLE_E2E_TEMP
 */
import {
  PrismaClient,
  UserRole,
  WorkerCompensationType,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'COMP_SETTLE_E2E_TEMP';
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

async function cleanup(storeId: string, workerId: string, saleIds: string[]) {
  await prisma.workerFinancialTransaction.deleteMany({
    where: {
      storeId,
      workerId,
      OR: [
        { description: { contains: MARKER } },
        { referenceType: WorkerFinancialReferenceType.COMPENSATION },
      ],
    },
  });
  await prisma.workerCompensationRule.deleteMany({
    where: { storeId, workerId, notes: { contains: MARKER } },
  });
  if (saleIds.length > 0) {
    await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
    await prisma.payment.deleteMany({ where: { saleId: { in: saleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
  }
}

async function main() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');
  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');

  const worker = await prisma.user.findFirst({
    where: {
      storeId: store.id,
      role: UserRole.EMPLOYEE,
      isActive: true,
      responsibilities: { some: { responsibility: WorkerResponsibility.SELLER } },
    },
  });
  if (!worker) throw new Error('No seller worker');

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, status: 'ACTIVE' },
  });
  if (!product) throw new Error('No product');

  const saleIds: string[] = [];
  await cleanup(store.id, worker.id, []);

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  // Ensure product can be sold.
  if (product.trackStock && product.stockQty < 1) {
    await prisma.product.update({
      where: { id: product.id },
      data: { trackStock: false },
    });
  }

  const ruleRes = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.FIXED_PER_SALE,
      value: 75_000,
      effectiveFrom: '2026-01-01',
      notes: MARKER,
    },
  });
  if (ruleRes.status !== 201 && ruleRes.status !== 200) {
    throw new Error(`create rule failed ${ruleRes.status} ${JSON.stringify(ruleRes.body)}`);
  }

  const saleRes = await request('POST', '/api/sales', {
    cookie,
    body: {
      customerId: (
        await prisma.customer.findFirst({ where: { storeId: store.id } })
      )?.id,
      sellerId: worker.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitCostPrice: Number(product.costPrice),
          unitSalePrice: 2_000_000,
        },
      ],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 2_000_000,
      depositMethod: 'CASH',
      notes: MARKER,
    },
  });
  if (saleRes.status !== 201 && saleRes.status !== 200) {
    throw new Error(`create sale failed ${saleRes.status} ${JSON.stringify(saleRes.body)}`);
  }
  const sale = dataOf(saleRes.body).sale as Json;
  saleIds.push(sale.id as string);

  const beforeCount = await prisma.workerFinancialTransaction.count({
    where: {
      storeId: store.id,
      workerId: worker.id,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
    },
  });

  const settle1 = await request('POST', `/api/workers/${worker.id}/compensation-settle`, {
    cookie,
    body: { from: '2026-08-01', to: '2026-08-31' },
  });
  if (settle1.status !== 200) {
    throw new Error(`settle failed ${settle1.status} ${JSON.stringify(settle1.body)}`);
  }
  const settlement1 = dataOf(settle1.body).settlement as Json;
  if (Number(settlement1.createdCount) < 1) {
    throw new Error(`expected createdCount >= 1 got ${settlement1.createdCount}`);
  }

  const afterCount = await prisma.workerFinancialTransaction.count({
    where: {
      storeId: store.id,
      workerId: worker.id,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
    },
  });
  if (afterCount !== beforeCount + Number(settlement1.createdCount)) {
    throw new Error(`ledger count mismatch ${beforeCount} -> ${afterCount}`);
  }

  const settle2 = await request('POST', `/api/workers/${worker.id}/compensation-settle`, {
    cookie,
    body: { from: '2026-08-01', to: '2026-08-31' },
  });
  if (settle2.status !== 200) {
    throw new Error(`re-settle failed ${settle2.status}`);
  }
  const settlement2 = dataOf(settle2.body).settlement as Json;
  if (Number(settlement2.createdCount) !== 0) {
    throw new Error(`expected idempotent createdCount 0 got ${settlement2.createdCount}`);
  }
  if (Number(settlement2.skippedAlreadySettled) < 1) {
    throw new Error('expected skippedAlreadySettled >= 1');
  }

  await cleanup(store.id, worker.id, saleIds);
  console.log('COMP_SETTLE_E2E_OK');
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
