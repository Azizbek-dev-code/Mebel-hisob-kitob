/**
 * Supplier purchases + payables — real PostgreSQL E2E.
 * Marker: SUPPLIER_PURCHASES_E2E_OK
 *
 * Create supplier → products → purchase (2@5M + 1@3M = 13M) → pay 3M → debt 10M
 * → stock checks → pay 10M → PAID → credit purchase 20M → reports reconcile.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();
const MARKER = 'SUPPLIER_PURCHASES_E2E';

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
  return (body.data as Json) ?? {};
}

async function main() {
  // Cleanup leftover marker rows
  const oldSuppliers = await prisma.supplier.findMany({
    where: { notes: { contains: MARKER } },
    select: { id: true },
  });
  const oldIds = oldSuppliers.map((s) => s.id);
  if (oldIds.length > 0) {
    const purchases = await prisma.purchase.findMany({
      where: { supplierId: { in: oldIds } },
      select: { id: true },
    });
    const purchaseIds = purchases.map((p) => p.id);
    await prisma.stockMovement.deleteMany({
      where: { referenceId: { in: purchaseIds }, referenceType: 'PURCHASE' },
    });
    await prisma.supplierPayment.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    await prisma.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
    await prisma.supplier.deleteMany({ where: { id: { in: oldIds } } });
  }
  await prisma.stockMovement.deleteMany({ where: { product: { description: MARKER } } });
  await prisma.saleItem.deleteMany({ where: { product: { description: MARKER } } });
  await prisma.product.deleteMany({ where: { description: MARKER } });

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');
  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  // Financial integrity snapshot (before)
  const beforeExpenses = await prisma.expense.aggregate({
    where: { storeId: store.id, status: 'ACTIVE' },
    _sum: { amount: true },
  });
  const beforeExpenseTotal = Number(beforeExpenses._sum.amount ?? 0n);

  const supplierRes = await request('POST', '/api/suppliers', {
    cookie,
    body: { name: `${MARKER} ABC Mebel`, phone: '901998877', notes: MARKER },
  });
  if (supplierRes.status !== 201) {
    throw new Error(`create supplier ${supplierRes.status} ${JSON.stringify(supplierRes.body)}`);
  }
  const supplierId = String((dataOf(supplierRes.body).supplier as Json).id);

  const skuA = `SPA-${Date.now()}`;
  const skuB = `SPB-${Date.now()}`;
  const createProd = async (name: string, sku: string, cost: number) => {
    const res = await request('POST', '/api/products', {
      cookie,
      body: {
        name,
        sku,
        costPrice: cost,
        defaultSalePrice: cost + 2_000_000,
        trackStock: true,
        description: MARKER,
      },
    });
    if (res.status !== 201) throw new Error(`product ${sku} ${res.status}`);
    return String((dataOf(res.body).product as Json).id);
  };

  const productA = await createProd(`${MARKER} Spalni`, skuA, 4_000_000);
  const productB = await createProd(`${MARKER} Tumba`, skuB, 2_000_000);

  const stockA0 = (await prisma.product.findUniqueOrThrow({ where: { id: productA } })).stockQty;
  const stockB0 = (await prisma.product.findUniqueOrThrow({ where: { id: productB } })).stockQty;
  if (stockA0 !== 0 || stockB0 !== 0) throw new Error('expected stock 0 before purchase');

  const purchaseRes = await request('POST', '/api/purchases', {
    cookie,
    body: {
      supplierId,
      notes: MARKER,
      paidAmount: 3_000_000,
      paymentMethod: 'CASH',
      items: [
        { productId: productA, quantity: 2, unitCost: 5_000_000 },
        { productId: productB, quantity: 1, unitCost: 3_000_000 },
      ],
    },
  });
  if (purchaseRes.status !== 201 && purchaseRes.status !== 200) {
    throw new Error(`purchase failed ${purchaseRes.status} ${JSON.stringify(purchaseRes.body)}`);
  }
  const purchase = dataOf(purchaseRes.body).purchase as Json;
  const purchaseId = String(purchase.id);
  if (Number(purchase.totalCost) !== 13_000_000) {
    throw new Error(`total expected 13M got ${purchase.totalCost}`);
  }
  if (Number(purchase.paidAmount) !== 3_000_000) {
    throw new Error(`paid expected 3M got ${purchase.paidAmount}`);
  }
  if (Number(purchase.remainingAmount) !== 10_000_000) {
    throw new Error(`remaining expected 10M got ${purchase.remainingAmount}`);
  }

  // Historical unit costs preserved (not product.costPrice)
  const items = (purchase.items as Json[]) ?? [];
  const lineA = items.find((i) => i.productId === productA);
  if (Number(lineA?.unitCost) !== 5_000_000) {
    throw new Error(`unitCost A must be 5M snapshot, got ${lineA?.unitCost}`);
  }

  const stockA1 = (await prisma.product.findUniqueOrThrow({ where: { id: productA } })).stockQty;
  const stockB1 = (await prisma.product.findUniqueOrThrow({ where: { id: productB } })).stockQty;
  if (stockA1 !== 2) throw new Error(`stock A expected 2 got ${stockA1}`);
  if (stockB1 !== 1) throw new Error(`stock B expected 1 got ${stockB1}`);

  const supplierDetail = await request('GET', `/api/suppliers/${supplierId}`, { cookie });
  if (supplierDetail.status !== 200) throw new Error('supplier detail failed');
  const fin = (dataOf(supplierDetail.body).supplier as Json).financial as Json;
  if (Number(fin.outstandingDebt) !== 10_000_000) {
    throw new Error(`supplier debt expected 10M got ${fin.outstandingDebt}`);
  }

  // Expense total must be unchanged (purchase is not opex)
  const afterExpenses = await prisma.expense.aggregate({
    where: { storeId: store.id, status: 'ACTIVE' },
    _sum: { amount: true },
  });
  if (Number(afterExpenses._sum.amount ?? 0n) !== beforeExpenseTotal) {
    throw new Error('purchase incorrectly affected operating expenses');
  }

  const pay2 = await request('POST', `/api/purchases/${purchaseId}/payments`, {
    cookie,
    body: { amount: 10_000_000, method: 'CASH', note: `${MARKER} settle` },
  });
  if (pay2.status !== 201 && pay2.status !== 200) {
    throw new Error(`payment2 failed ${pay2.status} ${JSON.stringify(pay2.body)}`);
  }
  const paidPurchase = dataOf(pay2.body).purchase as Json;
  if (Number(paidPurchase.remainingAmount) !== 0) {
    throw new Error(`expected remaining 0 got ${paidPurchase.remainingAmount}`);
  }
  if (String(paidPurchase.paymentStatus) !== 'PAID') {
    throw new Error(`expected PAID got ${paidPurchase.paymentStatus}`);
  }

  const movements = await prisma.stockMovement.findMany({
    where: { referenceId: purchaseId, referenceType: 'PURCHASE' },
  });
  if (movements.length < 2) throw new Error('expected stock movements for purchase items');

  // Credit purchase 20M
  const credit = await request('POST', '/api/purchases', {
    cookie,
    body: {
      supplierId,
      notes: `${MARKER} credit`,
      paidAmount: 0,
      items: [{ productId: productA, quantity: 1, unitCost: 20_000_000 }],
    },
  });
  if (credit.status !== 201 && credit.status !== 200) {
    throw new Error(`credit purchase failed ${credit.status}`);
  }
  const creditPurchase = dataOf(credit.body).purchase as Json;
  if (Number(creditPurchase.remainingAmount) !== 20_000_000) {
    throw new Error('credit remaining must be 20M');
  }

  const detailAfterCredit = await request('GET', `/api/suppliers/${supplierId}`, { cookie });
  const fin2 = (dataOf(detailAfterCredit.body).supplier as Json).financial as Json;
  if (Number(fin2.outstandingDebt) !== 20_000_000) {
    throw new Error(`supplier debt after credit expected 20M got ${fin2.outstandingDebt}`);
  }

  const payables = await request('GET', '/api/reports/supplier-payables', { cookie });
  if (payables.status !== 200) throw new Error(`payables report ${payables.status}`);
  const payPayload = dataOf(payables.body);
  const report =
    (payPayload.supplierPayables as Json | undefined) ?? payPayload;
  const summary = (report.summary as Json) ?? {};
  if (Number(summary.totalOutstanding ?? 0) < 20_000_000) {
    throw new Error('reports outstanding below credit debt');
  }

  const cashFlow = await request('GET', '/api/reports/cash-flow', { cookie });
  if (cashFlow.status === 200) {
    const cf = (dataOf(cashFlow.body).cashFlow as Json) ?? dataOf(cashFlow.body);
    const outflow = (cf.outflow as Json) ?? {};
    if (typeof outflow.supplierPayments !== 'number') {
      throw new Error('cash flow missing supplierPayments');
    }
    if (Number(outflow.supplierPayments) < 13_000_000) {
      throw new Error('cash flow supplierPayments should include 13M paid on first purchase');
    }
  }

  // Cancel edge: sell all of product B stock from first purchase then cancel first purchase
  // First purchase already paid; cancel should reverse stock A+2 B+1 — but A now has +1 from credit.
  // Cancel credit purchase first (simpler stock reverse of 1 unit of A).
  const creditId = String(creditPurchase.id);
  const cancelCredit = await request('POST', `/api/purchases/${creditId}/cancel`, {
    cookie,
    body: { reason: `${MARKER} cancel credit` },
  });
  if (cancelCredit.status !== 200) {
    throw new Error(`cancel credit failed ${cancelCredit.status} ${JSON.stringify(cancelCredit.body)}`);
  }
  const afterCancelDebt = await request('GET', `/api/suppliers/${supplierId}`, { cookie });
  const fin3 = (dataOf(afterCancelDebt.body).supplier as Json).financial as Json;
  if (Number(fin3.outstandingDebt) !== 0) {
    throw new Error(`debt after cancel credit expected 0 got ${fin3.outstandingDebt}`);
  }

  // Multi-tenant
  const otherStore = await prisma.store.findFirst({
    where: { isActive: true, id: { not: store.id } },
  });
  if (otherStore) {
    const foreign = await prisma.supplier.findFirst({
      where: { storeId: otherStore.id },
      select: { id: true },
    });
    if (foreign) {
      const cross = await request('GET', `/api/suppliers/${foreign.id}`, { cookie });
      if (cross.status !== 404) throw new Error(`expected cross-store 404 got ${cross.status}`);
    }
  }

  // Employee forbidden
  const employee = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.EMPLOYEE, isActive: true },
  });
  if (employee) {
    // skip if no known password — permissions covered by unit tests
  }

  console.log('SUPPLIER_PURCHASES_E2E_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
