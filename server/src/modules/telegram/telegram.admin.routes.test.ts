import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';

const { prismaMock, adminService, broadcastService } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  adminService: {
    getAdminBotStatus: vi.fn(),
    updateAdminBotToken: vi.fn(),
  },
  broadcastService: {
    createBroadcast: vi.fn(),
    listBroadcasts: vi.fn(),
    processBroadcastQueue: vi.fn(),
  },
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('./telegram.admin.service.js', () => adminService);
vi.mock('./telegram.broadcast.service.js', () => broadcastService);

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

describe('Telegram admin authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminService.getAdminBotStatus.mockResolvedValue({
      connected: true,
      botUsername: '@balancyspace_bot',
      tokenConfigured: true,
      tokenSource: 'env',
      hasDatabaseToken: false,
      webhookSecretConfigured: true,
      publicAppUrl: 'https://www.mebelboshqaruv.uz',
      webhook: null,
      connectedUsers: 0,
      lastValidatedAt: null,
    });
    broadcastService.createBroadcast.mockResolvedValue({ id: 'bc_1', status: 'PENDING' });
  });

  it('rejects an unauthenticated broadcast', async () => {
    const res = await request(app).post('/api/telegram/admin/broadcasts').send({ text: 'hi' });
    expect(res.status).toBe(401);
    expect(broadcastService.createBroadcast).not.toHaveBeenCalled();
  });

  it('forbids a normal store admin from broadcasting', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app)
      .post('/api/telegram/admin/broadcasts')
      .set('Cookie', cookie)
      .send({ text: 'hi there everyone' });
    expect(res.status).toBe(403);
    expect(broadcastService.createBroadcast).not.toHaveBeenCalled();
  });

  it('allows PLATFORM_ADMIN to create a broadcast', async () => {
    const cookie = await loginAs(PLATFORM_RECORD);
    const res = await request(app)
      .post('/api/telegram/admin/broadcasts')
      .set('Cookie', cookie)
      .send({ text: 'hi there everyone' });
    expect(res.status).toBe(200);
    expect(broadcastService.createBroadcast).toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('TELEGRAM_BOT_TOKEN');
  });
});
