import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, workerServiceMock } = vi.hoisted(() => ({
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
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/worker.service.js', () => workerServiceMock);

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
});
