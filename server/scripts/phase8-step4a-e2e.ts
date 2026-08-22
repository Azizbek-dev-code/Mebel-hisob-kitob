/**
 * Phase 8 Step 4A — real PostgreSQL E2E for worker compensation rules.
 * Marker: PHASE8_STEP4A_TEMP
 * Does NOT reset the database. Cleans up only temporary rows created here.
 */
/* eslint-disable no-console */
import { PrismaClient, UserRole, WorkerCompensationType, WorkerResponsibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const MARKER = 'PHASE8_STEP4A_TEMP';
const prisma = new PrismaClient();

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
  const setCookie = res.headers.get('set-cookie');
  const body = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, body, setCookie };
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

async function counts() {
  const [sales, users, assemblyTasks, expenses, financeTx, compensationRules] = await Promise.all([
    prisma.sale.count(),
    prisma.user.count(),
    prisma.assemblyTask.count(),
    prisma.expense.count(),
    prisma.workerFinancialTransaction.count(),
    prisma.workerCompensationRule.count(),
  ]);
  return { sales, users, assemblyTasks, expenses, financeTx, compensationRules };
}

async function main() {
  const before = await counts();
  console.log('BEFORE', before);

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No active store');

  const admin = await prisma.user.findFirst({
    where: { storeId: store.id, role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin user');

  const login = await request('POST', '/api/auth/login', {
    body: {
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    },
  });
  if (login.status !== 200) {
    throw new Error(`Admin login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  const cookie = extractCookie(login.setCookie, '');
  console.log('Admin login OK');

  const passwordHash = await bcrypt.hash('TempComp123!', 8);
  const worker = await prisma.user.create({
    data: {
      storeId: store.id,
      email: `phase8step4a.temp.${Date.now()}@furniture-erp.local`,
      username: `p8s4a_${Date.now().toString().slice(-8)}`,
      passwordHash,
      fullName: `${MARKER} Seller`,
      role: UserRole.EMPLOYEE,
      isActive: true,
      notes: MARKER,
      responsibilities: {
        create: [{ storeId: store.id, responsibility: WorkerResponsibility.SELLER }],
      },
    },
  });
  console.log('Temp worker', worker.id);

  const financeBeforeCreate = await prisma.workerFinancialTransaction.count({
    where: { workerId: worker.id },
  });

  const createOk = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-06-30',
      notes: MARKER,
    },
  });
  if (createOk.status !== 201) {
    throw new Error(`Expected 201 create: ${createOk.status} ${JSON.stringify(createOk.body)}`);
  }
  const rule1 = (createOk.body.data as { rule: { id: string; value: number } }).rule;
  console.log('Created 10% PERCENT_OF_SALE rule', rule1.id);

  const list = await request('GET', `/api/workers/${worker.id}/compensation-rules`, { cookie });
  if (list.status !== 200) throw new Error('List failed');
  const items = (list.body.data as { items: unknown[] }).items;
  if (items.length < 1) throw new Error('Rule missing from list');

  const financeAfterCreate = await prisma.workerFinancialTransaction.count({
    where: { workerId: worker.id },
  });
  if (financeAfterCreate !== financeBeforeCreate) {
    throw new Error('WorkerFinancialTransaction was created by rule creation — FAIL');
  }
  console.log('No ledger rows created by rule create OK');

  const invalidAssembler = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.ASSEMBLER,
      type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
      value: 50_000,
      effectiveFrom: '2026-01-01',
      notes: MARKER,
    },
  });
  if (invalidAssembler.status !== 422) {
    throw new Error(`Expected 422 for ASSEMBLER on SELLER-only worker, got ${invalidAssembler.status}`);
  }
  console.log('Invalid ASSEMBLER rule rejected OK');

  const adjacent = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1200,
      effectiveFrom: '2026-07-01',
      notes: MARKER,
    },
  });
  if (adjacent.status !== 201) {
    throw new Error(`Adjacent rule failed: ${adjacent.status} ${JSON.stringify(adjacent.body)}`);
  }
  const rule2 = (adjacent.body.data as { rule: { id: string } }).rule;
  console.log('Adjacent rule accepted', rule2.id);

  const overlap = await request('POST', `/api/workers/${worker.id}/compensation-rules`, {
    cookie,
    body: {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1500,
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-08-01',
      notes: MARKER,
    },
  });
  if (overlap.status !== 409) {
    throw new Error(`Expected 409 overlap, got ${overlap.status} ${JSON.stringify(overlap.body)}`);
  }
  console.log('Overlapping rule rejected OK');

  const deactivate = await request(
    'PATCH',
    `/api/workers/${worker.id}/compensation-rules/${rule1.id}`,
    { cookie, body: { isActive: false } },
  );
  if (deactivate.status !== 200) {
    throw new Error(`Deactivate failed: ${deactivate.status}`);
  }
  const deactivated = (deactivate.body.data as { rule: { isActive: boolean } }).rule;
  if (deactivated.isActive !== false) throw new Error('isActive should be false');
  console.log('Deactivate OK');

  // Employee forbidden
  const employeeLogin = await request('POST', '/api/auth/login', {
    body: { identifier: worker.username, password: 'TempComp123!' },
  });
  if (employeeLogin.status !== 200) throw new Error('Employee login failed');
  const empCookie = extractCookie(employeeLogin.setCookie, '');
  const empForbidden = await request('GET', `/api/workers/${worker.id}/compensation-rules`, {
    cookie: empCookie,
  });
  if (empForbidden.status !== 403) {
    throw new Error(`Expected 403 for employee, got ${empForbidden.status}`);
  }
  console.log('EMPLOYEE forbidden OK');

  // Cross-store worker 404 — use fake id that won't exist in this store
  const cross = await request('GET', `/api/workers/clxxxxxxxxxxxxxxxxother/compensation-rules`, {
    cookie,
  });
  if (cross.status !== 404) {
    throw new Error(`Expected 404 cross-store/missing worker, got ${cross.status}`);
  }
  console.log('Cross-store/missing worker 404 OK');

  // Cleanup ONLY temp compensation rules + temp worker
  await prisma.workerCompensationRule.deleteMany({
    where: { OR: [{ notes: MARKER }, { workerId: worker.id }] },
  });
  await prisma.userResponsibility.deleteMany({ where: { userId: worker.id } });
  await prisma.user.delete({ where: { id: worker.id } });
  console.log('Cleanup temp worker + rules OK');

  const after = await counts();
  console.log('AFTER', after);

  const intact =
    before.sales === after.sales &&
    before.users === after.users &&
    before.assemblyTasks === after.assemblyTasks &&
    before.expenses === after.expenses &&
    before.financeTx === after.financeTx;

  if (!intact) {
    throw new Error(`Data integrity failed: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }

  // compensationRules may equal before after cleanup
  if (after.compensationRules !== before.compensationRules) {
    throw new Error('Compensation rule count not restored after cleanup');
  }

  console.log('DATA_INTEGRITY_OK');
  console.log('PHASE8_STEP4A_E2E_PASS');
}

main()
  .catch((error) => {
    console.error('E2E_FAIL', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
