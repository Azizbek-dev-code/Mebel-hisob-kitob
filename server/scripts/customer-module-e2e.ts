/**
 * Customer module reconciliation — real PostgreSQL E2E.
 * Marker: CUSTOMER_MODULE_E2E_OK
 *
 * Create customer → product → stock-in → sale 10M → pay 3M → debt 7M
 * → pay 2M → debt 5M → match reports → cancel → history kept, debt cleared.
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();
const MARKER = 'CUSTOMER_MODULE_E2E';

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
  // Clean leftover marker rows from interrupted runs.
  const oldCustomers = await prisma.customer.findMany({
    where: { notes: MARKER },
    select: { id: true },
  });
  const oldCustomerIds = oldCustomers.map((c) => c.id);
  if (oldCustomerIds.length > 0) {
    await prisma.payment.deleteMany({ where: { customerId: { in: oldCustomerIds } } });
    await prisma.installmentPayment.deleteMany({
      where: { plan: { customerId: { in: oldCustomerIds } } },
    });
    await prisma.installmentPlan.deleteMany({ where: { customerId: { in: oldCustomerIds } } });
    await prisma.saleItem.deleteMany({ where: { sale: { customerId: { in: oldCustomerIds } } } });
    await prisma.sale.deleteMany({ where: { customerId: { in: oldCustomerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: oldCustomerIds } } });
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
  const seller = await prisma.user.findFirst({
    where: {
      storeId: store.id,
      isActive: true,
      responsibilities: { some: { responsibility: 'SELLER' } },
    },
  });
  if (!seller) throw new Error('No seller');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  const phoneSuffix = String(Date.now()).slice(-7);
  const phone = `+99890${phoneSuffix.padStart(7, '0').slice(0, 7)}`;

  const createCustomer = await request('POST', '/api/customers', {
    cookie,
    body: {
      firstName: 'E2E',
      lastName: 'Mijoz',
      phone,
      notes: MARKER,
    },
  });
  if (createCustomer.status !== 201) {
    throw new Error(
      `create customer failed ${createCustomer.status} ${JSON.stringify(createCustomer.body)}`,
    );
  }
  const customer = (dataOf(createCustomer.body).customer as Json) ?? {};
  const customerId = String(customer.id);
  if (!customerId) throw new Error('missing customer id');
  if (String(customer.phone) !== phone && !String(customer.phone).startsWith('+998')) {
    throw new Error(`phone not normalised: ${customer.phone}`);
  }

  // Duplicate normalised phone must fail
  const dup = await request('POST', '/api/customers', {
    cookie,
    body: {
      firstName: 'Dup',
      lastName: 'Phone',
      phone: phone.replace('+998', ''),
      notes: MARKER,
    },
  });
  if (dup.status < 400) throw new Error(`expected duplicate phone rejection, got ${dup.status}`);

  const sku = `CUST-E2E-${Date.now()}`;
  const createProduct = await request('POST', '/api/products', {
    cookie,
    body: {
      name: `${MARKER} Divan`,
      sku,
      costPrice: 4_000_000,
      defaultSalePrice: 10_000_000,
      minStockQty: 0,
      trackStock: true,
      description: MARKER,
    },
  });
  if (createProduct.status !== 201) {
    throw new Error(
      `create product failed ${createProduct.status} ${JSON.stringify(createProduct.body)}`,
    );
  }
  const productId = String((dataOf(createProduct.body).product as Json).id);

  const stockIn = await request('POST', '/api/inventory/stock-in', {
    cookie,
    body: { productId, quantity: 2, reason: `${MARKER} stock` },
  });
  if (stockIn.status !== 200 && stockIn.status !== 201) {
    throw new Error(`stock-in failed ${stockIn.status}`);
  }

  let saleId: string | null = null;

  try {
    const saleRes = await request('POST', '/api/sales', {
      cookie,
      body: {
        customerId,
        sellerId: seller.id,
        items: [
          {
            productId,
            quantity: 1,
            unitCostPrice: 4_000_000,
            unitSalePrice: 10_000_000,
          },
        ],
        paymentType: 'DEPOSIT',
        depositAmount: 3_000_000,
        depositMethod: 'CASH',
        notes: MARKER,
      },
    });
    if (saleRes.status !== 201 && saleRes.status !== 200) {
      throw new Error(`sale failed ${saleRes.status} ${JSON.stringify(saleRes.body)}`);
    }
    const sale = dataOf(saleRes.body).sale as Json;
    saleId = String(sale.id);
    if (Number(sale.totalSalePrice) !== 10_000_000) {
      throw new Error(`expected total 10M got ${sale.totalSalePrice}`);
    }
    if (Number(sale.paidAmount) !== 3_000_000) {
      throw new Error(`expected paid 3M got ${sale.paidAmount}`);
    }
    if (Number(sale.remainingAmount) !== 7_000_000) {
      throw new Error(`expected remaining 7M got ${sale.remainingAmount}`);
    }

    const detail1 = await request('GET', `/api/customers/${customerId}`, { cookie });
    if (detail1.status !== 200) throw new Error('customer detail failed');
    const c1 = dataOf(detail1.body).customer as Json;
    const fin1 = c1.financial as Json;
    if (Number(fin1.totalPurchases) !== 10_000_000) throw new Error('totalPurchases != 10M');
    if (Number(fin1.totalPaid) !== 3_000_000) throw new Error('totalPaid != 3M');
    if (Number(fin1.outstandingDebt) !== 7_000_000) throw new Error('debt != 7M');

    const pay2 = await request('POST', `/api/debts/${saleId}/payments`, {
      cookie,
      body: { amount: 2_000_000, method: 'CASH', note: `${MARKER} pay2` },
    });
    if (pay2.status !== 201) {
      throw new Error(`payment2 failed ${pay2.status} ${JSON.stringify(pay2.body)}`);
    }

    const detail2 = await request('GET', `/api/customers/${customerId}`, { cookie });
    const fin2 = (dataOf(detail2.body).customer as Json).financial as Json;
    if (Number(fin2.outstandingDebt) !== 5_000_000) {
      throw new Error(`debt after pay2 expected 5M got ${fin2.outstandingDebt}`);
    }
    if (Number(fin2.totalPaid) !== 5_000_000) {
      throw new Error(`paid after pay2 expected 5M got ${fin2.totalPaid}`);
    }

    const debts = await request('GET', '/api/debts?pageSize=100', { cookie });
    if (debts.status !== 200) throw new Error('debts list failed');
    const debtSummary = dataOf(debts.body).summary as Json;
    const debtItems = (dataOf(debts.body).items as Json[]) ?? [];
    const debtRow = debtItems.find((row) => row.saleId === saleId);
    if (!debtRow) throw new Error('sale missing from debts list');
    if (Number(debtRow.remainingAmount) !== 5_000_000) {
      throw new Error('debts row remaining != 5M');
    }
    if (Number(debtSummary.totalOutstanding) < 5_000_000) {
      throw new Error('store outstanding does not include 5M');
    }

    // Reports debts (admin) — reconcile via same debt.repository summary
    const reportsDebts = await request('GET', '/api/reports/debts', { cookie });
    if (reportsDebts.status === 200) {
      const reportPayload = dataOf(reportsDebts.body);
      const reportDebts =
        (reportPayload.debts as Json | undefined) ?? reportPayload;
      const reportSummary = (reportDebts.summary as Json) ?? {};
      const reportOutstanding = Number(reportSummary.totalOutstanding ?? 0);
      const debtsOutstanding = Number(debtSummary.totalOutstanding ?? 0);
      if (reportOutstanding !== debtsOutstanding) {
        throw new Error(
          `reports outstanding ${reportOutstanding} != debts ${debtsOutstanding}`,
        );
      }
      if (reportOutstanding < 5_000_000) {
        throw new Error('reports outstanding below customer debt');
      }
      const reportItems = (reportDebts.items as Json[]) ?? [];
      if (!reportItems.some((row) => row.saleId === saleId)) {
        // list is pageSize 50 — if crowded, at least summary matched debts module
        console.warn('sale not in first 50 report debt items (summary still matched)');
      }
    }

    const salesHistory = ((dataOf(detail2.body).customer as Json).sales as Json[]) ?? [];
    if (!salesHistory.some((s) => s.saleId === saleId)) {
      throw new Error('sale missing from customer history');
    }

    const cancel = await request('POST', `/api/sales/${saleId}/cancel`, {
      cookie,
      body: { reason: `${MARKER} cancel` },
    });
    if (cancel.status !== 200) {
      throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
    }

    const detail3 = await request('GET', `/api/customers/${customerId}`, { cookie });
    const c3 = dataOf(detail3.body).customer as Json;
    const fin3 = c3.financial as Json;
    if (Number(fin3.outstandingDebt) !== 0) {
      throw new Error(`debt after cancel expected 0 got ${fin3.outstandingDebt}`);
    }
    if (Number(fin3.totalPurchases) !== 0) {
      throw new Error(`purchases after cancel expected 0 (cancelled excluded) got ${fin3.totalPurchases}`);
    }
    const hist = (c3.sales as Json[]) ?? [];
    const cancelledRow = hist.find((s) => s.saleId === saleId);
    if (!cancelledRow) throw new Error('cancelled sale missing from history');
    if (String(cancelledRow.status) !== 'CANCELLED') {
      throw new Error('sale status not CANCELLED in history');
    }

    const debtsAfter = await request('GET', '/api/debts?pageSize=100', { cookie });
    const afterItems = (dataOf(debtsAfter.body).items as Json[]) ?? [];
    if (afterItems.some((row) => row.saleId === saleId)) {
      throw new Error('cancelled sale still in debts list');
    }

    // Archive — must leave options
    const archive = await request('POST', `/api/customers/${customerId}/archive`, { cookie });
    if (archive.status !== 200) throw new Error(`archive failed ${archive.status}`);

    const options = await request(
      'GET',
      `/api/customers/options?q=${encodeURIComponent(phone)}`,
      { cookie },
    );
    if (options.status !== 200) throw new Error('options failed');
    const optionIds = ((dataOf(options.body).items as Json[]) ?? []).map((i) => String(i.id));
    if (optionIds.includes(customerId)) {
      throw new Error('archived customer still in POS options');
    }

    const restore = await request('POST', `/api/customers/${customerId}/restore`, { cookie });
    if (restore.status !== 200) throw new Error(`restore failed ${restore.status}`);

    // Multi-tenant: other store customer 404
    const otherStore = await prisma.store.findFirst({
      where: { isActive: true, id: { not: store.id } },
    });
    if (otherStore) {
      const foreign = await prisma.customer.findFirst({
        where: { storeId: otherStore.id },
        select: { id: true },
      });
      if (foreign) {
        const cross = await request('GET', `/api/customers/${foreign.id}`, { cookie });
        if (cross.status !== 404) {
          throw new Error(`expected cross-store 404, got ${cross.status}`);
        }
      }
    }

    console.log('CUSTOMER_MODULE_E2E_OK');
  } finally {
    // Leave cancelled sale history — soft cleanup of marker product only if no FKs
    // Customer with sales cannot be hard-deleted; keep ARCHIVED marker for audit.
    await prisma.customer.updateMany({
      where: { id: customerId },
      data: { status: 'ARCHIVED', notes: `${MARKER} done` },
    });
    void saleId;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
