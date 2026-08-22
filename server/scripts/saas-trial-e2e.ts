/**
 * PostgreSQL E2E: trial → lock → payment request → approve/reject → isolation.
 * Marker: SAAS_TRIAL_E2E_OK
 */
import { UserRole } from '@furniture-erp/shared';
import { PrismaClient } from '@prisma/client';

const API = process.env.STORE_CREATION_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

const PLATFORM_IDENTIFIER = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform';
const PLATFORM_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'Platform123!';

const suffix = `${Date.now()}`.slice(-8);
const PHONE_A = `+99890${suffix.padStart(7, '0').slice(0, 7)}`;
const PHONE_B = `+99891${suffix.padStart(7, '0').slice(0, 7)}`;
const EMAIL_A = `saas.a.${suffix}@e2e.local`;
const EMAIL_B = `saas.b.${suffix}@e2e.local`;
const USERNAME_A = `saasa${suffix}`;
const USERNAME_B = `saasb${suffix}`;
const STORE_A = `SaaS Trial Store ${suffix}`;
const STORE_B = `SaaS Isol Store ${suffix}`;
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

async function currentSubscription(storeId: string) {
  return prisma.storeSubscription.findFirst({ where: { storeId, isCurrent: true } });
}

async function expireCurrentSubscription(storeId: string, extra: Record<string, Date> = {}) {
  const current = await currentSubscription(storeId);
  assert(current, `current subscription missing for ${storeId}`);
  return prisma.storeSubscription.update({
    where: { id: current.id },
    data: {
      trialEndsAt: new Date('2020-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      ...extra,
    },
  });
}

async function createAndApproveStore(
  platformCookie: string,
  input: { phone: string; email: string; username: string; storeName: string },
) {
  const created = await request<{ request: { id: string } }>('/store-requests', {
    method: 'POST',
    body: {
      applicantFirstName: 'SaaS',
      applicantLastName: 'Owner',
      phone: input.phone,
      email: input.email,
      username: input.username,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
      storeName: input.storeName,
      region: 'Samarqand',
      district: 'Urgut',
      address: "Bog' ko'chasi 1",
    },
  });
  assert(created.status === 201, `create failed: ${created.status} ${created.json.error?.message}`);
  const approved = await request<{
    store: { id: string };
    owner: { id: string; storeId: string };
  }>(`/platform/store-requests/${created.json.data!.request.id}/approve`, {
    method: 'POST',
    cookie: platformCookie,
  });
  assert(approved.status === 200, `approve failed: ${approved.json.error?.message}`);
  return approved.json.data!;
}

async function main() {
  const platformLogin = await request<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: PLATFORM_IDENTIFIER, password: PLATFORM_PASSWORD },
  });
  assert(platformLogin.status === 200, `platform login failed: ${platformLogin.status}`);
  assert(platformLogin.json.data?.user.role === UserRole.PLATFORM_ADMIN, 'expected PLATFORM_ADMIN');
  const platformCookie = platformLogin.cookie;

  const createdA = await createAndApproveStore(platformCookie, {
    phone: PHONE_A,
    email: EMAIL_A,
    username: USERNAME_A,
    storeName: STORE_A,
  });
  const storeId = createdA.store.id;
  const ownerId = createdA.owner.id;

  const sub = await currentSubscription(storeId);
  assert(sub, 'trial subscription missing');
  assert(sub.status === 'TRIAL', `expected TRIAL, got ${sub.status}`);
  assert(sub.trialEndsAt, 'trialEndsAt missing');
  const trialMs = sub.trialEndsAt.getTime() - sub.trialStartedAt!.getTime();
  assert(trialMs >= 6.5 * 86_400_000 && trialMs <= 7.5 * 86_400_000, 'trial was not 7 days');

  const ownerLogin = await request<{
    user: { storeId: string; subscription?: { status: string; canWrite: boolean } };
  }>('/auth/login', {
    method: 'POST',
    body: { identifier: USERNAME_A, password: PASSWORD },
  });
  assert(ownerLogin.status === 200, `owner login failed: ${ownerLogin.json.error?.message}`);
  assert(ownerLogin.json.data?.user.subscription?.status === 'TRIAL', 'login snapshot not TRIAL');
  assert(ownerLogin.json.data?.user.subscription?.canWrite === true, 'trial should allow writes');
  const ownerCookie = ownerLogin.cookie;

  const customer = await request<{ customer: { id: string } }>('/customers', {
    method: 'POST',
    cookie: ownerCookie,
    body: { firstName: 'Ali', lastName: 'Karimov', phone: `+99893${suffix}` },
  });
  assert(
    customer.status === 201 || customer.status === 200,
    `customer create failed: ${customer.status} ${customer.json.error?.message}`,
  );
  const customerId = customer.json.data!.customer.id;

  const product = await request<{ product: { id: string } }>('/products', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      name: `SaaS Chair ${suffix}`,
      costPrice: 100000,
      defaultSalePrice: 150000,
      trackStock: false,
    },
  });
  assert(
    product.status === 201 || product.status === 200,
    `product create failed: ${product.status} ${product.json.error?.message}`,
  );
  const productId = product.json.data!.product.id;

  const sale = await request<{ sale: { id: string } }>('/sales', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      customerId,
      sellerId: ownerId,
      items: [{ productId, quantity: 1, unitCostPrice: 100000, unitSalePrice: 150000 }],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 150000,
      depositMethod: 'CASH',
    },
  });
  assert(
    sale.status === 201 || sale.status === 200,
    `sale create failed: ${sale.status} ${sale.json.error?.message}`,
  );

  await expireCurrentSubscription(storeId);

  const listed = await request<{ items: { id: string }[] }>('/customers', { cookie: ownerCookie });
  assert(listed.status === 200, 'expired store should still read customers');
  assert(
    listed.json.data?.items.some((item) => item.id === customerId),
    'old customer disappeared',
  );

  const blockedSale = await request('/sales', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      customerId,
      sellerId: ownerId,
      items: [{ productId, quantity: 1, unitCostPrice: 100000, unitSalePrice: 150000 }],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 150000,
      depositMethod: 'CASH',
    },
  });
  assert(blockedSale.status === 402, `expired sale expected 402, got ${blockedSale.status}`);
  assert(blockedSale.json.error?.code === 'SUBSCRIPTION_REQUIRED', 'expected SUBSCRIPTION_REQUIRED');

  const blockedCustomer = await request('/customers', {
    method: 'POST',
    cookie: ownerCookie,
    body: { firstName: 'Vali', lastName: 'Qarzdor', phone: `+99894${suffix}` },
  });
  assert(blockedCustomer.status === 402, `expired customer expected 402, got ${blockedCustomer.status}`);

  const blockedProduct = await request('/products', {
    method: 'POST',
    cookie: ownerCookie,
    body: { name: 'Locked', costPrice: 1, defaultSalePrice: 2, trackStock: false },
  });
  assert(blockedProduct.status === 402, `expired product expected 402, got ${blockedProduct.status}`);

  const plans = await request<{ items: { id: string; name: string }[] }>('/billing/plans', {
    cookie: ownerCookie,
  });
  assert(plans.status === 200, `store plans failed: ${plans.json.error?.message}`);
  const pro = plans.json.data?.items.find((plan) => plan.name === 'PRO') ?? plans.json.data?.items[0];
  assert(pro, 'no plan to request');

  const payReq = await request<{ request: { id: string; status: string } }>(
    '/billing/payment-requests',
    {
      method: 'POST',
      cookie: ownerCookie,
      body: { planId: pro.id, note: 'E2E payment request' },
    },
  );
  assert(payReq.status === 201 || payReq.status === 200, `payment request failed: ${payReq.json.error?.message}`);
  assert(payReq.json.data?.request.status === 'PENDING', 'request not PENDING');
  const requestId = payReq.json.data!.request.id;

  const pending = await request<{ items: { id: string; storeId: string }[] }>(
    '/platform/subscription-requests?status=PENDING',
    { cookie: platformCookie },
  );
  assert(pending.status === 200, 'platform pending requests failed');
  assert(
    pending.json.data?.items.some((row) => row.id === requestId),
    'platform admin did not see payment request',
  );

  const rejectOther = await createAndApproveStore(platformCookie, {
    phone: PHONE_B,
    email: EMAIL_B,
    username: USERNAME_B,
    storeName: STORE_B,
  });
  const ownerBLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: USERNAME_B, password: PASSWORD },
  });
  assert(ownerBLogin.status === 200, 'store B login failed');
  await expireCurrentSubscription(rejectOther.store.id);
  const reqB = await request<{ request: { id: string } }>('/billing/payment-requests', {
    method: 'POST',
    cookie: ownerBLogin.cookie,
    body: { planId: pro.id },
  });
  assert(reqB.status === 201 || reqB.status === 200, `store B request failed: ${reqB.json.error?.message}`);
  const rejected = await request(`/platform/subscription-requests/${reqB.json.data!.request.id}/reject`, {
    method: 'POST',
    cookie: platformCookie,
    body: { reason: 'Test rejection' },
  });
  assert(rejected.status === 200, `reject failed: ${rejected.json.error?.message}`);
  const stillBlocked = await request('/customers', {
    method: 'POST',
    cookie: ownerBLogin.cookie,
    body: { firstName: 'No', lastName: 'Write', phone: `+99895${suffix}` },
  });
  assert(stillBlocked.status === 402, 'rejected payment should keep writes locked');

  const isolation = await request<{ items: { id: string }[] }>('/customers', {
    cookie: ownerBLogin.cookie,
  });
  assert(isolation.status === 200, 'store B customer list failed');
  assert(
    !JSON.stringify(isolation.json).includes(customerId),
    'store B saw store A customer',
  );

  const forbidden = await request('/platform/plans', { cookie: ownerCookie });
  assert(forbidden.status === 403, `store ADMIN expected 403 on platform plans, got ${forbidden.status}`);

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const paid = await request(`/platform/subscription-requests/${requestId}/approve`, {
    method: 'POST',
    cookie: platformCookie,
    body: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      paymentMethod: 'CASH',
    },
  });
  assert(paid.status === 200, `approve failed: ${paid.json.error?.message}`);

  const activeSub = await currentSubscription(storeId);
  assert(activeSub?.status === 'ACTIVE', `expected ACTIVE, got ${activeSub?.status}`);
  const periodMs = activeSub!.currentPeriodEnd.getTime() - activeSub!.currentPeriodStart.getTime();
  assert(periodMs >= 27 * 86_400_000, 'active period was not ~1 month');

  const saleAgain = await request('/sales', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      customerId,
      sellerId: ownerId,
      items: [{ productId, quantity: 1, unitCostPrice: 100000, unitSalePrice: 150000 }],
      paymentType: 'FULL_PAYMENT',
      depositAmount: 150000,
      depositMethod: 'CASH',
    },
  });
  assert(
    saleAgain.status === 201 || saleAgain.status === 200,
    `sale after approve failed: ${saleAgain.status} ${saleAgain.json.error?.message}`,
  );

  await expireCurrentSubscription(storeId, { currentPeriodEnd: new Date('2020-02-01T00:00:00.000Z') });
  const expiredAgain = await request('/customers', {
    method: 'POST',
    cookie: ownerCookie,
    body: { firstName: 'Late', lastName: 'Period', phone: `+99896${suffix}` },
  });
  assert(expiredAgain.status === 402, 'second month expiry should lock writes');

  const dashboard = await request<{ trialStores: number; totalStores: number }>(
    '/platform/dashboard',
    { cookie: platformCookie },
  );
  assert(dashboard.status === 200, 'platform dashboard failed');
  assert(typeof dashboard.json.data?.totalStores === 'number', 'dashboard KPIs missing');

  console.log('SAAS_TRIAL_E2E_OK');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
