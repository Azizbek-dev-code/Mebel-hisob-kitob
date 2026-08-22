/**
 * Live API E2E against an empty platform, then leaves data for the caller to wipe
 * with `npm run db:clear-demo -- --yes`. Marker: EMPTY_PLATFORM_E2E_OK
 */
import { UserRole } from '@furniture-erp/shared';
import { PrismaClient } from '@prisma/client';

const API = process.env.STORE_CREATION_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

const PLATFORM_IDENTIFIER = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform';
const PLATFORM_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'Platform123!';

const suffix = `${Date.now()}`.slice(-8);
const PASSWORD = 'Owner123!';

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
}

async function request<T>(
  path: string,
  options: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<{ status: number; json: Envelope<T>; cookie: string }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.cookie) headers.Cookie = options.cookie;

  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const setCookie = res.headers.getSetCookie?.()?.join('; ') ?? res.headers.get('set-cookie') ?? '';
  const cookie = options.cookie ?? (setCookie ? setCookie.split(',')[0]!.split(';')[0]! : '');
  const json = (await res.json().catch(() => ({ success: false }))) as Envelope<T>;
  return { status: res.status, json, cookie };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function approveStore(cookie: string, storeName: string, phone: string, email: string, username: string) {
  const created = await request<{ request: { id: string } }>('/store-requests', {
    method: 'POST',
    body: {
      applicantFirstName: 'Test',
      applicantLastName: 'Owner',
      phone,
      email,
      username,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
      storeName,
      region: 'Samarqand',
      district: 'Urgut',
      address: "Bog' ko'chasi 1",
    },
  });
  assert(created.status === 201, `create request failed: ${created.json.error?.message}`);
  const id = created.json.data!.request.id;
  const approved = await request<{ store: { id: string }; owner: { storeId: string } }>(
    `/platform/store-requests/${id}/approve`,
    { method: 'POST', cookie },
  );
  assert(approved.status === 200, `approve failed: ${approved.json.error?.message}`);
  return approved.json.data!.store.id;
}

