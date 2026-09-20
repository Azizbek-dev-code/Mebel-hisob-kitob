import { UserRole } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, notificationsMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  notificationsMock: {
    listBusinessNotifications: vi.fn(),
    updateBusinessNotificationPrefs: vi.fn(),
    markBusinessNotificationsRead: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/business-notifications.service.js', () => notificationsMock);

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
  notificationsMock.listBusinessNotifications.mockResolvedValue({
    items: [],
    prefs: {},
    unreadCount: 0,
  });
});

describe('business notifications routes', () => {
  it('rejects unauthenticated access', async () => {
    await request(app).get('/api/notifications').expect(401);
  });

  it('lists notifications for the signed-in store only', async () => {
    const agent = await signedInAgent();
    await agent.get('/api/notifications').expect(200);
    expect(notificationsMock.listBusinessNotifications).toHaveBeenCalledWith(
      'store_1',
      expect.objectContaining({ id: 'user_admin', role: UserRole.ADMIN }),
    );
  });
});
