import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApiError } from '../utils/api-error.js';

const { prismaMock, workerServiceMock, profileModulesServiceMock, sellerCommissionServiceMock } =
  vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  workerServiceMock: {
    listWorkers: vi.fn(),
    createWorker: vi.fn(),
    getWorker: vi.fn(),
    updateWorker: vi.fn(),
    getWorkerStats: vi.fn(),
    listWorkerSales: vi.fn(),
    listWorkerTasks: vi.fn(),
    listWorkerActivity: vi.fn(),
    resetWorkerPassword: vi.fn(),
    getMyProfile: vi.fn(),
    listMySales: vi.fn(),
    listMyActivity: vi.fn(),
  },
  profileModulesServiceMock: {
    getWorkerProfileModules: vi.fn(),
    getMyProfileModules: vi.fn(),
    getStoreFeeReconciliation: vi.fn(),
  },
  sellerCommissionServiceMock: {
    getSellerReport: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/worker.service.js', () => workerServiceMock);
vi.mock('../services/worker-profile-modules.service.js', () => profileModulesServiceMock);
vi.mock('../services/seller-commission.service.js', () => sellerCommissionServiceMock);

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
  responsibilities: [
    { responsibility: WorkerResponsibility.SELLER },
    { responsibility: WorkerResponsibility.ASSEMBLER },
  ],
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
  responsibilities: [
    { responsibility: WorkerResponsibility.ASSEMBLER },
    { responsibility: WorkerResponsibility.SELLER },
  ],
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
  workerServiceMock.listWorkers.mockResolvedValue({
    items: [],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe('workers routes', () => {
  it('rejects unauthenticated worker list access', async () => {
    await request(app).get('/api/workers').expect(401);
  });

  it('lists workers for the signed-in store', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent.get('/api/workers').expect(200);

    expect(workerServiceMock.listWorkers).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1', actorRole: UserRole.ADMIN }),
    );
  });

  it('creates a worker through the authenticated store admin', async () => {
    workerServiceMock.createWorker.mockResolvedValue({
      id: 'user_new',
      fullName: 'Ali Usta',
      responsibilities: [WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER],
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/workers')
      .send({
        firstName: 'Ali',
        lastName: 'Usta',
        username: 'ali2',
        password: 'Ali12345!',
        responsibilities: ['ASSEMBLER', 'SELLER'],
      })
      .expect(201);

    expect(workerServiceMock.createWorker).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin' }),
      expect.objectContaining({ username: 'ali2' }),
    );
  });

  it('rejects invalid create payloads', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent.post('/api/workers').send({ firstName: 'Ali' }).expect(422);
    expect(workerServiceMock.createWorker).not.toHaveBeenCalled();
  });

  it('exposes self sales under /api/me/sales', async () => {
    workerServiceMock.listMySales.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.get('/api/me/sales').expect(200);

    expect(workerServiceMock.listMySales).toHaveBeenCalledWith(
      'store_1',
      'user_ali',
      expect.any(Object),
    );
  });

  it('returns profile-modules with success envelope (res passed to sendSuccess)', async () => {
    profileModulesServiceMock.getMyProfileModules.mockResolvedValue({
      tabs: ['GENERAL', 'SELLER'],
      worker: { id: 'user_ali', responsibilities: ['SELLER'] },
      general: { finance: { earned: 0, paid: 0, outstanding: 0 }, breakdown: [] },
      seller: { salesToday: 0 },
      assembler: null,
      delivery: null,
      installer: null,
      smm: null,
      other: null,
      ledgerSummary: {},
    });

    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.get('/api/me/profile-modules').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modules.tabs).toEqual(['GENERAL', 'SELLER']);
  });

  it('returns worker profile-modules for admin', async () => {
    profileModulesServiceMock.getWorkerProfileModules.mockResolvedValue({
      tabs: ['GENERAL', 'ASSEMBLER'],
      worker: { id: 'user_ali', responsibilities: ['ASSEMBLER'] },
      general: { finance: { earned: 0, paid: 0, outstanding: 0 }, breakdown: [] },
      seller: null,
      assembler: { pending: 0 },
      delivery: null,
      installer: null,
      smm: null,
      other: null,
      ledgerSummary: {},
    });

    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.get('/api/workers/cmt0000000000000000000001/profile-modules').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modules.tabs).toContain('ASSEMBLER');
  });

  it('forbids a seller from reading another worker seller-report', async () => {
    sellerCommissionServiceMock.getSellerReport.mockRejectedValue(
      ApiError.forbidden('Only store administrators can view another worker seller report'),
    );
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.get('/api/workers/cmt0000000000000000000001/seller-report').expect(403);
  });

  it('returns seller-report for store admin', async () => {
    sellerCommissionServiceMock.getSellerReport.mockResolvedValue({
      worker: { id: 'cmt0000000000000000000001', fullName: 'Seller' },
      period: { from: '2026-08-01', to: '2026-08-31', preset: 'THIS_MONTH' },
      summary: {
        salesCount: 2,
        salesAmount: 18_000_000,
        netProfit: 4_000_000,
        estimatedCommission: 600_000,
        earned: 600_000,
        bonus: 0,
        paid: 0,
        outstanding: 600_000,
      },
      sales: [],
      payments: [],
    });
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.get('/api/workers/cmt0000000000000000000001/seller-report').expect(200);
    expect(res.body.data.report.summary.earned).toBe(600_000);
  });
});
