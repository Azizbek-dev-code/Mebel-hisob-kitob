import { UserRole, WorkerCompensationType, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApiError } from '../utils/api-error.js';

const { prismaMock, workerCompensationServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  workerCompensationServiceMock: {
    listCompensationRules: vi.fn(),
    createCompensationRule: vi.fn(),
    getCompensationRule: vi.fn(),
    updateCompensationRule: vi.fn(),
    getCompensationPreview: vi.fn(),
    settleCompensation: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(async () => undefined),
  assertCanCreateResource: vi.fn(async () => undefined),
}));

vi.mock('../services/worker-compensation.service.js', () => workerCompensationServiceMock);

const app = createApp();
const PASSWORD = 'Admin123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const ADMIN_RECORD = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: UserRole.ADMIN,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const EMPLOYEE_RECORD = {
  id: 'user_ali',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  phone: '+998901111111',
  role: UserRole.EMPLOYEE,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.ASSEMBLER }],
};

const WORKER_ID = 'clxxxxxxxxxxxxxxxxworker';
const RULE_ID = 'clxxxxxxxxxxxxxxxxxrule';

const sampleRule = {
  id: RULE_ID,
  workerId: WORKER_ID,
  responsibility: WorkerResponsibility.SELLER,
  type: WorkerCompensationType.PERCENT_OF_SALE,
  value: 1000,
  isActive: true,
  effectiveFrom: '2026-01-01T12:00:00.000Z',
  effectiveTo: null,
  notes: 'PHASE8_STEP4A_TEMP',
  worker: { id: WORKER_ID, fullName: 'Temp Worker', isActive: true },
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

async function signedInAs(record: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  workerCompensationServiceMock.listCompensationRules.mockResolvedValue([sampleRule]);
  workerCompensationServiceMock.createCompensationRule.mockResolvedValue(sampleRule);
  workerCompensationServiceMock.getCompensationRule.mockResolvedValue(sampleRule);
  workerCompensationServiceMock.updateCompensationRule.mockResolvedValue({
    ...sampleRule,
    isActive: false,
  });
  workerCompensationServiceMock.getCompensationPreview.mockResolvedValue({
    worker: { id: WORKER_ID, fullName: 'Temp Worker', isActive: true },
    period: { from: '2026-08-01', to: '2026-08-31' },
    summary: {
      saleEventCount: 1,
      assemblyEventCount: 0,
      deliveryEventCount: 0,
      installationEventCount: 0,
      applicableRuleCount: 1,
      totalCompensation: 500_000,
      breakdownItemCount: 1,
    },
    breakdown: [],
    readOnly: true,
    disclaimer: "Bu faqat hisob-kitob ko'rinishi. Hech qanday moliyaviy tranzaksiya yaratilmaydi.",
  });
  workerCompensationServiceMock.settleCompensation.mockResolvedValue({
    worker: { id: WORKER_ID, fullName: 'Temp Worker', isActive: true },
    period: { from: '2026-08-01', to: '2026-08-31' },
    totalCompensation: 500_000,
    createdCount: 1,
    skippedAlreadySettled: 0,
    createdTransactionIds: ['tx_1'],
  });
});

describe('worker compensation routes', () => {
  it('requires authentication', async () => {
    await request(app).get(`/api/workers/${WORKER_ID}/compensation-rules`).expect(401);
    expect(workerCompensationServiceMock.listCompensationRules).not.toHaveBeenCalled();
  });

  it('lists rules for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.get(`/api/workers/${WORKER_ID}/compensation-rules`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(workerCompensationServiceMock.listCompensationRules).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      WORKER_ID,
      expect.any(Object),
    );
  });

  it('creates a rule for admin using session storeId', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .post(`/api/workers/${WORKER_ID}/compensation-rules`)
      .send({
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
        notes: 'PHASE8_STEP4A_TEMP',
      })
      .expect(201);

    expect(res.body.data.rule.value).toBe(1000);
    expect(workerCompensationServiceMock.createCompensationRule).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      WORKER_ID,
      expect.objectContaining({ value: 1000 }),
    );
  });

  it('forbids EMPLOYEE from creating rules', async () => {
    workerCompensationServiceMock.createCompensationRule.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage worker compensation rules'),
    );

    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent
      .post(`/api/workers/${WORKER_ID}/compensation-rules`)
      .send({
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
      })
      .expect(403);
  });

  it('gets a single rule', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .get(`/api/workers/${WORKER_ID}/compensation-rules/${RULE_ID}`)
      .expect(200);
    expect(res.body.data.rule.id).toBe(RULE_ID);
  });

  it('deactivates a rule via PATCH', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .patch(`/api/workers/${WORKER_ID}/compensation-rules/${RULE_ID}`)
      .send({ isActive: false })
      .expect(200);
    expect(res.body.data.rule.isActive).toBe(false);
  });

  it('rejects invalid create payloads', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post(`/api/workers/${WORKER_ID}/compensation-rules`)
      .send({ type: WorkerCompensationType.PERCENT_OF_SALE })
      .expect(422);
    expect(workerCompensationServiceMock.createCompensationRule).not.toHaveBeenCalled();
  });

  it('returns compensation preview for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .get(`/api/workers/${WORKER_ID}/compensation-preview`)
      .query({ from: '2026-08-01', to: '2026-08-31' })
      .expect(200);

    expect(res.body.data.preview.readOnly).toBe(true);
    expect(res.body.data.preview.summary.totalCompensation).toBe(500_000);
    expect(workerCompensationServiceMock.getCompensationPreview).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );
  });

  it('rejects invalid preview date range', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get(`/api/workers/${WORKER_ID}/compensation-preview`)
      .query({ from: '2026-08-31', to: '2026-08-01' })
      .expect(422);
    expect(workerCompensationServiceMock.getCompensationPreview).not.toHaveBeenCalled();
  });

  it('forbids EMPLOYEE from preview', async () => {
    workerCompensationServiceMock.getCompensationPreview.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage worker compensation rules'),
    );
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent
      .get(`/api/workers/${WORKER_ID}/compensation-preview`)
      .query({ from: '2026-08-01', to: '2026-08-31' })
      .expect(403);
  });

  it('settles compensation for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .post(`/api/workers/${WORKER_ID}/compensation-settle`)
      .send({ from: '2026-08-01', to: '2026-08-31' })
      .expect(200);

    expect(res.body.data.settlement.createdCount).toBe(1);
    expect(workerCompensationServiceMock.settleCompensation).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );
  });

  it('forbids EMPLOYEE from settle', async () => {
    workerCompensationServiceMock.settleCompensation.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage worker compensation rules'),
    );
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent
      .post(`/api/workers/${WORKER_ID}/compensation-settle`)
      .send({ from: '2026-08-01', to: '2026-08-31' })
      .expect(403);
  });
});
