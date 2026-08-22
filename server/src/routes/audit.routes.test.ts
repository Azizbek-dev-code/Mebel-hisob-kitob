import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApiError } from '../utils/api-error.js';

const { prismaMock, auditServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  auditServiceMock: {
    listAuditLogs: vi.fn(),
    recordAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => auditServiceMock);

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

describe('audit.routes', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('forbids employees with 403', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    auditServiceMock.listAuditLogs.mockRejectedValue(
      ApiError.forbidden('Only store administrators can view the audit log'),
    );

    const res = await request(app).get('/api/audit').set('Cookie', cookie);

    expect(res.status).toBe(403);
  });

  it('lists audit logs for admin scoped to session store', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    auditServiceMock.listAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'audit_1',
          eventType: 'LOGIN',
          entityType: 'SESSION',
          entityId: 'user_admin',
          summary: 'Signed in admin',
          metadata: null,
          actor: { id: 'user_admin', fullName: 'Store Administrator' },
          createdAt: '2026-08-20T10:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const res = await request(app)
      .get('/api/audit')
      .query({ page: 1, eventType: 'LOGIN', storeId: 'store_other' })
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(auditServiceMock.listAuditLogs).toHaveBeenCalledWith({
      storeId: 'store_1',
      actorRole: UserRole.ADMIN,
      query: expect.objectContaining({
        page: 1,
        eventType: 'LOGIN',
      }),
    });
    // Query storeId must never override the session store.
    expect(auditServiceMock.listAuditLogs.mock.calls[0]![0].storeId).toBe('store_1');
  });
});
