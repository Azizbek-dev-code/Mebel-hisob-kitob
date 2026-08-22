/**
 * PostgreSQL E2E: store creation request → PLATFORM_ADMIN approve/reject → isolation.
 * Marker: STORE_CREATION_E2E_OK
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
const EMAIL_A = `owner.${suffix}@e2e.local`;
const EMAIL_B = `reject.${suffix}@e2e.local`;
const USERNAME_A = `owner${suffix}`;
const USERNAME_B = `reject${suffix}`;
const STORE_A = `TEST Furniture Store ${suffix}`;
const STORE_B = `Reject Store ${suffix}`;
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
  const created = await request<{ request: { id: string; status: string; phone: string } }>(
    '/store-requests',
    {
      method: 'POST',
      body: {
        applicantFirstName: 'Test',
        applicantLastName: 'Store Owner',
        phone: PHONE_A,
        email: EMAIL_A,
        username: USERNAME_A,
        password: PASSWORD,
        passwordConfirmation: PASSWORD,
        storeName: STORE_A,
        region: 'Samarqand',
        district: 'Urgut',
        address: "Bog' ko'chasi 1",
      },
    },
  );
  assert(created.status === 201, `create failed: ${created.status} ${created.json.error?.message}`);
  assert(created.json.data?.request.status === 'PENDING', 'request was not PENDING');
  const requestId = created.json.data!.request.id;
  assert(!JSON.stringify(created.json).toLowerCase().includes('password'), 'password leaked');

  const activeStore = await prisma.store.findFirst({
    where: { name: STORE_A, isActive: true },
  });
  assert(!activeStore, 'ACTIVE store existed before approval');

  const pendingRow = await prisma.storeCreationRequest.findUnique({ where: { id: requestId } });
  assert(pendingRow?.status === 'PENDING', 'DB status was not PENDING');
  assert(pendingRow.passwordHash && pendingRow.passwordHash.startsWith('$2'), 'password was not hashed');

  const ownerLoginBefore = await request('/auth/login', {
    method: 'POST',
    body: { identifier: USERNAME_A, password: PASSWORD },
  });
  assert(ownerLoginBefore.status === 401, 'owner could log in before approval');

  const platformLogin = await request<{ user: { role: string; id: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: PLATFORM_IDENTIFIER, password: PLATFORM_PASSWORD },
  });
  assert(platformLogin.status === 200, `platform login failed: ${platformLogin.status}`);
  assert(platformLogin.json.data?.user.role === UserRole.PLATFORM_ADMIN, 'expected PLATFORM_ADMIN');
  const platformCookie = platformLogin.cookie;

  const list = await request<{ items: { id: string }[]; pendingCount: number }>(
    '/platform/store-requests?status=PENDING',
    { cookie: platformCookie },
  );
  assert(list.status === 200, `list failed: ${list.status}`);
  assert(list.json.data?.items.some((item) => item.id === requestId), 'request missing from inbox');

  const adminLogin = await request<{ user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!' },
  });
  assert(adminLogin.status === 200, 'store admin login failed');
  const forbidden = await request('/platform/store-requests', { cookie: adminLogin.cookie });
  assert(forbidden.status === 403, `store ADMIN expected 403, got ${forbidden.status}`);

  const approved = await request<{
    store: { id: string; isActive: boolean };
    owner: { id: string; role: string; storeId: string };
    request: { status: string };
  }>(`/platform/store-requests/${requestId}/approve`, {
    method: 'POST',
    cookie: platformCookie,
  });
  assert(approved.status === 200, `approve failed: ${approved.json.error?.message}`);
  assert(approved.json.data?.request.status === 'APPROVED', 'request not APPROVED');
  assert(approved.json.data?.store.isActive === true, 'store not ACTIVE');
  assert(approved.json.data?.owner.role === 'ADMIN', 'owner was not ADMIN');
  const newStoreId = approved.json.data!.store.id;
  const ownerId = approved.json.data!.owner.id;
  assert(approved.json.data?.owner.storeId === newStoreId, 'owner storeId mismatch');

  const dbRequest = await prisma.storeCreationRequest.findUnique({ where: { id: requestId } });
  assert(dbRequest?.status === 'APPROVED', 'DB request not APPROVED');
  assert(dbRequest.passwordHash === null, 'password hash was not cleared');
  assert(dbRequest.createdStoreId === newStoreId, 'createdStoreId missing');
  assert(dbRequest.createdUserId === ownerId, 'createdUserId missing');

  const ownerLogin = await request<{ user: { id: string; role: string; storeId: string } }>(
    '/auth/login',
    { method: 'POST', body: { identifier: USERNAME_A, password: PASSWORD } },
  );
  assert(ownerLogin.status === 200, `owner login failed: ${ownerLogin.json.error?.message}`);
  assert(ownerLogin.json.data?.user.role === 'ADMIN', 'logged-in role was not ADMIN');
  assert(ownerLogin.json.data?.user.storeId === newStoreId, 'owner storeId incorrect');
  const ownerCookie = ownerLogin.cookie;

  const product = await request<{ product: { id: string; name: string } }>('/products', {
    method: 'POST',
    cookie: ownerCookie,
    body: {
      name: `E2E Chair ${suffix}`,
      costPrice: 100000,
      defaultSalePrice: 150000,
    },
  });
  assert(product.status === 201 || product.status === 200, `create product failed: ${product.status} ${product.json.error?.message}`);
  const productId = product.json.data?.product.id;
  assert(productId, 'product id missing');

  const isolation = await prisma.product.findMany({
    where: { id: productId },
  });
  assert(isolation.length === 1 && isolation[0]?.storeId === newStoreId, 'product not scoped to new store');

  const adminList = await request<{ items: { id: string }[] }>('/products', {
    cookie: adminLogin.cookie,
  });
  assert(adminList.status === 200, 'original admin product list failed');
  assert(
    !JSON.stringify(adminList.json).includes(productId!),
    'original store could see the new store product',
  );

  const createdB = await request<{ request: { id: string } }>('/store-requests', {
    method: 'POST',
    body: {
      applicantFirstName: 'Second',
      applicantLastName: 'Applicant',
      phone: PHONE_B,
      email: EMAIL_B,
      username: USERNAME_B,
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
      storeName: STORE_B,
      region: 'Toshkent shahri',
      district: 'Yunusobod',
      address: 'Amir Temur 1',
    },
  });
  assert(createdB.status === 201, 'second request failed');
  const requestB = createdB.json.data!.request.id;

  const rejected = await request<{ request: { status: string; rejectionReason: string | null } }>(
    `/platform/store-requests/${requestB}/reject`,
    {
      method: 'POST',
      cookie: platformCookie,
      body: { reason: 'Test rejection for E2E' },
    },
  );
  assert(rejected.status === 200, `reject failed: ${rejected.json.error?.message}`);
  assert(rejected.json.data?.request.status === 'REJECTED', 'not REJECTED');
  assert(rejected.json.data?.request.rejectionReason === 'Test rejection for E2E', 'reason not saved');

  const rejectedStore = await prisma.store.findFirst({ where: { name: STORE_B, isActive: true } });
  assert(!rejectedStore, 'rejected request created an ACTIVE store');

  const rejectedUser = await prisma.user.findFirst({
    where: { email: EMAIL_B, role: UserRole.ADMIN },
  });
  assert(!rejectedUser, 'rejected request created an ADMIN user');

  const rejectLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: USERNAME_B, password: PASSWORD },
  });
  assert(rejectLogin.status === 401, 'rejected applicant could log in');

  console.log('STORE_CREATION_E2E_OK');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
