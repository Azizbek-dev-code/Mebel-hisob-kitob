import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, platformShopsServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  platformShopsServiceMock: {
    listPlatformShops: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/platform-shops.service.js', () => platformShopsServiceMock);

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

const PLATFORM_RECORD = {
  ...ADMIN_RECORD,
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  role: UserRole.PLATFORM_ADMIN,
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

describe('GET /api/platform/shops', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/platform/shops');
    expect(res.status).toBe(401);
  });

  it('forbids store ADMIN', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app).get('/api/platform/shops').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(platformShopsServiceMock.listPlatformShops).not.toHaveBeenCalled();
  });

  it('lists shops for PLATFORM_ADMIN', async () => {
    platformShopsServiceMock.listPlatformShops.mockResolvedValue({
      items: [
        {
          id: 'store_1',
          name: 'Mebel Savdo',
          phone: null,
          address: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const cookie = await loginAs(PLATFORM_RECORD);
    const res = await request(app).get('/api/platform/shops').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].name).toBe('Mebel Savdo');
  });
});
