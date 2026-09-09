/**
 * E2E: store requests PRO → admin sees PENDING → Accept creates PAID invoice.
 * Marker: SUBSCRIPTION_REQUEST_E2E_OK
 */
import { PlatformBillingStatus, UserRole } from '@furniture-erp/shared';
import { PrismaClient } from '@prisma/client';

const API = process.env.STORE_CREATION_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

const PLATFORM_IDENTIFIER = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform';
const PLATFORM_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'Platform123!';

const suffix = `${Date.now()}`.slice(-8);
const PHONE = `+99890${suffix.padStart(7, '0').slice(0, 7)}`;
const EMAIL = `tariff.${suffix}@e2e.local`;
const USERNAME = `tariff${suffix}`;
const STORE_NAME = `Tariff E2E ${suffix}`;
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

async function main() {
  const platformLogin = await request<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: PLATFORM_IDENTIFIER, password: PLATFORM_PASSWORD },
  });
  assert(platformLogin.status === 200, `platform login failed: ${platformLogin.status}`);
  assert(platformLogin.json.data?.user.role === UserRole.PLATFORM_ADMIN, 'expected PLATFORM_ADMIN');
  const platformCookie = platformLogin.cookie;

  const created = await request<{ request: { id: string } }>('/store-requests', {
    method: 'POST',
    body: {
      applicantFirstName: 'Tariff',
      applicantLastName: 'Owner',
      phone: PHONE,
      email: EMAIL,
      username: USERNAME,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
      storeName: STORE_NAME,
      region: 'Samarqand',
      district: 'Urgut',
      address: "Bog' ko'chasi 1",
    },
  });
  assert(created.status === 201, `create store request failed: ${created.json.error?.message}`);
  const approvedStore = await request<{ store: { id: string } }>(
    `/platform/store-requests/${created.json.data!.request.id}/approve`,
    { method: 'POST', cookie: platformCookie },
  );
  assert(approvedStore.status === 200, `approve store failed: ${approvedStore.json.error?.message}`);
  const storeId = approvedStore.json.data!.store.id;

  const ownerLogin = await request<{ user: { storeId: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: USERNAME, password: PASSWORD },
  });
  assert(ownerLogin.status === 200, `owner login failed: ${ownerLogin.json.error?.message}`);
  const ownerCookie = ownerLogin.cookie;

  const plans = await request<{ items: Array<{ id: string; name: string; monthlyPrice: number }> }>(
    '/billing/plans',
    { cookie: ownerCookie },
  );
  assert(plans.status === 200, `list plans failed: ${plans.json.error?.message}`);
  const pro = plans.json.data?.items.find((plan) => plan.name === 'PRO');
  assert(pro, 'PRO plan not found');

  const beforeInvoices = await prisma.platformInvoice.count({ where: { storeId } });

  const payReq = await request<{
    request: {
      id: string;
      status: string;
      planName: string;
      currentPlanName: string | null;
    };
  }>('/billing/payment-requests', {
    method: 'POST',
    cookie: ownerCookie,
    body: { planId: pro.id, note: 'E2E PRO upgrade' },
  });
  assert(
    payReq.status === 201 || payReq.status === 200,
    `payment request failed: ${payReq.status} ${payReq.json.error?.message}`,
  );
  assert(payReq.json.data?.request.status === 'PENDING', 'request not PENDING');
  assert(payReq.json.data?.request.planName === 'PRO', 'requested plan was not PRO');
  const requestId = payReq.json.data!.request.id;

  const row = await prisma.subscriptionRequest.findUnique({ where: { id: requestId } });
  assert(row, 'request row missing');
  assert(row.fromPlanId, 'fromPlanId was not stored');
  assert(row.fromPlanName, 'fromPlanName was not stored');
  assert(row.planId === pro.id, 'planId is not PRO');

  const pending = await request<{ items: Array<{ id: string; storeName: string; status: string }> }>(
    '/platform/subscription-requests?status=PENDING',
    { cookie: platformCookie },
  );
  assert(pending.status === 200, `admin list failed: ${pending.json.error?.message}`);
  const seen = pending.json.data?.items.find((item) => item.id === requestId);
  assert(seen, 'admin panel did not see the PENDING request');
  assert(seen.storeName === STORE_NAME, 'admin saw the wrong store');

  const accepted = await request<{
    request: { status: string; createdInvoiceId: string | null };
    invoice: { id: string; status: string; amount: number; planName: string };
  }>(`/platform/subscription-requests/${requestId}/approve`, {
    method: 'POST',
    cookie: platformCookie,
    body: { paymentMethod: 'CASH', note: 'E2E accept' },
  });
  assert(accepted.status === 200, `accept failed: ${accepted.status} ${accepted.json.error?.message}`);
  assert(accepted.json.data?.request.status === 'APPROVED', 'request not APPROVED');
  assert(accepted.json.data?.invoice.status === PlatformBillingStatus.PAID, 'invoice not PAID');
  assert(accepted.json.data?.invoice.planName === 'PRO', 'invoice plan is not PRO');
  assert(accepted.json.data?.invoice.amount === pro.monthlyPrice, 'invoice amount mismatch');

  const sub = await prisma.storeSubscription.findFirst({
    where: { storeId, isCurrent: true },
    include: { plan: true },
  });
  assert(sub?.plan.name === 'PRO', `current plan is ${sub?.plan.name}, expected PRO`);
  assert(sub?.status === 'ACTIVE', `subscription status is ${sub?.status}`);

  const payments = await request<{
    totalPaid: number;
    items: Array<{ id: string; status: string; planName: string; amount: number }>;
  }>('/billing/payments', { cookie: ownerCookie });
  assert(payments.status === 200, `store payments failed: ${payments.json.error?.message}`);
  assert(payments.json.data?.totalPaid === pro.monthlyPrice, 'store totalPaid did not update');
  assert(
    payments.json.data?.items.some((item) => item.id === accepted.json.data!.invoice.id && item.status === 'PAID'),
    'payment history missing the accepted invoice',
  );

  const shop = await request<{
    payments: { totalPaid: number; history: Array<{ id: string }> };
    subscription: { planName: string } | null;
  }>(`/platform/shops/${storeId}`, { cookie: platformCookie });
  assert(shop.status === 200, `shop detail failed: ${shop.json.error?.message}`);
  assert(shop.json.data?.subscription?.planName === 'PRO', 'shop profile plan is not PRO');
  assert(shop.json.data?.payments.totalPaid === pro.monthlyPrice, 'shop profile totalPaid mismatch');

  const afterInvoices = await prisma.platformInvoice.count({ where: { storeId } });
  assert(afterInvoices === beforeInvoices + 1, `expected 1 new invoice, got ${afterInvoices - beforeInvoices}`);

  const second = await request(`/platform/subscription-requests/${requestId}/approve`, {
    method: 'POST',
    cookie: platformCookie,
    body: { paymentMethod: 'CASH' },
  });
  assert(second.status === 409 || second.status === 400, `double accept should fail, got ${second.status}`);
  const invoicesAfterSecond = await prisma.platformInvoice.count({ where: { storeId } });
  assert(invoicesAfterSecond === afterInvoices, 'double accept created a duplicate payment');
  const currentCount = await prisma.storeSubscription.count({ where: { storeId, isCurrent: true } });
  assert(currentCount === 1, 'double accept created a second current subscription');

  const isolation = await request('/platform/subscription-requests', { cookie: ownerCookie });
  assert(isolation.status === 403, `store admin must not list all requests, got ${isolation.status}`);

  console.log('SUBSCRIPTION_REQUEST_E2E_OK', {
    storeId,
    requestId,
    invoiceId: accepted.json.data!.invoice.id,
    fromPlanName: row.fromPlanName,
    amount: accepted.json.data!.invoice.amount,
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
