import { CustomerStatus, UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, catalogueServiceMock, lookupServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  catalogueServiceMock: {
    listCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    archiveCustomer: vi.fn(),
    restoreCustomer: vi.fn(),
  },
  lookupServiceMock: {
    searchCustomers: vi.fn(),
    searchProducts: vi.fn(),
    createCustomer: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/customer-catalogue.service.js', () => catalogueServiceMock);
vi.mock('../services/lookup.service.js', () => lookupServiceMock);

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
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const CUSTOMER = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxxxx1',
  firstName: 'Ali',
  lastName: 'Valiyev',
  fullName: 'Ali Valiyev',
  phone: '+998901234567',
  notes: null,
  address: null,
  status: CustomerStatus.ACTIVE,
  debtStatus: 'CLEAR',
  totalPurchases: 0,
  totalPaid: 0,
  outstandingDebt: 0,
  overdueAmount: 0,
  openSaleCount: 0,
  lastSaleAt: null,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

async function loginAs(user: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(user);
  prismaMock.user.update.mockResolvedValue(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: user.username, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'] as string[];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('customers.routes', () => {
  it('requires auth for list', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('lists customers for signed-in user', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    catalogueServiceMock.listCustomers.mockResolvedValue({
      summary: {
        totalCustomers: 1,
        activeCount: 1,
        archivedCount: 0,
        customersInDebt: 0,
        totalOutstanding: 0,
        overdueAmount: 0,
      },
      items: [CUSTOMER],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });

    const res = await request(app).get('/api/customers').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(catalogueServiceMock.listCustomers).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      expect.any(Object),
    );
    expect(res.body.data.items[0].fullName).toBe('Ali Valiyev');
  });

  it('creates customer', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    catalogueServiceMock.createCustomer.mockResolvedValue(CUSTOMER);
    const res = await request(app)
      .post('/api/customers')
      .set('Cookie', cookie)
      .send({ firstName: 'Ali', lastName: 'Valiyev', phone: '901234567' });
    expect(res.status).toBe(201);
    expect(catalogueServiceMock.createCustomer).toHaveBeenCalled();
  });

  it('POS options uses lookup search', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    lookupServiceMock.searchCustomers.mockResolvedValue([
      {
        id: CUSTOMER.id,
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: CUSTOMER.phone,
        address: null,
      },
    ]);
    const res = await request(app).get('/api/customers/options?q=Ali').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(lookupServiceMock.searchCustomers).toHaveBeenCalled();
    expect(res.body.data.items).toHaveLength(1);
  });

  it('gets detail', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    catalogueServiceMock.getCustomer.mockResolvedValue({
      ...CUSTOMER,
      financial: {
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        overdueAmount: 0,
        openSaleCount: 0,
        revenueSaleCount: 0,
        cancelledSaleCount: 0,
      },
      sales: [],
      payments: [],
      installments: [],
    });
    const res = await request(app).get(`/api/customers/${CUSTOMER.id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.customer.id).toBe(CUSTOMER.id);
  });

  it('archives via service', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    catalogueServiceMock.archiveCustomer.mockResolvedValue({
      ...CUSTOMER,
      status: CustomerStatus.ARCHIVED,
    });
    const res = await request(app)
      .post(`/api/customers/${CUSTOMER.id}/archive`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(catalogueServiceMock.archiveCustomer).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      CUSTOMER.id,
      'user_admin',
    );
  });
});
