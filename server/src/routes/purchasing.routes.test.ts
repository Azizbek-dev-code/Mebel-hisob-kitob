import {
  PaymentMethod,
  PurchasePaymentStatus,
  PurchaseStatus,
  SupplierStatus,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, purchasingServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  purchasingServiceMock: {
    listSuppliers: vi.fn(),
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    archiveSupplier: vi.fn(),
    restoreSupplier: vi.fn(),
    listPurchases: vi.fn(),
    getPurchase: vi.fn(),
    createPurchase: vi.fn(),
    updatePurchaseDelivery: vi.fn(),
    addPayment: vi.fn(),
    cancelPurchase: vi.fn(),
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

vi.mock('../services/purchasing.service.js', () => purchasingServiceMock);

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

const SUPPLIER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx1';
const PRODUCT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx3';
const PURCHASE_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx2';

const SUPPLIER = {
  id: SUPPLIER_ID,
  name: 'Wood Supply',
  phone: '+998901234567',
  notes: null,
  status: SupplierStatus.ACTIVE,
  totalPurchases: 0,
  totalPaid: 0,
  outstandingDebt: 0,
  openPurchaseCount: 0,
  lastPurchaseAt: null,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

const PURCHASE = {
  id: PURCHASE_ID,
  purchaseNumber: 1,
  purchaseDate: '2026-08-20T00:00:00.000Z',
  supplierId: SUPPLIER_ID,
  supplierName: 'Wood Supply',
  totalCost: 1_000_000,
  paidAmount: 0,
  remainingAmount: 1_000_000,
  paymentStatus: PurchasePaymentStatus.UNPAID,
  status: PurchaseStatus.ACTIVE,
  itemCount: 1,
  createdAt: '2026-08-20T00:00:00.000Z',
  deliveredAt: '2026-08-20T00:00:00.000Z',
  deliveryDays: 0,
  driverId: null,
  driverName: null,
  driverFee: 0,
  notes: null,
  items: [
    {
      id: 'item_1',
      productId: PRODUCT_ID,
      productName: 'Divan',
      quantity: 2,
      unitCost: 500_000,
      lineTotal: 1_000_000,
    },
  ],
  payments: [],
  stockMovements: [],
  cancelledAt: null,
  cancellationReason: null,
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
  purchasingServiceMock.listSuppliers.mockResolvedValue({
    summary: {
      totalSuppliers: 1,
      activeCount: 1,
      archivedCount: 0,
      suppliersInDebt: 0,
      totalOutstanding: 0,
    },
    items: [SUPPLIER],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  purchasingServiceMock.createSupplier.mockResolvedValue(SUPPLIER);
  purchasingServiceMock.getSupplier.mockResolvedValue({
    ...SUPPLIER,
    financial: {
      totalPurchases: 0,
      totalPaid: 0,
      outstandingDebt: 0,
      openPurchaseCount: 0,
      revenuePurchaseCount: 0,
      cancelledPurchaseCount: 0,
    },
    purchases: [],
    payments: [],
  });
  purchasingServiceMock.createPurchase.mockResolvedValue(PURCHASE);
  purchasingServiceMock.getPurchase.mockResolvedValue(PURCHASE);
  purchasingServiceMock.listPurchases.mockResolvedValue({
    items: [PURCHASE],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  purchasingServiceMock.addPayment.mockResolvedValue({
    payment: {
      paymentId: 'pay_1',
      amount: 200_000,
      method: PaymentMethod.CASH,
      paidAt: '2026-08-20T00:00:00.000Z',
      note: null,
      recordedByName: 'Admin',
    },
    purchase: { ...PURCHASE, paidAmount: 200_000, remainingAmount: 800_000 },
  });
  purchasingServiceMock.cancelPurchase.mockResolvedValue({
    ...PURCHASE,
    status: PurchaseStatus.CANCELLED,
    remainingAmount: 0,
    cancelledAt: '2026-08-21T00:00:00.000Z',
    cancellationReason: 'Mistake',
  });
});

describe('purchasing routes', () => {
  it('lists suppliers for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.get('/api/suppliers');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(purchasingServiceMock.listSuppliers).toHaveBeenCalled();
  });

  it('creates a supplier for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/suppliers').send({
      name: 'Wood Supply',
      phone: '+998901234567',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.supplier.name).toBe('Wood Supply');
  });

  it('rejects empty supplier name', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/suppliers').send({ name: '  ' });
    expect(res.status).toBe(422);
  });

  it('creates a purchase for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/purchases').send({
      supplierId: SUPPLIER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 2, unitCost: 500_000 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.purchase.id).toBe(PURCHASE_ID);
    expect(purchasingServiceMock.createPurchase).toHaveBeenCalled();
  });

  it('creates a purchase with delivery details', async () => {
    purchasingServiceMock.createPurchase.mockResolvedValue({
      ...PURCHASE,
      deliveredAt: '2026-08-24T00:00:00.000Z',
      deliveryDays: 3,
      driverFee: 150_000,
    });
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/purchases').send({
      supplierId: SUPPLIER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 2, unitCost: 5_200_000 }],
      deliveredAt: '2026-08-24',
      deliveryDays: 3,
      driverFee: 150_000,
      paidAmount: 2_000_000,
      paymentMethod: PaymentMethod.CASH,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.purchase.deliveryDays).toBe(3);
    expect(res.body.data.purchase.driverFee).toBe(150_000);
  });

  it('rejects negative deliveryDays and driverFee', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const daysRes = await agent.post('/api/purchases').send({
      supplierId: SUPPLIER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 1, unitCost: 100 }],
      deliveryDays: -1,
    });
    expect(daysRes.status).toBe(422);

    const feeRes = await agent.post('/api/purchases').send({
      supplierId: SUPPLIER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 1, unitCost: 100 }],
      driverFee: -5,
    });
    expect(feeRes.status).toBe(422);
  });

  it('patches purchase delivery for admin', async () => {
    purchasingServiceMock.updatePurchaseDelivery.mockResolvedValue({
      ...PURCHASE,
      deliveryDays: 5,
      driverFee: 75_000,
    });
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.patch(`/api/purchases/${PURCHASE_ID}`).send({
      deliveryDays: 5,
      driverFee: 75_000,
    });
    expect(res.status).toBe(200);
    expect(purchasingServiceMock.updatePurchaseDelivery).toHaveBeenCalled();
    expect(res.body.data.purchase.deliveryDays).toBe(5);
  });

  it('rejects purchase without paymentMethod when paidAmount > 0', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/purchases').send({
      supplierId: SUPPLIER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 1, unitCost: 100 }],
      paidAmount: 50,
    });
    expect(res.status).toBe(422);
  });

  it('adds a payment on a purchase', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post(`/api/purchases/${PURCHASE_ID}/payments`).send({
      amount: 200_000,
      method: PaymentMethod.CASH,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.amount).toBe(200_000);
  });

  it('cancels a purchase', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post(`/api/purchases/${PURCHASE_ID}/cancel`).send({
      reason: 'Mistake',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.purchase.status).toBe(PurchaseStatus.CANCELLED);
  });

  it('forbids employee supplier list', async () => {
    const { ApiError } = await import('../utils/api-error.js');
    purchasingServiceMock.listSuppliers.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage supplier purchases'),
    );
    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.get('/api/suppliers');
    expect(res.status).toBe(403);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/suppliers');
    expect(res.status).toBe(401);
  });
});