async function main(): Promise<void> {
  const unauth = await request('/platform/plans');
  assert(unauth.status === 401, `expected 401, got ${unauth.status}`);

  const platformLogin = await request<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: PLATFORM_IDENTIFIER, password: PLATFORM_PASSWORD },
  });
  assert(platformLogin.status === 200, `platform login: ${platformLogin.json.error?.message}`);
  assert(platformLogin.json.data?.user.role === UserRole.PLATFORM_ADMIN, 'not PLATFORM_ADMIN');
  const platformCookie = platformLogin.cookie;

  const dashboard = await request<{
    totalStores: number;
    activeStores: number;
    blockedStores: number;
    pendingStoreRequests: number;
    pendingPayments: number;
    monthRevenue: number;
    monthExpenses: number;
    monthNetProfit: number;
  }>('/platform/dashboard', { cookie: platformCookie });
  assert(dashboard.status === 200, `dashboard: ${dashboard.json.error?.message}`);
  const d = dashboard.json.data!;
  assert(d.totalStores === 0, `totalStores ${d.totalStores}`);
  assert(d.activeStores === 0, `activeStores ${d.activeStores}`);
  assert(d.blockedStores === 0, `blockedStores ${d.blockedStores}`);
  assert(d.pendingStoreRequests === 0, `pending ${d.pendingStoreRequests}`);
  assert(d.pendingPayments === 0, `pendingPayments ${d.pendingPayments}`);
  assert(d.monthRevenue === 0, `revenue ${d.monthRevenue}`);
  assert(d.monthExpenses === 0, `expenses ${d.monthExpenses}`);
  assert(d.monthNetProfit === 0, `profit ${d.monthNetProfit}`);

  for (const path of ['/platform/plans', '/platform/shops', '/platform/invoices', '/platform/expenses', '/platform/pnl', '/platform/analytics', '/platform/settings']) {
    const res = await request(path, { cookie: platformCookie });
    assert(res.status === 200, `${path} ${res.status} ${res.json.error?.message}`);
  }

  const storeA = `Clean Store A ${suffix}`;
  const storeB = `Clean Store B ${suffix}`;
  const phoneA = `+99890${suffix.padStart(7, '0').slice(0, 7)}`;
  const phoneB = `+99891${suffix.padStart(7, '0').slice(0, 7)}`;
  const emailA = `ownera.${suffix}@e2e.local`;
  const emailB = `ownerb.${suffix}@e2e.local`;
  const userA = `ownera${suffix}`;
  const userB = `ownerb${suffix}`;

  const storeAId = await approveStore(platformCookie, storeA, phoneA, emailA, userA);
  const storeBId = await approveStore(platformCookie, storeB, phoneB, emailB, userB);

  const ownerA = await request<{ user: { role: string; storeId: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: userA, password: PASSWORD },
  });
  assert(ownerA.status === 200, `owner A login: ${ownerA.json.error?.message}`);
  assert(ownerA.json.data?.user.storeId === storeAId, 'owner A store mismatch');
  const cookieA = ownerA.cookie;

  const forbidden = await request('/platform/plans', { cookie: cookieA });
  assert(forbidden.status === 403, `store ADMIN platform expected 403, got ${forbidden.status}`);

  const ownerB = await request<{ user: { storeId: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: userB, password: PASSWORD },
  });
  assert(ownerB.status === 200, `owner B login: ${ownerB.json.error?.message}`);
  const cookieB = ownerB.cookie;

  const customer = await request<{ customer: { id: string } }>('/customers', {
    method: 'POST',
    cookie: cookieA,
    body: { firstName: 'Ali', lastName: 'Test', phone: `+99893${suffix.padStart(7, '0').slice(0, 7)}` },
  });
  assert(customer.status === 201 || customer.status === 200, `customer: ${customer.json.error?.message}`);
  const customerId = customer.json.data?.customer.id;
  assert(customerId, 'customer id');

  const product = await request<{ product: { id: string } }>('/products', {
    method: 'POST',
    cookie: cookieA,
    body: { name: `Chair ${suffix}`, costPrice: 100000, defaultSalePrice: 180000 },
  });
  assert(product.status === 201 || product.status === 200, `product: ${product.json.error?.message}`);
  const productId = product.json.data?.product.id;
  assert(productId, 'product id');

  const stockIn = await request('/inventory/stock-in', {
    method: 'POST',
    cookie: cookieA,
    body: { productId, quantity: 5, reason: 'E2E opening stock' },
  });
  assert(stockIn.status === 201 || stockIn.status === 200, `stock-in: ${stockIn.json.error?.message}`);

  const inventory = await request('/inventory', { cookie: cookieA });
  assert(inventory.status === 200, `inventory: ${inventory.json.error?.message}`);

  const bProducts = await request<{ items: { id: string }[] }>('/products', { cookie: cookieB });
  assert(bProducts.status === 200, 'store B products');
  assert(!JSON.stringify(bProducts.json).includes(productId!), 'isolation: product leaked');

  const bCustomers = await request<{ items: { id: string }[] }>('/customers', { cookie: cookieB });
  assert(bCustomers.status === 200, 'store B customers');
  assert(!JSON.stringify(bCustomers.json).includes(customerId!), 'isolation: customer leaked');

  const sale = await request<{ sale: { id: string; totalSalePrice: number } }>('/sales', {
    method: 'POST',
    cookie: cookieA,
    body: {
      customerId,
      items: [{ productId, quantity: 1, unitSalePrice: 180000, unitCostPrice: 100000 }],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 180000,
      depositMethod: 'CASH',
    },
  });
  assert(sale.status === 201 || sale.status === 200, `sale: ${sale.json.error?.message}`);
  const saleId = sale.json.data?.sale.id;
  assert(saleId, 'sale id');

  const install = await request<{ sale: { id: string } }>('/sales', {
    method: 'POST',
    cookie: cookieA,
    body: {
      customerId,
      items: [{ productId, quantity: 1, unitSalePrice: 180000, unitCostPrice: 100000 }],
      paymentType: 'INSTALLMENT',
      depositAmount: 30000,
      depositMethod: 'CASH',
      installmentMonthCount: 3,
    },
  });
  assert(install.status === 201 || install.status === 200, `installment: ${install.json.error?.message}`);

  const categories = await request<{ items: { id: string }[] }>('/expense-categories', { cookie: cookieA });
  assert(categories.status === 200, `categories: ${categories.json.error?.message}`);
  const categoryId = categories.json.data?.items[0]?.id;
  if (categoryId) {
    const expense = await request('/expenses', {
      method: 'POST',
      cookie: cookieA,
      body: { categoryId, amount: 25000, expenseDate: new Date().toISOString().slice(0, 10) },
    });
    assert(expense.status === 201 || expense.status === 200, `expense: ${expense.json.error?.message}`);
  }

  const worker = await request<{ worker: { id: string } }>('/workers', {
    method: 'POST',
    cookie: cookieA,
    body: {
      firstName: 'Usta',
      lastName: 'E2E',
      username: `usta${suffix}`,
      phone: `+99894${suffix.padStart(7, '0').slice(0, 7)}`,
      password: 'Worker123!',
      responsibilities: ['ASSEMBLER'],
      isActive: true,
    },
  });
  assert(worker.status === 201 || worker.status === 200, `worker: ${worker.json.error?.message}`);

  const cancel = await request(`/sales/${saleId}/cancel`, {
    method: 'POST',
    cookie: cookieA,
    body: { reason: 'E2E cancel' },
  });
  assert(cancel.status === 200, `cancel: ${cancel.json.error?.message}`);

  const reports = await request('/reports/summary?preset=THIS_MONTH', { cookie: cookieA });
  assert(reports.status === 200, `reports ${reports.status} ${reports.json.error?.message}`);

  const audit = await request('/audit', { cookie: cookieA });
  assert(audit.status === 200, `audit ${audit.status}`);

  const leaked = await prisma.product.count({ where: { id: productId, storeId: storeBId } });
  assert(leaked === 0, 'product row leaked to store B');

  console.log(`E2E_OWNER_A=${userA}`);
  console.log(`E2E_OWNER_B=${userB}`);
  console.log('EMPTY_PLATFORM_E2E_OK');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
