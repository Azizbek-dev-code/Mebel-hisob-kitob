/**
 * Purchase delivery details + shopir fee — real PostgreSQL E2E.
 * Marker: PURCHASE_DELIVERY_E2E_OK
 *
 * Create supplier + DELIVERY worker + product → purchase with:
 * deliveredAt, deliveryDays=3, driver, driverFee=150000, paidAmount=2M
 * Verify persistence, debt isolation (fee not in supplier debt), stock,
 * PATCH delivery, cancel keeps delivery history, stock reversal.
 */
import { PrismaClient, UserRole, WorkerResponsibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();
const MARKER = 'PURCHASE_DELIVERY_E2E';

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
  await prisma.userResponsibility.deleteMany({
    where: { user: { email: { contains: `${MARKER.toLowerCase()}@` } } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: `${MARKER.toLowerCase()}@` } } });

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');
  const store = await prisma.store.findUniqueOrThrow({ where: { id: admin.storeId } });

  const e2ePassword = process.env.SEED_ADMIN_PASSWORD ?? 'E2ePurchaseDelivery123!';
  const originalHash = admin.passwordHash;
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(e2ePassword, 4) },
  });

  try {
  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: e2ePassword,
    },
  });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const cookie = extractCookie(login.setCookie, '');

  const beforeExpenses = await prisma.expense.aggregate({
    where: { storeId: store.id, status: 'ACTIVE' },
    _sum: { amount: true },
  });
  const beforeExpenseTotal = Number(beforeExpenses._sum.amount ?? 0n);

  const supplierRes = await request('POST', '/api/suppliers', {
    cookie,
    body: { name: 'TEST Shermat', phone: '901112233', notes: MARKER },
  });
  if (supplierRes.status !== 201) {
    throw new Error(`supplier ${supplierRes.status} ${JSON.stringify(supplierRes.body)}`);
  }
  const supplierId = String((dataOf(supplierRes.body).supplier as Json).id);

  const driverHash = await bcrypt.hash('Driver123!', 4);
  const driver = await prisma.user.create({
    data: {
      storeId: store.id,
      email: `${MARKER.toLowerCase()}@test.local`,
      username: `${MARKER.toLowerCase()}_abdulla`,
      fullName: 'TEST Abdulla',
      role: UserRole.EMPLOYEE,
      passwordHash: driverHash,
      isActive: true,
      responsibilities: {
        create: [{ storeId: store.id, responsibility: WorkerResponsibility.DELIVERY }],
      },
    },
  });

  const productRes = await request('POST', '/api/products', {
    cookie,
    body: {
      name: `${MARKER} Divan`,
      sku: `PD-${Date.now()}`,
      costPrice: 5_000_000,
      defaultSalePrice: 7_000_000,
      trackStock: true,
      description: MARKER,
    },
  });
  if (productRes.status !== 201) throw new Error(`product ${productRes.status}`);
  const productId = String((dataOf(productRes.body).product as Json).id);
  const stock0 = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty;

  const purchaseRes = await request('POST', '/api/purchases', {
    cookie,
    body: {
      supplierId,
      notes: MARKER,
      deliveredAt: '2026-08-24',
      deliveryDays: 3,
      driverId: driver.id,
      driverFee: 150_000,
      paidAmount: 2_000_000,
      paymentMethod: 'CASH',
      items: [{ productId, quantity: 2, unitCost: 5_200_000 }],
    },
  });
  if (purchaseRes.status !== 201 && purchaseRes.status !== 200) {
    throw new Error(`purchase ${purchaseRes.status} ${JSON.stringify(purchaseRes.body)}`);
  }
  const purchase = dataOf(purchaseRes.body).purchase as Json;
  const purchaseId = String(purchase.id);

  if (Number(purchase.totalCost) !== 10_400_000) {
    throw new Error(`totalCost expected 10400000 got ${purchase.totalCost}`);
  }
  if (Number(purchase.driverFee) !== 150_000) {
    throw new Error(`driverFee expected 150000 got ${purchase.driverFee}`);
  }
  if (Number(purchase.deliveryDays) !== 3) {
    throw new Error(`deliveryDays expected 3 got ${purchase.deliveryDays}`);
  }
  if (String(purchase.driverId) !== driver.id) {
    throw new Error(`driverId mismatch`);
  }
  if (Number(purchase.remainingAmount) !== 8_400_000) {
    throw new Error(
      `remaining must be product debt only (8400000), got ${purchase.remainingAmount}`,
    );
  }
  if (!String(purchase.deliveredAt).startsWith('2026-08-24')) {
    throw new Error(`deliveredAt expected 2026-08-24 got ${purchase.deliveredAt}`);
  }

  const get1 = await request('GET', `/api/purchases/${purchaseId}`, { cookie });
  if (get1.status !== 200) throw new Error('GET purchase failed');
  const again = dataOf(get1.body).purchase as Json;
  if (Number(again.driverFee) !== 150_000 || Number(again.deliveryDays) !== 3) {
    throw new Error('delivery fields disappeared after GET');
  }

  const row = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
  if (Number(row.driverFee) !== 150_000) throw new Error('DB driverFee mismatch');
  if (row.deliveryDays !== 3) throw new Error('DB deliveryDays mismatch');
  if (row.driverId !== driver.id) throw new Error('DB driverId mismatch');

  const stock1 = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty;
  if (stock1 !== stock0 + 2) throw new Error(`stock expected +2, got ${stock1 - stock0}`);

  const afterExpenses = await prisma.expense.aggregate({
    where: { storeId: store.id, status: 'ACTIVE' },
    _sum: { amount: true },
  });
  if (Number(afterExpenses._sum.amount ?? 0n) !== beforeExpenseTotal) {
    throw new Error('shopir fee must not create an operating expense');
  }

  const patch = await request('PATCH', `/api/purchases/${purchaseId}`, {
    cookie,
    body: { deliveryDays: 5, driverFee: 175_000 },
  });
  if (patch.status !== 200) {
    throw new Error(`patch failed ${patch.status} ${JSON.stringify(patch.body)}`);
  }
  const patched = dataOf(patch.body).purchase as Json;
  if (Number(patched.deliveryDays) !== 5 || Number(patched.driverFee) !== 175_000) {
    throw new Error('patch did not update delivery fields');
  }
  if (Number(patched.totalCost) !== 10_400_000) {
    throw new Error('patch must not change totalCost');
  }

  const feeBeforeCancel = await prisma.workerFinancialTransaction.findFirst({
    where: {
      storeId: store.id,
      workerId: driver.id,
      type: 'COMMISSION',
      referenceId: `${purchaseId}:DRIVER_FEE`,
    },
  });
  if (!feeBeforeCancel) throw new Error('shopir fee was not posted on stock-in');

  const cancel = await request('POST', `/api/purchases/${purchaseId}/cancel`, {
    cookie,
    body: { reason: `${MARKER} cancel test` },
  });
  if (cancel.status !== 200) {
    throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
  }
  const cancelled = dataOf(cancel.body).purchase as Json;
  if (String(cancelled.status) !== 'CANCELLED') throw new Error('expected CANCELLED');
  if (Number(cancelled.driverFee) !== 175_000) {
    throw new Error('cancel must keep shopir fee in history');
  }
  if (Number(cancelled.deliveryDays) !== 5) {
    throw new Error('cancel must keep delivery days in history');
  }

  // Transport was performed (goods arrived) → the shopir keeps the fee.
  const feeAfterCancel = await prisma.workerFinancialTransaction.findUniqueOrThrow({
    where: { id: feeBeforeCancel.id },
  });
  if (!feeAfterCancel.isOpen) throw new Error('completed transport fee was closed by cancel');
  const feeReversal = await prisma.workerFinancialTransaction.findFirst({
    where: { storeId: store.id, type: 'REVERSAL', referenceId: feeBeforeCancel.id },
  });
  if (feeReversal) throw new Error('completed transport fee must not be reversed on cancel');

  const stock2 = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty;
  if (stock2 !== stock0) throw new Error(`stock must reverse to ${stock0}, got ${stock2}`);

  // Store isolation: purchase row is bound to the admin's store only.
  const scoped = await prisma.purchase.findFirst({
    where: { id: purchaseId, storeId: store.id },
  });
  if (!scoped) throw new Error('purchase not scoped to owning store');
  const foreign = await prisma.purchase.findFirst({
    where: { id: purchaseId, storeId: { not: store.id } },
  });
  if (foreign) throw new Error('purchase incorrectly linked to another store');

  console.log('PURCHASE_DELIVERY_E2E_OK');
  } finally {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: originalHash },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
