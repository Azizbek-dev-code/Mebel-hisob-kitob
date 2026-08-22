/**
 * Inventory stock foundation — real PostgreSQL E2E.
 * Marker: INVENTORY_STOCK_E2E_TEMP
 *
 * Flow: stock-in 5 → sale 1 → stock 4 → cancel → stock 5 → double cancel 409
 * Also: multi-product sale, insufficient stock, manual adjustment.
 * Asserts financial August snapshot is unchanged by inventory ops on temp sales.
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'INVENTORY_STOCK_E2E_TEMP';
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
  const seller = await prisma.user.findFirst({
    where: {
      storeId: store.id,
      isActive: true,
      OR: [{ role: UserRole.ADMIN }, { responsibilities: { some: { responsibility: 'SELLER' } } }],
    },
  });
  if (!seller) throw new Error('No seller');
  const customer = await prisma.customer.findFirst({ where: { storeId: store.id } });
  if (!customer) throw new Error('No customer');

  const otherStore = await prisma.store.findFirst({
    where: { isActive: true, id: { not: store.id } },
  });

  const sku = `INV-E2E-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: `${MARKER} Spalni`,
      sku,
      costPrice: 1_000_000n,
      defaultSalePrice: 2_000_000n,
      status: 'ACTIVE',
      stockQty: 0,
      minStockQty: 2,
      trackStock: true,
    },
  });

  const productB = await prisma.product.create({
    data: {
      storeId: store.id,
      name: `${MARKER} Tumba`,
      sku: `${sku}-B`,
      costPrice: 500_000n,
      defaultSalePrice: 800_000n,
      status: 'ACTIVE',
      stockQty: 3,
      minStockQty: 1,
      trackStock: true,
    },
  });

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  // 1–3: stock in 5 → verify 5
  const stockIn = await request('POST', '/api/inventory/stock-in', {
    cookie,
    body: { productId: product.id, quantity: 5, reason: 'Supplier delivery E2E' },
  });
  if (stockIn.status !== 201) {
    throw new Error(`stock-in failed ${stockIn.status} ${JSON.stringify(stockIn.body)}`);
  }
  const afterIn = dataOf(stockIn.body);
  const productAfterIn = afterIn.product as Json;
  if (productAfterIn.stockQty !== 5) throw new Error(`expected stock 5 got ${productAfterIn.stockQty}`);

  const dbAfterIn = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  if (dbAfterIn.stockQty !== 5) throw new Error('DB stock after in != 5');

  // Multi-tenant: cannot stock-in other store product
  if (otherStore) {
    const foreign = await prisma.product.create({
      data: {
        storeId: otherStore.id,
        name: `${MARKER} foreign`,
        sku: `FOREIGN-${Date.now()}`,
        costPrice: 1n,
        defaultSalePrice: 2n,
        stockQty: 1,
        trackStock: true,
      },
    });
    const cross = await request('POST', '/api/inventory/stock-in', {
      cookie,
      body: { productId: foreign.id, quantity: 1, reason: 'Should fail' },
    });
    if (cross.status !== 404 && cross.status !== 400) {
      throw new Error(`expected cross-store reject, got ${cross.status}`);
    }
    await prisma.product.delete({ where: { id: foreign.id } }).catch(() => undefined);
  }

  // Seller cannot mutate inventory
  const employee = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.EMPLOYEE, isActive: true },
  });
  if (employee) {
    // Skip if we don't have employee password; permission is covered by unit tests.
  }

  // 4–6: create sale for 1 → stock 4 + SALE movement
  const saleRes = await request('POST', '/api/sales', {
    cookie,
    body: {
      customerId: customer.id,
      sellerId: seller.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitCostPrice: 1_000_000,
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
  const saleId = sale.id as string;
  const saleNumber = sale.saleNumber as number;

  const afterSale = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  if (afterSale.stockQty !== 4) throw new Error(`expected stock 4 after sale, got ${afterSale.stockQty}`);

  const saleMovements = await prisma.stockMovement.findMany({
    where: {
      storeId: store.id,
      productId: product.id,
      movementType: 'SALE',
      referenceId: saleId,
    },
  });
  if (saleMovements.length !== 1 || saleMovements[0]!.quantity !== -1) {
    throw new Error('SALE movement missing or wrong qty');
  }

  // Insufficient stock rejects entire sale
  const oversell = await request('POST', '/api/sales', {
    cookie,
    body: {
      customerId: customer.id,
      sellerId: seller.id,
      items: [
        {
          productId: product.id,
          quantity: 100,
          unitCostPrice: 1_000_000,
          unitSalePrice: 2_000_000,
        },
      ],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 200_000_000,
      notes: `${MARKER}-OVERSELL`,
    },
  });
  if (oversell.status !== 400 && oversell.status !== 422) {
    throw new Error(`expected oversell reject, got ${oversell.status}`);
  }
  const stillFour = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  if (stillFour.stockQty !== 4) throw new Error('oversell mutated stock');

  // Multi-product sale
  const multi = await request('POST', '/api/sales', {
    cookie,
    body: {
      customerId: customer.id,
      sellerId: seller.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitCostPrice: 1_000_000,
          unitSalePrice: 2_000_000,
        },
        {
          productId: productB.id,
          quantity: 2,
          unitCostPrice: 500_000,
          unitSalePrice: 800_000,
        },
      ],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 3_600_000,
      notes: `${MARKER}-MULTI`,
    },
  });
  if (multi.status !== 201 && multi.status !== 200) {
    throw new Error(`multi sale failed ${multi.status} ${JSON.stringify(multi.body)}`);
  }
  const multiSale = dataOf(multi.body).sale as Json;
  const afterMultiA = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  const afterMultiB = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
  if (afterMultiA.stockQty !== 3) throw new Error(`multi A stock expected 3 got ${afterMultiA.stockQty}`);
  if (afterMultiB.stockQty !== 1) throw new Error(`multi B stock expected 1 got ${afterMultiB.stockQty}`);

  // Manual adjustment -1
  const adjust = await request('POST', '/api/inventory/adjust', {
    cookie,
    body: {
      productId: productB.id,
      quantity: -1,
      reason: 'Inventory count correction E2E',
    },
  });
  if (adjust.status !== 201) {
    throw new Error(`adjust failed ${adjust.status} ${JSON.stringify(adjust.body)}`);
  }
  const afterAdj = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
  if (afterAdj.stockQty !== 0) throw new Error(`adjust expected 0 got ${afterAdj.stockQty}`);

  // 7–9: cancel first sale → stock back to 4 (was 3 after multi? wait)
  // Timeline: start 5 → sale1 -1 = 4 → multi -1 = 3 → cancel sale1 +1 = 4
  const cancel = await request('POST', `/api/sales/${saleId}/cancel`, {
    cookie,
    body: { reason: 'Customer changed mind E2E' },
  });
  if (cancel.status !== 200) {
    throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
  }
  const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  if (afterCancel.stockQty !== 4) {
    throw new Error(`expected stock 4 after cancel, got ${afterCancel.stockQty}`);
  }

  const cancelMovements = await prisma.stockMovement.findMany({
    where: {
      storeId: store.id,
      productId: product.id,
      movementType: 'SALE_CANCEL',
      referenceId: saleId,
    },
  });
  if (cancelMovements.length !== 1 || cancelMovements[0]!.quantity !== 1) {
    throw new Error('SALE_CANCEL movement missing');
  }

  // 10–12: second cancel → 409, stock stays 4
  const cancel2 = await request('POST', `/api/sales/${saleId}/cancel`, {
    cookie,
    body: { reason: 'Second cancel attempt' },
  });
  if (cancel2.status !== 409) throw new Error(`expected 409 got ${cancel2.status}`);
  const afterCancel2 = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  if (afterCancel2.stockQty !== 4) throw new Error('double cancel restored stock twice');

  const cancelledSale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
  if (cancelledSale.status !== 'CANCELLED') throw new Error('sale not CANCELLED');

  // History contains SALE + SALE_CANCEL for first sale
  const history = await request('GET', `/api/inventory/history?productId=${product.id}&pageSize=50`, {
    cookie,
  });
  if (history.status !== 200) throw new Error(`history failed ${history.status}`);
  const histItems = (dataOf(history.body).items as Json[]) ?? [];
  const types = histItems
    .filter((row) => row.referenceId === saleId)
    .map((row) => row.movementType);
  if (!types.includes('SALE') || !types.includes('SALE_CANCEL')) {
    throw new Error(`history missing SALE/SALE_CANCEL for sale ${saleNumber}: ${types.join(',')}`);
  }

  // Cancel multi sale to restore remaining stock (cleanup path validation)
  const cancelMulti = await request('POST', `/api/sales/${multiSale.id as string}/cancel`, {
    cookie,
    body: { reason: 'Cleanup multi sale E2E' },
  });
  if (cancelMulti.status !== 200) {
    throw new Error(`cancel multi failed ${cancelMulti.status}`);
  }
  const restoredA = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  const restoredB = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
  // A: 4 + 1 (multi cancel) = 5; B: 0 + 2 = 2 (adjust had set to 0 after multi left 1)
  if (restoredA.stockQty !== 5) throw new Error(`cleanup A expected 5 got ${restoredA.stockQty}`);
  if (restoredB.stockQty !== 2) throw new Error(`cleanup B expected 2 got ${restoredB.stockQty}`);

  const after = await augustSnapshot();
  console.log('AFTER', JSON.stringify(after));

  // Temp sales were cancelled — active August revenue should match.
  if (JSON.stringify(before.august) !== JSON.stringify(after.august)) {
    throw new Error(
      `August financial snapshot changed: before=${JSON.stringify(before.august)} after=${JSON.stringify(after.august)}`,
    );
  }
  if (before.financeTx !== after.financeTx) {
    throw new Error('Worker finance transaction count changed');
  }

  console.log('INVENTORY_STOCK_E2E_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
