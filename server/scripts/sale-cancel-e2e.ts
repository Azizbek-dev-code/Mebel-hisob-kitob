/**
 * Sale cancellation — real PostgreSQL E2E.
 * Marker: SALE_CANCEL_E2E_TEMP
 * Creates a temp sale, cancels it, verifies accounting exclusions + audit.
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'SALE_CANCEL_E2E_TEMP';
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

async function augustSnapshot() {
  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-09-01T00:00:00.000Z');
  const [sales, financeTx, salesAgg, expenseAgg] = await Promise.all([
    prisma.sale.count(),
    prisma.workerFinancialTransaction.count(),
    prisma.sale.aggregate({
      where: {
        saleDate: { gte: from, lt: to },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      _sum: { totalSalePrice: true, totalCostPrice: true, grossProfit: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);
  const revenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
  const cogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
  const gross = Number(salesAgg._sum.grossProfit ?? 0n);
  const operating = Number(expenseAgg._sum.amount ?? 0n);
  return {
    sales,
    financeTx,
    activeAugustSales: salesAgg._count._all,
    august: { revenue, cogs, gross, operating, net: gross - operating },
  };
}

async function main() {
  const before = await augustSnapshot();
  console.log('BEFORE', JSON.stringify(before));

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');
  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');
  const customer = await prisma.customer.findFirst({ where: { storeId: store.id } });
  const product = await prisma.product.findFirst({
    where: { storeId: store.id, status: 'ACTIVE' },
  });
  if (!customer || !product) throw new Error('Missing customer/product');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

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
      sellerId: admin.id,
      createdById: admin.id,
      saleDate: new Date('2026-08-15T10:00:00.000Z'),
      status: 'ACTIVE',
      paymentType: 'FULL_PAYMENT',
      paymentStatus: 'PAID',
      subtotal: 2_000_000n,
      totalSalePrice: 2_000_000n,
      totalCostPrice: 1_000_000n,
      paidAmount: 2_000_000n,
      remainingAmount: 0n,
      depositAmount: 2_000_000n,
      grossProfit: 1_000_000n,
      netProfit: 1_000_000n,
      notes: MARKER,
      items: {
        create: [
          {
            storeId: store.id,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 1,
            unitCostPrice: 1_000_000n,
            unitSalePrice: 2_000_000n,
            lineCostTotal: 1_000_000n,
            lineSaleTotal: 2_000_000n,
          },
        ],
      },
      payments: {
        create: [
          {
            storeId: store.id,
            customerId: customer.id,
            amount: 2_000_000n,
            method: 'CASH',
            paidAt: new Date('2026-08-15T10:00:00.000Z'),
            isDeposit: true,
            createdById: admin.id,
            note: MARKER,
          },
        ],
      },
    },
  });
  console.log('Temp sale', sale.id);

  const mid = await augustSnapshot();
  if (mid.august.revenue !== before.august.revenue + 2_000_000) {
    throw new Error(`Expected revenue +2m after create: ${JSON.stringify(mid.august)}`);
  }

  const cancel = await request('POST', `/api/sales/${sale.id}/cancel`, {
    cookie,
    body: { reason: `${MARKER} customer void` },
  });
  if (cancel.status !== 200) {
    throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
  }

  const cancelled = (cancel.body.data as { sale: { status: string; cancellationReason: string } })
    .sale;
  if (cancelled.status !== 'CANCELLED') throw new Error('status not CANCELLED');
  if (!cancelled.cancellationReason.includes(MARKER)) throw new Error('reason missing');

  const stillThere = await prisma.sale.findUnique({ where: { id: sale.id } });
  if (!stillThere || stillThere.status !== 'CANCELLED') {
    throw new Error('sale row missing or not cancelled');
  }

  const activity = await prisma.workerActivity.findFirst({
    where: { relatedSaleId: sale.id, type: 'SALE_CANCELLED' },
  });
  if (!activity) throw new Error('SALE_CANCELLED activity missing');

  const afterCancel = await augustSnapshot();
  if (JSON.stringify(afterCancel.august) !== JSON.stringify(before.august)) {
    throw new Error(
      `August figures should revert: before=${JSON.stringify(before.august)} after=${JSON.stringify(afterCancel.august)}`,
    );
  }
  if (afterCancel.financeTx !== before.financeTx) {
    throw new Error('financeTx changed');
  }

  const openList = await request('GET', '/api/sales?status=OPEN', { cookie });
  const openItems = (openList.body.data as { items: Array<{ id: string }> }).items ?? [];
  if (openItems.some((row) => row.id === sale.id)) {
    throw new Error('cancelled sale still in OPEN list');
  }

  const cancelledList = await request('GET', '/api/sales?status=CANCELLED', { cookie });
  const cancelledItems =
    (cancelledList.body.data as { items: Array<{ id: string }> }).items ?? [];
  if (!cancelledItems.some((row) => row.id === sale.id)) {
    throw new Error('cancelled sale missing from CANCELLED list');
  }

  const double = await request('POST', `/api/sales/${sale.id}/cancel`, {
    cookie,
    body: { reason: 'again' },
  });
  if (double.status !== 409) throw new Error(`expected 409, got ${double.status}`);

  // Cleanup temp sale (hard delete only for E2E marker rows)
  await prisma.workerActivity.deleteMany({ where: { relatedSaleId: sale.id } });
  await prisma.payment.deleteMany({ where: { saleId: sale.id } });
  await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.sale.delete({ where: { id: sale.id } });

  const after = await augustSnapshot();
  console.log('AFTER', JSON.stringify(after));
  if (JSON.stringify(after.august) !== JSON.stringify(before.august)) {
    throw new Error('integrity after cleanup mismatch');
  }

  console.log('SALE_CANCEL_E2E_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
