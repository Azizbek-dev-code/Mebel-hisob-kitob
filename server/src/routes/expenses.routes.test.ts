import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, expenseServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  expenseServiceMock: {
    listExpenses: vi.fn(),
    getExpense: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    cancelExpense: vi.fn(),
    listExpenseCategories: vi.fn(),
    createExpenseCategory: vi.fn(),
    deactivateExpenseCategory: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/expense.service.js', () => expenseServiceMock);

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

const CATEGORY_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

async function signedInAs(record: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  expenseServiceMock.listExpenses.mockResolvedValue({
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
  expenseServiceMock.listExpenseCategories.mockResolvedValue([]);
});

describe('expenses routes', () => {
  it('requires authentication for GET /api/expenses', async () => {
    await request(app).get('/api/expenses').expect(401);
    expect(expenseServiceMock.listExpenses).not.toHaveBeenCalled();
  });

  it('requires authentication for POST /api/expenses', async () => {
    await request(app)
      .post('/api/expenses')
      .send({
        categoryId: CATEGORY_ID,
        amount: 100_000,
        expenseDate: '2026-08-09',
      })
      .expect(401);
    expect(expenseServiceMock.createExpense).not.toHaveBeenCalled();
  });

  it('requires authentication for GET /api/expense-categories', async () => {
    await request(app).get('/api/expense-categories').expect(401);
    expect(expenseServiceMock.listExpenseCategories).not.toHaveBeenCalled();
  });

  it('passes session storeId into listExpenses', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent.get('/api/expenses').expect(200);

    expect(expenseServiceMock.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1', actorRole: UserRole.ADMIN }),
    );
  });

  it('creates an expense using session storeId and actor', async () => {
    expenseServiceMock.createExpense.mockResolvedValue({
      id: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
      amount: 250_000,
      expenseDate: '2026-08-09T12:00:00.000Z',
      description: null,
      category: { id: CATEGORY_ID, name: 'Elektr', color: 'amber', isActive: true },
      createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:05:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/expenses')
      .send({
        categoryId: CATEGORY_ID,
        amount: 250_000,
        expenseDate: '2026-08-09',
        storeId: 'store_injected_by_client',
      })
      .expect(201);

    expect(expenseServiceMock.createExpense).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', storeId: 'store_1' }),
      expect.objectContaining({
        categoryId: CATEGORY_ID,
        amount: 250_000,
        expenseDate: '2026-08-09',
      }),
    );
    // Zod strips unknown keys — storeId from the body must never reach the service.
    const body = expenseServiceMock.createExpense.mock.calls[0]![2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('storeId');
  });

  it('rejects zero amount at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/expenses')
      .send({
        categoryId: CATEGORY_ID,
        amount: 0,
        expenseDate: '2026-08-09',
      })
      .expect(422);

    expect(expenseServiceMock.createExpense).not.toHaveBeenCalled();
  });

  it('rejects negative amount at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post('/api/expenses')
      .send({
        categoryId: CATEGORY_ID,
        amount: -5_000,
        expenseDate: '2026-08-09',
      })
      .expect(422);

    expect(expenseServiceMock.createExpense).not.toHaveBeenCalled();
  });

  it('still authenticates employees but service receives their role for forbid', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.get('/api/expenses').expect(200);

    expect(expenseServiceMock.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1', actorRole: UserRole.EMPLOYEE }),
    );
  });

  it('requires authentication for PATCH /api/expenses/:id', async () => {
    await request(app)
      .patch(`/api/expenses/${CATEGORY_ID}`)
      .send({ amount: 100_000 })
      .expect(401);
    expect(expenseServiceMock.updateExpense).not.toHaveBeenCalled();
  });

  it('requires authentication for POST /api/expenses/:id/cancel', async () => {
    await request(app)
      .post(`/api/expenses/${CATEGORY_ID}/cancel`)
      .send({ reason: 'Duplicate' })
      .expect(401);
    expect(expenseServiceMock.cancelExpense).not.toHaveBeenCalled();
  });

  it('patches an expense using session storeId and strips body storeId', async () => {
    const expenseId = 'clyyyyyyyyyyyyyyyyyyyyyyyyy';
    expenseServiceMock.updateExpense.mockResolvedValue({
      id: expenseId,
      amount: 300_000,
      expenseDate: '2026-08-09T12:00:00.000Z',
      description: 'patched',
      category: { id: CATEGORY_ID, name: 'Elektr', color: 'amber', isActive: true },
      createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:10:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .patch(`/api/expenses/${expenseId}`)
      .send({
        amount: 300_000,
        description: 'patched',
        storeId: 'store_injected_by_client',
        createdById: 'user_attacker',
      })
      .expect(200);

    expect(expenseServiceMock.updateExpense).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', storeId: 'store_1' }),
      expenseId,
      expect.objectContaining({ amount: 300_000, description: 'patched' }),
    );
    const body = expenseServiceMock.updateExpense.mock.calls[0]![3] as Record<string, unknown>;
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
  });

  it('rejects zero amount on PATCH at the validation layer', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .patch(`/api/expenses/${CATEGORY_ID}`)
      .send({ amount: 0 })
      .expect(422);
    expect(expenseServiceMock.updateExpense).not.toHaveBeenCalled();
  });

  it('rejects empty PATCH body', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent.patch(`/api/expenses/${CATEGORY_ID}`).send({}).expect(422);
    expect(expenseServiceMock.updateExpense).not.toHaveBeenCalled();
  });

  it('cancels an expense using session storeId', async () => {
    const expenseId = 'clyyyyyyyyyyyyyyyyyyyyyyyyy';
    expenseServiceMock.cancelExpense.mockResolvedValue({
      id: expenseId,
      amount: 500_000,
      expenseDate: '2026-08-09T12:00:00.000Z',
      description: null,
      status: 'CANCELLED',
      cancellationReason: 'Duplicate',
      cancelledAt: '2026-08-18T10:00:00.000Z',
      category: { id: CATEGORY_ID, name: 'Elektr', color: 'amber', isActive: true },
      createdBy: null,
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    });

    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .post(`/api/expenses/${expenseId}/cancel`)
      .send({ reason: 'Duplicate' })
      .expect(200);

    expect(expenseServiceMock.cancelExpense).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      expenseId,
      { reason: 'Duplicate' },
    );
  });

  it('passes EMPLOYEE role through on PATCH for service forbid', async () => {
    expenseServiceMock.updateExpense.mockResolvedValue({
      id: CATEGORY_ID,
      amount: 1,
      expenseDate: '2026-08-09T12:00:00.000Z',
      description: null,
      category: { id: CATEGORY_ID, name: 'Elektr', color: 'amber', isActive: true },
      createdBy: null,
      createdAt: '2026-08-09T12:05:00.000Z',
      updatedAt: '2026-08-09T12:05:00.000Z',
    });

    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.patch(`/api/expenses/${CATEGORY_ID}`).send({ amount: 100_000 }).expect(200);

    expect(expenseServiceMock.updateExpense).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ role: UserRole.EMPLOYEE }),
      CATEGORY_ID,
      expect.objectContaining({ amount: 100_000 }),
    );
  });
});
