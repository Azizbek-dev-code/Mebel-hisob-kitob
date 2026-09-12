/**
 * Product catalogue lifecycle — real PostgreSQL E2E.
 * Marker: PRODUCT_CATALOGUE_E2E_OK
 *
 * Creates a temp product, stocks it, sells it, changes prices (historical
 * SaleItem must stay snapshotted), cancels, archives, then cleans up ONLY
 * the temporary rows created by this script.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();
const MARKER = 'PRODUCT_CATALOGUE_E2E';

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
  // Clean leftover rows from interrupted prior runs (marker-only).
  await prisma.stockMovement.deleteMany({
    where: { product: { description: MARKER } },
  });
  await prisma.saleItem.deleteMany({
    where: { product: { description: MARKER } },
  });
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

  const customer = await prisma.customer.findFirst({ where: { storeId: store.id } });
  if (!customer) throw new Error('No customer');
  const seller = await prisma.user.findFirst({
    where: {
      storeId: store.id,
      isActive: true,
      responsibilities: { some: { responsibility: 'SELLER' } },
    },
  });
  if (!seller) throw new Error('No seller');

  const sku = `E2E-${Date.now()}`;
  const create = await request('POST', '/api/products', {
    cookie,
    body: {
      name: `${MARKER} Divan`,
      sku,
      costPrice: 5_000_000,
      defaultSalePrice: 7_300_000,
      minStockQty: 1,
      trackStock: true,
      description: MARKER,
    },
  });
  if (create.status !== 201) {
    throw new Error(`create failed ${create.status} ${JSON.stringify(create.body)}`);
  }
  const product = (dataOf(create.body).product as Json) ?? {};
  const productId = String(product.id);
  if (!productId) throw new Error('missing product id');

  let saleId: string | null = null;

  try {
    if (Number(product.stockQty) !== 0) throw new Error('new product stock must be 0');

    const stockIn = await request('POST', '/api/inventory/stock-in', {
      cookie,
      body: { productId, quantity: 3, reason: `${MARKER} stock in` },
    });
    if (stockIn.status !== 200 && stockIn.status !== 201) {
      throw new Error(`stock-in failed ${stockIn.status} ${JSON.stringify(stockIn.body)}`);
    }

    const afterStock = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    if (afterStock.stockQty !== 3) throw new Error(`expected stock 3, got ${afterStock.stockQty}`);

    const options = await request('GET', `/api/products/options?q=${encodeURIComponent(sku)}`, {
      cookie,
    });
    if (options.status !== 200) throw new Error('options failed');
    const optionItems = ((dataOf(options.body).items as Json[]) ?? []).map((i) => String(i.id));
    if (!optionItems.includes(productId)) throw new Error('product missing from sale options');

    const sale = await request('POST', '/api/sales', {
      cookie,
      body: {
        customerId: customer.id,
        sellerId: seller.id,
        items: [{ productId, quantity: 1 }],
        paymentType: 'FULL_PAYMENT',
        depositAmount: 7_300_000,
        depositMethod: 'CASH',
        notes: MARKER,
      },
    });
    if (sale.status !== 201 && sale.status !== 200) {
      throw new Error(`sale failed ${sale.status} ${JSON.stringify(sale.body)}`);
    }
    const salePayload = (dataOf(sale.body).sale as Json) ?? dataOf(sale.body);
    saleId = String(salePayload.id);
    const saleItem = ((salePayload.items as Json[]) ?? [])[0];
    if (!saleItem) throw new Error('sale missing items');
    if (Number(saleItem.unitCostPrice) !== 5_000_000) {
      throw new Error(`snapshot cost expected 5M, got ${saleItem.unitCostPrice}`);
    }
    if (Number(saleItem.unitSalePrice) !== 7_300_000) {
      throw new Error(`snapshot sale expected 7.3M, got ${saleItem.unitSalePrice}`);
    }

    const afterSale = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    if (afterSale.stockQty !== 2) throw new Error(`expected stock 2 after sale, got ${afterSale.stockQty}`);

    const pricePatch = await request('PATCH', `/api/products/${productId}`, {
      cookie,
      body: { costPrice: 6_000_000, defaultSalePrice: 8_000_000 },
    });
    if (pricePatch.status !== 200) throw new Error(`price patch failed ${pricePatch.status}`);

    const historical = await prisma.saleItem.findFirst({
      where: { saleId: saleId!, productId },
    });
    if (!historical) throw new Error('sale item missing');
    if (historical.unitCostPrice !== 5_000_000n) {
      throw new Error(`historical COGS mutated: ${historical.unitCostPrice}`);
    }
    if (historical.unitSalePrice !== 7_300_000n) {
      throw new Error(`historical sale price mutated: ${historical.unitSalePrice}`);
    }

    const cancel = await request('POST', `/api/sales/${saleId}/cancel`, {
      cookie,
      body: { reason: `${MARKER} cancel` },
    });
    if (cancel.status !== 200) {
      throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
    }
    saleId = null;

    const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    if (afterCancel.stockQty !== 3) {
      throw new Error(`expected stock restored to 3, got ${afterCancel.stockQty}`);
    }

    const archive = await request('POST', `/api/products/${productId}/archive`, { cookie });
    if (archive.status !== 200) throw new Error(`archive failed ${archive.status}`);

    const optionsAfter = await request(
      'GET',
      `/api/products/options?q=${encodeURIComponent(sku)}`,
      { cookie },
    );
    const optionIds = ((dataOf(optionsAfter.body).items as Json[]) ?? []).map((i) => String(i.id));
    if (optionIds.includes(productId)) {
      throw new Error('archived product still appears in sale options');
    }

    const blockedSale = await request('POST', '/api/sales', {
      cookie,
      body: {
        customerId: customer.id,
        sellerId: seller.id,
        items: [{ productId, quantity: 1 }],
        paymentType: 'FULL_PAYMENT',
        depositAmount: 8_000_000,
        depositMethod: 'CASH',
        notes: MARKER,
      },
    });
    if (blockedSale.status < 400) {
      throw new Error('archived product should not be sellable');
    }

    console.log('PRODUCT_CATALOGUE_E2E_OK');
    console.log(
      JSON.stringify({
        productId,
        sku,
        historicalCost: Number(historical.unitCostPrice),
        historicalSale: Number(historical.unitSalePrice),
      }),
    );
  } finally {
    if (saleId) {
      await prisma.payment.deleteMany({ where: { saleId } }).catch(() => undefined);
      await prisma.saleItem.deleteMany({ where: { saleId } }).catch(() => undefined);
      await prisma.sale.deleteMany({ where: { id: saleId } }).catch(() => undefined);
    }
    await prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => undefined);
    await prisma.saleItem.deleteMany({ where: { productId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
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
