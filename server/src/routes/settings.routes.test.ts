import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, settingsServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  settingsServiceMock: {
    getStoreProfile: vi.fn(),
    updateStoreProfile: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/settings.service.js', () => settingsServiceMock);

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

const STORE = {
  id: 'store_1',
  name: 'Mebel Savdo',
  phone: '+998901234567',
  address: 'Toshkent',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
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

describe('settings.routes', () => {
  it('requires auth for store profile', async () => {
    const res = await request(app).get('/api/settings/store');
    expect(res.status).toBe(401);
  });

  it('returns store profile for signed-in user', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    settingsServiceMock.getStoreProfile.mockResolvedValue(STORE);

    const res = await request(app).get('/api/settings/store').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.store).toEqual(STORE);
    expect(settingsServiceMock.getStoreProfile).toHaveBeenCalledWith('store_1', UserRole.EMPLOYEE);
  });

  it('requires auth for patch', async () => {
    const res = await request(app).patch('/api/settings/store').send({ name: 'New' });
    expect(res.status).toBe(401);
  });

  it('updates store profile for admin', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    settingsServiceMock.updateStoreProfile.mockResolvedValue({ ...STORE, name: 'Yangi' });

    const res = await request(app)
      .patch('/api/settings/store')
      .set('Cookie', cookie)
      .send({ name: 'Yangi' });

    expect(res.status).toBe(200);
    expect(res.body.data.store.name).toBe('Yangi');
    expect(settingsServiceMock.updateStoreProfile).toHaveBeenCalledWith(
      'store_1',
      UserRole.ADMIN,
      { name: 'Yangi' },
      'user_admin',
    );
  });

  it('forbids employee patch via service', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    const { ApiError } = await import('../utils/api-error.js');
    settingsServiceMock.updateStoreProfile.mockRejectedValue(
      ApiError.forbidden('Only store administrators can update store settings'),
    );

    const res = await request(app)
      .patch('/api/settings/store')
      .set('Cookie', cookie)
      .send({ name: 'Yangi' });

    expect(res.status).toBe(403);
  });

  it('validates patch body', async () => {
    const cookie = await loginAs(ADMIN_RECORD);

    const res = await request(app)
      .patch('/api/settings/store')
      .set('Cookie', cookie)
      .send({});

    expect(res.status).toBe(422);
    expect(settingsServiceMock.updateStoreProfile).not.toHaveBeenCalled();
  });
});
