/**
 * Creates a temporary sale for browser cancel E2E. Prints sale id.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'SALE_CANCEL_BROWSER_TEMP';
const prisma = new PrismaClient();

async function request(
  method: string,
  path: string,
  options?: { cookie?: string; body?: unknown },
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.cookie) headers.Cookie = options.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => ({}))) as Record<string, unknown>,
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

async function main() {
  // cleanup leftovers
  const stale = await prisma.sale.findMany({ where: { notes: MARKER }, select: { id: true } });
  for (const row of stale) {
    await prisma.workerActivity.deleteMany({ where: { relatedSaleId: row.id } });
    await prisma.payment.deleteMany({ where: { saleId: row.id } });
    await prisma.saleItem.deleteMany({ where: { saleId: row.id } });
    await prisma.sale.delete({ where: { id: row.id } });
  }

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  const admin = await prisma.user.findFirst({
    where: { storeId: store!.id, role: UserRole.ADMIN, isActive: true },
  });
  const customer = await prisma.customer.findFirst({ where: { storeId: store!.id } });
  const product = await prisma.product.findFirst({
    where: { storeId: store!.id, status: 'ACTIVE' },
  });
  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin!.username ?? admin!.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  const cookie = extractCookie(login.setCookie, '');
  const maxSale = await prisma.sale.aggregate({
    where: { storeId: store!.id },
    _max: { saleNumber: true },
  });
  const saleNumber = (maxSale._max.saleNumber ?? 0) + 1;
  const sale = await prisma.sale.create({
    data: {
      storeId: store!.id,
      saleNumber,
      customerId: customer!.id,
      sellerId: admin!.id,
      createdById: admin!.id,
      saleDate: new Date('2026-08-20T10:00:00.000Z'),
      status: 'ACTIVE',
      paymentType: 'FULL_PAYMENT',
      paymentStatus: 'UNPAID',
      subtotal: 500_000n,
      totalSalePrice: 500_000n,
      totalCostPrice: 200_000n,
      paidAmount: 0n,
      remainingAmount: 500_000n,
      grossProfit: 300_000n,
      netProfit: 300_000n,
      notes: MARKER,
      items: {
        create: [
          {
            storeId: store!.id,
            productId: product!.id,
            productName: product!.name,
            productSku: product!.sku,
            quantity: 1,
            unitCostPrice: 200_000n,
            unitSalePrice: 500_000n,
            lineCostTotal: 200_000n,
            lineSaleTotal: 500_000n,
          },
        ],
      },
    },
  });
  console.log(JSON.stringify({ saleId: sale.id, saleNumber, cookieOk: Boolean(cookie) }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
