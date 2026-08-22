import { UserRole } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, saleServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  saleServiceMock: {
    listSales: vi.fn(),
    getSale: vi.fn(),
    createSale: vi.fn(),
    addPayment: vi.fn(),
    listMyAssemblyTasks: vi.fn(),
    cancelSale: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/sale.service.js', () => saleServiceMock);

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
  responsibilities: [],
};

async function signedInAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findFirst.mockResolvedValue(ADMIN_RECORD);
  prismaMock.user.update.mockResolvedValue(ADMIN_RECORD);
  saleServiceMock.listSales.mockResolvedValue({
    items: [],
    meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
  });
});

describe('sales routes auth', () => {
  it('rejects unauthenticated list access', async () => {
    await request(app).get('/api/sales').expect(401);
  });

  it('lists sales for the signed-in store only (storeId from session)', async () => {
    const agent = await signedInAgent();
    await agent.get('/api/sales').expect(200);

    expect(saleServiceMock.listSales).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1' }),
    );
  });

  it('rejects invalid sale payloads', async () => {
    const agent = await signedInAgent();
    const response = await agent.post('/api/sales').send({ items: [] }).expect(422);

    expect(response.body.success).toBe(false);
    expect(saleServiceMock.createSale).not.toHaveBeenCalled();
  });

  it('creates a sale through the authenticated principal', async () => {
    saleServiceMock.createSale.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      remainingAmount: 0,
    });

    const agent = await signedInAgent();
    await agent
      .post('/api/sales')
      .send({
        customerId: 'cjld2cust0000qzrmn831i7rn',
        items: [{ productId: 'cjld2prod0000qzrmn831i7rn', quantity: 1 }],
        paymentType: 'DEPOSIT',
        depositAmount: 0,
      })
      .expect(201);

    expect(saleServiceMock.createSale).toHaveBeenCalledWith(
      'store_1',
      'user_admin',
      expect.objectContaining({ paymentType: 'DEPOSIT' }),
    );
  });

  it('cancels a sale with a reason for the signed-in admin', async () => {
    saleServiceMock.cancelSale.mockResolvedValue({
      id: 'sale_1',
      status: 'CANCELLED',
      cancellationReason: 'Customer request',
    });

    const agent = await signedInAgent();
    await agent
      .post('/api/sales/cjld2sale0000qzrmn831i7rn/cancel')
      .send({ reason: 'Customer request' })
      .expect(200);

    expect(saleServiceMock.cancelSale).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      'cjld2sale0000qzrmn831i7rn',
      { reason: 'Customer request' },
    );
  });

  it('rejects cancel without a reason', async () => {
    const agent = await signedInAgent();
    await agent
      .post('/api/sales/cjld2sale0000qzrmn831i7rn/cancel')
      .send({ reason: '' })
      .expect(422);
    expect(saleServiceMock.cancelSale).not.toHaveBeenCalled();
  });
});
