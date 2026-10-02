/**
 * Local: prove SMM onboarding complete-business accepts NUMBER answers.
 * Marker: SMM_ONBOARDING_COMPLETE_OK
 */
const API = process.env.API_BASE ?? 'http://localhost:4000/api';

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

const start = await req('/onboarding', { method: 'POST', body: {} });
if (start.status !== 201) {
  console.error('START_FAILED', start.status, start.json);
  process.exit(1);
}
const token = start.json.data.submission.publicToken;

const answers = {
  purpose: 'BUSINESS',
  businessType: 'SMM',
  smmAgencyName: 'Nova Media Test',
  smmClientCount: 8,
  smmServices: ['SMM', 'REELS'],
  smmPlatforms: ['INSTAGRAM', 'TELEGRAM'],
  smmTeamSize: 3,
  smmMainGoal: 'SYSTEMIZE',
  smmCurrentTools: 'TELEGRAM',
};

const save = await req(`/onboarding/${token}`, {
  method: 'PATCH',
  body: { answers },
});
if (save.status !== 200) {
  console.error('SAVE_FAILED', save.status, JSON.stringify(save.json));
  process.exit(1);
}

const complete = await req(`/onboarding/${token}/complete-business`, {
  method: 'POST',
  body: {},
});
if (complete.status !== 200) {
  console.error('COMPLETE_FAILED', complete.status, JSON.stringify(complete.json, null, 2));
  process.exit(1);
}

const stored = complete.json.data.submission.answers;
console.log(
  JSON.stringify(
    {
      ok: true,
      status: complete.json.data.submission.status,
      businessType: stored.businessType,
      smmClientCount: stored.smmClientCount,
      smmTeamSize: stored.smmTeamSize,
      smmCurrentTools: stored.smmCurrentTools,
    },
    null,
    2,
  ),
);
console.log('SMM_ONBOARDING_COMPLETE_OK');
