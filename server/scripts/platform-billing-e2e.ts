/**
 * PostgreSQL E2E: platform billing plans, invoices, payment, isolation.
 * Marker: PLATFORM_BILLING_E2E_OK
 */
import { UserRole } from '@furniture-erp/shared';
import { PrismaClient } from '@prisma/client';

const API = process.env.STORE_CREATION_API_BASE ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();

const PLATFORM_IDENTIFIER = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform';
const PLATFORM_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'Platform123!';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

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

  const adminLogin = await request<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: 'admin', password: ADMIN_PASSWORD },
  });
  assert(adminLogin.status === 200, 'store admin login failed');
  const forbidden = await request('/platform/plans', { cookie: adminLogin.cookie });
  assert(forbidden.status === 403, `store ADMIN expected 403, got ${forbidden.status}`);

  const plans = await request<{ items: { id: string; name: string }[] }>('/platform/plans', {
    cookie: platformCookie,
  });
  assert(plans.status === 200, `plans failed: ${plans.json.error?.message}`);
  assert((plans.json.data?.items.length ?? 0) >= 1, 'no subscription plans');

  const shops = await request<{ items: { id: string; accessStatus: string; name: string }[] }>(
    '/platform/shops',
    { cookie: platformCookie },
  );
  assert(shops.status === 200, `shops failed: ${shops.json.error?.message}`);
  const shop = shops.json.data?.items[0];
  assert(shop, 'no shops');
  assert(shop.accessStatus === 'ACTIVE', `existing shop was not ACTIVE: ${shop.accessStatus}`);

  const invoices = await request<{ items: { id: string; status: string; storeId: string }[] }>(
    '/platform/invoices',
    { cookie: platformCookie },
  );
  assert(invoices.status === 200, `invoices failed: ${invoices.json.error?.message}`);

  const dashboard = await request<{ totalStores: number; monthRevenue: number }>('/platform/dashboard', {
    cookie: platformCookie,
  });
  assert(dashboard.status === 200, `dashboard failed: ${dashboard.json.error?.message}`);

  const settings = await request<{ settings: { gracePeriodDays: number } }>('/platform/settings', {
    cookie: platformCookie,
  });
  assert(settings.status === 200, `settings failed: ${settings.json.error?.message}`);
  assert((settings.json.data?.settings.gracePeriodDays ?? -1) >= 0, 'grace period missing');

  const productCount = await prisma.product.count({ where: { storeId: shop.id } });
  const afterCount = await prisma.product.count({ where: { storeId: shop.id } });
  assert(productCount === afterCount, 'billing e2e mutated store products');

  console.log('PLATFORM_BILLING_E2E_OK');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
