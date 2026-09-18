import { UserRole } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, saleServiceMock, deliveryOpsMock } = vi.hoisted(() => ({
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
    deleteCancelledSale: vi.fn(),
    recalculateSaleSellerCommission: vi.fn(),
  },
  deliveryOpsMock: {
    listMyDeliveries: vi.fn(),
    updateMySaleDeliveryStatus: vi.fn(),
    updateMyPurchaseDeliveryStatus: vi.fn(),
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

vi.mock('../services/sale.service.js', () => saleServiceMock);
vi.mock('../services/delivery-ops.service.js', () => deliveryOpsMock);

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

  it('recalculates seller commission through the signed-in admin', async () => {
    saleServiceMock.recalculateSaleSellerCommission.mockResolvedValue({
      sale: { id: 'cjld2sale0000qzrmn831i7rn', sellerCommissionEstimate: 50_000 },
      previousAmount: 40_000,
      newAmount: 50_000,
    });

    const agent = await signedInAgent();
    await agent
      .post('/api/sales/cjld2sale0000qzrmn831i7rn/recalculate-commission')
      .expect(200);

    expect(saleServiceMock.recalculateSaleSellerCommission).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      'cjld2sale0000qzrmn831i7rn',
    );
  });

  it('permanently deletes a cancelled sale', async () => {
    saleServiceMock.deleteCancelledSale.mockResolvedValue(undefined);
    const agent = await signedInAgent();
    await agent.delete('/api/sales/cjld2sale0000qzrmn831i7rn').expect(204);
    expect(saleServiceMock.deleteCancelledSale).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      'cjld2sale0000qzrmn831i7rn',
    );
  });

  it('lists my deliveries for the signed-in worker', async () => {
    deliveryOpsMock.listMyDeliveries.mockResolvedValue({
      kpis: {
        todayTotal: 0,
        todayPending: 0,
        todayInProgress: 0,
        todayCompleted: 0,
        todayEarned: 0,
        monthTotal: 0,
        monthEarned: 0,
        monthPaid: 0,
        monthOutstanding: 0,
      },
      saleDeliveries: [],
      purchaseDeliveries: [],
    });
    const agent = await signedInAgent();
    await agent.get('/api/sales/deliveries/mine').expect(200);
    expect(deliveryOpsMock.listMyDeliveries).toHaveBeenCalledWith('store_1', 'user_admin');
  });

  it('patches sale delivery status through delivery-ops', async () => {
    deliveryOpsMock.updateMySaleDeliveryStatus.mockResolvedValue({
      sale: { id: 'cjld2sale0000qzrmn831i7rn', deliveryStatus: 'IN_TRANSIT' },
      ledgerPosted: false,
      message: 'Yetkazib berish boshlandi.',
    });
    const agent = await signedInAgent();
    await agent
      .patch('/api/sales/cjld2sale0000qzrmn831i7rn/delivery')
      .send({ status: 'IN_TRANSIT' })
      .expect(200);
    expect(deliveryOpsMock.updateMySaleDeliveryStatus).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      'cjld2sale0000qzrmn831i7rn',
      { status: 'IN_TRANSIT' },
    );
  });

  it('rejects invalid delivery status payloads', async () => {
    const agent = await signedInAgent();
    await agent
      .patch('/api/sales/cjld2sale0000qzrmn831i7rn/delivery')
      .send({ status: 'PENDING' })
      .expect(422);
    expect(deliveryOpsMock.updateMySaleDeliveryStatus).not.toHaveBeenCalled();
  });

  it('patches purchase delivery complete through delivery-ops', async () => {
    deliveryOpsMock.updateMyPurchaseDeliveryStatus.mockResolvedValue({
      purchaseId: 'cjld2purc0000qzrmn831i7rn',
      purchaseNumber: 5,
      deliveredAt: '2026-09-12T00:00:00.000Z',
      ledgerPosted: true,
      message: 'Kirim yetkazib berish yakunlandi.',
    });
    const agent = await signedInAgent();
    await agent
      .patch('/api/sales/purchases/cjld2purc0000qzrmn831i7rn/delivery')
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(deliveryOpsMock.updateMyPurchaseDeliveryStatus).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
      'cjld2purc0000qzrmn831i7rn',
      { status: 'COMPLETED' },
    );
  });
});
