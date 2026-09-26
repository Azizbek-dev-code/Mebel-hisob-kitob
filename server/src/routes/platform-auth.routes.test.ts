import { UserRole } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, recordAuditMock, assertPasswordNotCompromisedMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    identity: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    authSession: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscriptionRequest: { findFirst: vi.fn() },
    storeCreationRequest: { findFirst: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  assertPasswordNotCompromisedMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => ({
  recordAudit: (...args: unknown[]) => recordAuditMock(...args),
}));

vi.mock('../services/security/compromised-password.service.js', () => ({
  assertPasswordNotCompromised: (...args: unknown[]) => assertPasswordNotCompromisedMock(...args),
  CompromisedPasswordError: class CompromisedPasswordError extends Error {},
  PasswordCheckUnavailableError: class PasswordCheckUnavailableError extends Error {},
}));

const app = createApp();
const PASSWORD = 'Platform123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const NEW_PASSWORD = 'BrandNewPlatform99!';

const PLATFORM_RECORD = {
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  phone: null,
  role: UserRole.PLATFORM_ADMIN,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [],
};

const STORE_ADMIN_RECORD = {
  ...PLATFORM_RECORD,
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
  assertPasswordNotCompromisedMock.mockResolvedValue(undefined);
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.user.findFirst.mockResolvedValue(PLATFORM_RECORD);
  prismaMock.user.findUnique.mockResolvedValue({
    id: PLATFORM_RECORD.id,
    email: PLATFORM_RECORD.email,
    fullName: PLATFORM_RECORD.fullName,
    identityId: 'idn_platform',
  });
  prismaMock.user.update.mockResolvedValue(PLATFORM_RECORD);
  prismaMock.identity.findFirst.mockResolvedValue(null);
  prismaMock.subscriptionRequest.findFirst.mockResolvedValue(null);
  prismaMock.storeCreationRequest.findFirst.mockResolvedValue(null);
  // sid-less JWTs — create fails; revoke still uses updateMany after password change
  prismaMock.authSession.create.mockRejectedValue(new Error('authSession.create not stubbed'));
  prismaMock.authSession.update.mockResolvedValue({});
  prismaMock.authSession.updateMany.mockResolvedValue({ count: 1 });
});

async function loginAs(record: typeof PLATFORM_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD }).expect(200);
  prismaMock.user.update.mockClear();
  return agent;
}

describe('POST /api/platform/auth/change-password', () => {
  it('changes password for PLATFORM_ADMIN, audits, and revokes sessions', async () => {
    const agent = await loginAs(PLATFORM_RECORD);
    prismaMock.user.findFirst.mockResolvedValue(PLATFORM_RECORD);

    const response = await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: NEW_PASSWORD,
      })
      .expect(200);

    expect(response.body.data.requiresReauth).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PLATFORM_RECORD.id },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      }),
    );
    expect(prismaMock.authSession.updateMany).toHaveBeenCalled();
    expect(assertPasswordNotCompromisedMock).toHaveBeenCalledWith(NEW_PASSWORD);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ADMIN_PASSWORD_CHANGED',
        actorUserId: PLATFORM_RECORD.id,
      }),
    );
  });

  it('rejects wrong current password without updating the hash', async () => {
    const agent = await loginAs(PLATFORM_RECORD);
    prismaMock.user.findFirst.mockResolvedValue(PLATFORM_RECORD);

    await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: 'WrongPass99!',
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: NEW_PASSWORD,
      })
      .expect(401);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ADMIN_PASSWORD_CHANGE_FAILED' }),
    );
  });

  it('rejects confirmation mismatch', async () => {
    const agent = await loginAs(PLATFORM_RECORD);

    await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: 'OtherPass99!',
      })
      .expect(422);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects same old/new password', async () => {
    const agent = await loginAs(PLATFORM_RECORD);
    prismaMock.user.findFirst.mockResolvedValue(PLATFORM_RECORD);

    await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
        newPasswordConfirmation: PASSWORD,
      })
      .expect(422);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects compromised new password', async () => {
    const { ApiError } = await import('../utils/api-error.js');
    assertPasswordNotCompromisedMock.mockRejectedValue(
      ApiError.badRequest("Bu parol avval ma'lumotlar sizib chiqishida aniqlangan."),
    );
    const agent = await loginAs(PLATFORM_RECORD);
    prismaMock.user.findFirst.mockResolvedValue(PLATFORM_RECORD);

    await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: NEW_PASSWORD,
      })
      .expect(400);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app)
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: NEW_PASSWORD,
      })
      .expect(401);
  });

  it('rejects non-platform-admin store users', async () => {
    const agent = await loginAs(STORE_ADMIN_RECORD);

    await agent
      .post('/api/platform/auth/change-password')
      .send({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirmation: NEW_PASSWORD,
      })
      .expect(403);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
