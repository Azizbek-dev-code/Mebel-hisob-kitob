/**
 * Local-only: create + approve an SMM Agency store owner for manual testing.
 * Marker: LOCAL_SMM_ACCOUNT_OK
 */
const API = process.env.API_BASE ?? 'http://localhost:4000/api';
const PLATFORM_IDENTIFIER = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform';
const PLATFORM_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'Platform123!';

const ts = Date.now().toString(36);
const phone = `+99890${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;
const email = `smm.${ts}@local.test`;
const username = `smm_${ts}`;
const password = 'SmmTest123!';
const storeName = `SMM Agency Local ${ts}`;

async function req(path, { method = 'GET', body, cookie } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const nextCookie =
    setCookie.map((c) => c.split(';')[0]).join('; ') || cookie || '';
  const json = await res.json().catch(() => ({ success: false }));
  return { status: res.status, json, cookie: nextCookie };
}

const created = await req('/store-requests', {
  method: 'POST',
  body: {
    applicantFirstName: 'SMM',
    applicantLastName: 'Tester',
    phone,
    email,
    username,
    password,
    passwordConfirmation: password,
    storeName,
    region: 'Toshkent shahri',
    district: 'Yunusobod',
    address: "Test ko'cha 1",
    businessType: 'SMM',
  },
});

if (created.status !== 201) {
  console.error('CREATE_FAILED', created.status, JSON.stringify(created.json, null, 2));
  process.exit(1);
}

const requestId = created.json.data.request.id;
const platform = await req('/auth/login', {
  method: 'POST',
  body: { identifier: PLATFORM_IDENTIFIER, password: PLATFORM_PASSWORD },
});
if (platform.status !== 200) {
  console.error('PLATFORM_LOGIN_FAILED', platform.status, platform.json);
  process.exit(1);
}

const approved = await req(`/platform/store-requests/${requestId}/approve`, {
  method: 'POST',
  cookie: platform.cookie,
  body: {},
});
if (approved.status !== 200) {
  console.error('APPROVE_FAILED', approved.status, approved.json);
  process.exit(1);
}

const login = await req('/auth/login', {
  method: 'POST',
  body: { identifier: username, password },
});
if (login.status !== 200) {
  console.error('OWNER_LOGIN_FAILED', login.status, login.json);
  process.exit(1);
}

const user = login.json.data.user;
console.log(
  JSON.stringify(
    {
      ok: true,
      email,
      username,
      password,
      phone,
      storeName,
      businessType: user.businessType,
      role: user.role,
      storeId: user.storeId,
    },
    null,
    2,
  ),
);
console.log('LOCAL_SMM_ACCOUNT_OK');
