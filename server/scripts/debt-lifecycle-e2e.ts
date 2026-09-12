/**
 * Customer debt lifecycle — PostgreSQL E2E.
 * Marker: DEBT_LIFECYCLE_E2E_TEMP
 */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'DEBT_LIFECYCLE_E2E_TEMP';
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

async function main() {
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

  // Ensure product can be sold (untracked or with stock).
  if (product.trackStock && product.stockQty < 1) {
    await prisma.product.update({
      where: { id: product.id },
      data: { trackStock: false },
    });
  }

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  const beforeList = await request('GET', '/api/debts?pageSize=100', { cookie });
  if (beforeList.status !== 200) {
    throw new Error(`debts list failed ${beforeList.status} ${JSON.stringify(beforeList.body)}`);
  }
  const beforeSummary = dataOf(beforeList.body).summary as Json;
  const beforeOutstanding = Number(beforeSummary.totalOutstanding ?? 0);

  const saleRes = await request('POST', '/api/sales', {
    cookie,
    body: {
      customerId: customer.id,
      sellerId: admin.id,
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitCostPrice: Number(product.costPrice),
          unitSalePrice: 3_000_000,
        },
      ],
      paymentType: 'DEPOSIT',
      depositAmount: 1_000_000,
      depositMethod: 'CASH',
      notes: MARKER,
    },
  });
  if (saleRes.status !== 201 && saleRes.status !== 200) {
    throw new Error(`create sale failed ${saleRes.status} ${JSON.stringify(saleRes.body)}`);
  }
  const sale = dataOf(saleRes.body).sale as Json;
  const saleId = sale.id as string;
  if (Number(sale.remainingAmount) !== 2_000_000) {
    throw new Error(`expected remaining 2_000_000 got ${sale.remainingAmount}`);
  }

  const afterCreate = await request('GET', '/api/debts?search=' + encodeURIComponent(MARKER), {
    cookie,
  });
  // search is customer/phone/sale number — list all and find by sale id
  const allDebts = await request('GET', '/api/debts?pageSize=100', { cookie });
  const items = (dataOf(allDebts.body).items as Json[]) ?? [];
  const debtRow = items.find((row) => row.saleId === saleId);
  if (!debtRow) throw new Error('Debt row missing after deposit sale');
  if (Number(debtRow.remainingAmount) !== 2_000_000) {
    throw new Error(`debt remaining mismatch ${debtRow.remainingAmount}`);
  }

  const afterSummary = dataOf(allDebts.body).summary as Json;
  if (Number(afterSummary.totalOutstanding) < beforeOutstanding + 2_000_000) {
    throw new Error('outstanding did not increase by sale remainder');
  }

  const pay = await request('POST', `/api/debts/${saleId}/payments`, {
    cookie,
    body: { amount: 2_000_000, method: 'CASH', note: `${MARKER} settle` },
  });
  if (pay.status !== 201) {
    throw new Error(`debt payment failed ${pay.status} ${JSON.stringify(pay.body)}`);
  }
  const paidSale = dataOf(pay.body).sale as Json;
  if (Number(paidSale.remainingAmount) !== 0) {
    throw new Error(`expected fully paid, remaining ${paidSale.remainingAmount}`);
  }

  const afterPay = await request('GET', '/api/debts?pageSize=100', { cookie });
  const afterItems = (dataOf(afterPay.body).items as Json[]) ?? [];
  if (afterItems.some((row) => row.saleId === saleId)) {
    throw new Error('settled sale still appears in debts list');
  }

  // Multi-tenant: other store debt id should 404
  const otherStore = await prisma.store.findFirst({
    where: { isActive: true, id: { not: store.id } },
  });
  if (otherStore) {
    const foreignSale = await prisma.sale.findFirst({
      where: { storeId: otherStore.id, remainingAmount: { gt: 0n } },
      select: { id: true },
    });
    if (foreignSale) {
      const cross = await request('POST', `/api/debts/${foreignSale.id}/payments`, {
        cookie,
        body: { amount: 1, method: 'CASH' },
      });
      if (cross.status !== 404) {
        throw new Error(`expected cross-store 404, got ${cross.status}`);
      }
    }
  }

  void afterCreate;
  console.log('DEBT_LIFECYCLE_E2E_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
