import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, billingMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  billingMock: {
    listPlans: vi.fn(),
    listInvoices: vi.fn(),
    getDashboard: vi.fn(),
    getStoreAccessStatus: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/platform-billing.service.js', () => billingMock);

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
  store: { name: 'Mebel Savdo', accessStatus: 'ACTIVE' },
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const PLATFORM_RECORD = {
  ...ADMIN_RECORD,
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  role: UserRole.PLATFORM_ADMIN,
};

const BLOCKED_RECORD = {
  ...ADMIN_RECORD,
  store: { name: 'Mebel Savdo', accessStatus: 'PAYMENT_BLOCKED' },
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

describe('platform billing authorization', () => {
  it('forbids store ADMIN from listing plans', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app).get('/api/platform/plans').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(billingMock.listPlans).not.toHaveBeenCalled();
  });

  it('forbids store ADMIN from listing subscription requests', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app).get('/api/platform/subscription-requests').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('forbids store ADMIN from platform finance and analytics', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const pnl = await request(app).get('/api/platform/pnl').set('Cookie', cookie);
    const analytics = await request(app).get('/api/platform/analytics').set('Cookie', cookie);
    const expenses = await request(app).get('/api/platform/expenses').set('Cookie', cookie);
    expect(pnl.status).toBe(403);
    expect(analytics.status).toBe(403);
    expect(expenses.status).toBe(403);
  });

  it('lists plans for PLATFORM_ADMIN', async () => {
    billingMock.listPlans.mockResolvedValue({ items: [] });
    const cookie = await loginAs(PLATFORM_RECORD);
    const res = await request(app).get('/api/platform/plans').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(billingMock.listPlans).toHaveBeenCalledWith(UserRole.PLATFORM_ADMIN);
  });

  it('lets a payment-blocked owner stay signed in; writes are gated by subscription', async () => {
    const cookie = await loginAs(BLOCKED_RECORD);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.storeAccessStatus).toBe('PAYMENT_BLOCKED');

    billingMock.getStoreAccessStatus.mockResolvedValue({
      storeName: 'Mebel Savdo',
      accessStatus: 'PAYMENT_BLOCKED',
      planName: 'START',
      outstandingAmount: 150000,
      dueDate: '2026-09-22T00:00:00.000Z',
      daysOverdue: 4,
    });
    const access = await request(app).get('/api/store-access').set('Cookie', cookie);
    expect(access.status).toBe(200);
  });
});
