import { UserRole, WorkerFinancialTransactionType, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, workerFinancialServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  workerFinancialServiceMock: {
    createTransaction: vi.fn(),
    listWorkerTransactions: vi.fn(),
    getWorkerSummary: vi.fn(),
    getTransaction: vi.fn(),
    reverseTransaction: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/worker-financial.service.js', () => workerFinancialServiceMock);

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

const WORKER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

async function signedInAs(record: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  workerFinancialServiceMock.listWorkerTransactions.mockResolvedValue({
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
  workerFinancialServiceMock.getWorkerSummary.mockResolvedValue({
    workerId: WORKER_ID,
    worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
    totalBonuses: 0,
    totalCommissions: 0,
    totalAdvances: 0,
    totalDebt: 0,
    totalPayments: 0,
    totalAdjustments: 0,
    totalReversals: 0,
    netFinancialPosition: 0,
    transactionCount: 0,
  });
});

describe('worker-finances routes', () => {
  it('requires authentication for POST /api/worker-finances/transactions', async () => {
    await request(app)
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 100_000,
        transactionDate: '2026-08-09',
      })
      .expect(401);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('requires authentication for GET worker transactions', async () => {
    await request(app)
      .get(`/api/worker-finances/workers/${WORKER_ID}/transactions`)
      .expect(401);
    expect(workerFinancialServiceMock.listWorkerTransactions).not.toHaveBeenCalled();
  });

  it('requires authentication for GET worker summary', async () => {
    await request(app).get(`/api/worker-finances/workers/${WORKER_ID}/summary`).expect(401);
    expect(workerFinancialServiceMock.getWorkerSummary).not.toHaveBeenCalled();
  });

  it('creates a transaction using session storeId and actor', async () => {
    workerFinancialServiceMock.createTransaction.mockResolvedValue({
      id: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
      workerId: WORKER_ID,
      type: WorkerFinancialTransactionType.BONUS,
      amount: 250_000,
      transactionDate: '2026-08-09T12:00:00.000Z',
      description: null,
      referenceType: null,
      referenceId: null,
      reversesType: null,
      worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
      createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:05:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 250_000,
        transactionDate: '2026-08-09',
        storeId: 'store_injected_by_client',
        createdById: 'user_attacker',
      })
      .expect(201);

    expect(workerFinancialServiceMock.createTransaction).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', storeId: 'store_1' }),
      expect.objectContaining({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 250_000,
        transactionDate: '2026-08-09',
      }),
    );
    const body = workerFinancialServiceMock.createTransaction.mock.calls[0]![2] as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
  });

  it('rejects zero amount at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 0,
        transactionDate: '2026-08-09',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects negative amount at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: -5_000,
        transactionDate: '2026-08-09',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects invalid type at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: 'SALARY',
        amount: 100_000,
        transactionDate: '2026-08-09',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects invalid amount (float) at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 10.5,
        transactionDate: '2026-08-09',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects description longer than 1000 characters', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 100_000,
        transactionDate: '2026-08-09',
        description: 'x'.repeat(1001),
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects invalid referenceType', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 100_000,
        transactionDate: '2026-08-09',
        referenceType: 'INVOICE',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });

  it('accepts a valid referenceType', async () => {
    workerFinancialServiceMock.createTransaction.mockResolvedValue({
      id: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
      workerId: WORKER_ID,
      type: WorkerFinancialTransactionType.BONUS,
      amount: 100_000,
      transactionDate: '2026-08-09T12:00:00.000Z',
      description: null,
      referenceType: 'MANUAL',
      referenceId: null,
      reversesType: null,
      worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
      createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:05:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 100_000,
        transactionDate: '2026-08-09',
        referenceType: 'MANUAL',
      })
      .expect(201);

    expect(workerFinancialServiceMock.createTransaction).toHaveBeenCalledWith(
      'store_1',
      expect.anything(),
      expect.objectContaining({ referenceType: 'MANUAL' }),
    );
  });

  it('still authenticates employees but service receives their role for forbid', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.get(`/api/worker-finances/workers/${WORKER_ID}/transactions`).expect(200);

    expect(workerFinancialServiceMock.listWorkerTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        actor: expect.objectContaining({ role: UserRole.EMPLOYEE }),
      }),
    );
  });

  it('passes session storeId into summary', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent.get(`/api/worker-finances/workers/${WORKER_ID}/summary`).expect(200);

    expect(workerFinancialServiceMock.getWorkerSummary).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      WORKER_ID,
      expect.objectContaining({}),
    );
  });

  it('requires authentication for GET transaction detail', async () => {
    await request(app).get(`/api/worker-finances/transactions/${WORKER_ID}`).expect(401);
    expect(workerFinancialServiceMock.getTransaction).not.toHaveBeenCalled();
  });

  it('requires authentication for POST reverse', async () => {
    await request(app).post(`/api/worker-finances/transactions/${WORKER_ID}/reverse`).expect(401);
    expect(workerFinancialServiceMock.reverseTransaction).not.toHaveBeenCalled();
  });

  it('rejects invalid list type filter', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get(`/api/worker-finances/workers/${WORKER_ID}/transactions?type=SALARY`)
      .expect(422);
    expect(workerFinancialServiceMock.listWorkerTransactions).not.toHaveBeenCalled();
  });

  it('rejects invalid date filter', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get(`/api/worker-finances/workers/${WORKER_ID}/transactions?from=not-a-date&to=2026-08-31`)
      .expect(422);
    expect(workerFinancialServiceMock.listWorkerTransactions).not.toHaveBeenCalled();
  });

  it('rejects oversized pageSize', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get(`/api/worker-finances/workers/${WORKER_ID}/transactions?pageSize=1000000`)
      .expect(422);
    expect(workerFinancialServiceMock.listWorkerTransactions).not.toHaveBeenCalled();
  });

  it('passes filters into listWorkerTransactions', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get(
        `/api/worker-finances/workers/${WORKER_ID}/transactions?page=2&pageSize=10&type=BONUS&from=2026-08-01&to=2026-08-31&search=bonus`,
      )
      .expect(200);

    expect(workerFinancialServiceMock.listWorkerTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        workerId: WORKER_ID,
        page: 2,
        pageSize: 10,
        type: WorkerFinancialTransactionType.BONUS,
        from: '2026-08-01',
        to: '2026-08-31',
        search: 'bonus',
      }),
    );
  });

  it('gets transaction detail via session store', async () => {
    workerFinancialServiceMock.getTransaction.mockResolvedValue({
      id: WORKER_ID,
      workerId: WORKER_ID,
      type: WorkerFinancialTransactionType.BONUS,
      amount: 100_000,
      transactionDate: '2026-08-09T12:00:00.000Z',
      description: null,
      referenceType: null,
      referenceId: null,
      reversesType: null,
      worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
      createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:05:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent.get(`/api/worker-finances/transactions/${WORKER_ID}`).expect(200);
    expect(workerFinancialServiceMock.getTransaction).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      WORKER_ID,
    );
  });

  it('reverses via session actor and ignores body storeId/createdById', async () => {
    workerFinancialServiceMock.reverseTransaction.mockResolvedValue({
      original: {
        id: WORKER_ID,
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 100_000,
        transactionDate: '2026-08-09T12:00:00.000Z',
        description: null,
        referenceType: null,
        referenceId: null,
        reversesType: null,
        worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
        createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
        createdAt: '2026-08-09T12:05:00.000Z',
        updatedAt: '2026-08-09T12:05:00.000Z',
      },
      reversal: {
        id: 'clzzzzzzzzzzzzzzzzzzzzzzzzz',
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.REVERSAL,
        amount: 100_000,
        transactionDate: '2026-08-09T12:00:00.000Z',
        description: 'Reversal',
        referenceType: 'REVERSAL',
        referenceId: WORKER_ID,
        reversesType: WorkerFinancialTransactionType.BONUS,
        worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
        createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
        createdAt: '2026-08-09T12:05:00.000Z',
        updatedAt: '2026-08-09T12:05:00.000Z',
      },
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post(`/api/worker-finances/transactions/${WORKER_ID}/reverse`)
      .send({
        description: 'Fix mistake',
        storeId: 'injected',
        createdById: 'attacker',
      })
      .expect(201);

    expect(workerFinancialServiceMock.reverseTransaction).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin' }),
      WORKER_ID,
      expect.objectContaining({ description: 'Fix mistake' }),
    );
    const body = workerFinancialServiceMock.reverseTransaction.mock.calls[0]![3] as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
  });

  it('rejects creating REVERSAL directly', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/worker-finances/transactions')
      .send({
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.REVERSAL,
        amount: 100_000,
        transactionDate: '2026-08-09',
      })
      .expect(422);
    expect(workerFinancialServiceMock.createTransaction).not.toHaveBeenCalled();
  });
});
