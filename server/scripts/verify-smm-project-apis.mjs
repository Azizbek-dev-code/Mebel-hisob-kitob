const API = process.env.API_BASE ?? 'http://localhost:4000/api';

async function req(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const set = res.headers.getSetCookie?.() || [];
  const cookie = set.map((c) => c.split(';')[0]).join('; ') || opts.cookie || '';
  return { status: res.status, json: await res.json().catch(() => null), cookie };
}

const login = await req('/auth/login', {
  method: 'POST',
  body: { identifier: 'smm_mull06vm', password: 'SmmTest123!' },
});
if (login.status !== 200) {
  console.error('LOGIN_FAILED', login.status, login.json);
  process.exit(1);
}
const cookie = login.cookie;

const create = await req('/smm/projects', {
  method: 'POST',
  cookie,
  body: { name: 'Demo Client Project', clientName: 'Acme Brand', description: 'Local E2E' },
});
const id =
  create.json?.data?.item?.id ||
  create.json?.data?.project?.id ||
  create.json?.data?.id;
console.log('create', create.status, id);
if (!id) {
  console.error(JSON.stringify(create.json, null, 2));
  process.exit(1);
}

const paths = [
  `/smm/projects/${id}`,
  `/smm/projects/${id}/progress`,
  `/smm/projects/${id}/audience-segments`,
  `/smm/projects/${id}/competitors`,
  `/smm/projects/${id}/content`,
  `/smm/projects/${id}/calendar?from=2026-09-01&to=2026-09-30`,
  `/smm/projects/${id}/tasks`,
  `/smm/projects/${id}/members`,
];
for (const path of paths) {
  const r = await req(path, { cookie });
  console.log(r.status, path);
}
console.log('PROJECT_ID=' + id);
console.log('SMM_PROJECT_API_OK');
