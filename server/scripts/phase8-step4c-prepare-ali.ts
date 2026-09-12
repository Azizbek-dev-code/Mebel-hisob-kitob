/**
 * Ensure Ali has a seller % rule covering August 2026 for Step 4C browser E2E.
 * Uses existing PATCH API (Step 4B) — does not touch finance ledger.
 */
import { PrismaClient } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();

async function request(
  method: string,
  path: string,
  options?: { cookie?: string; body?: unknown },
): Promise<{ status: number; body: Record<string, unknown>; setCookie: string | null }> {
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
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const ali = await prisma.user.findFirst({ where: { email: 'ali@furniture-erp.local' } });
  if (!admin || !ali) throw new Error('Missing admin or Ali');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) throw new Error('login failed');
  const cookie = extractCookie(login.setCookie, '');

  const rules = await prisma.workerCompensationRule.findMany({ where: { workerId: ali.id } });
  const rule = rules[0];
  if (!rule) throw new Error('Ali has no compensation rule');

  const patch = await request('PATCH', `/api/workers/${ali.id}/compensation-rules/${rule.id}`, {
    cookie,
    body: {
      isActive: true,
      effectiveFrom: '2026-08-01',
      value: 1200,
    },
  });
  if (patch.status !== 200) {
    throw new Error(`patch failed: ${patch.status} ${JSON.stringify(patch.body)}`);
  }

  const preview = await request(
    'GET',
    `/api/workers/${ali.id}/compensation-preview?from=2026-08-01&to=2026-08-31`,
    { cookie },
  );
  console.log(JSON.stringify({ aliId: ali.id, preview: preview.body }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
