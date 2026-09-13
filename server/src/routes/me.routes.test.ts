import {
  ACCOUNT_DELETE_CONFIRMATION,
  AccountDeletionReasonCode,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, accountDeletionServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  accountDeletionServiceMock: {
    deleteOwnAccount: vi.fn(),
    listAccountDeletions: vi.fn(),
    assertAccountNotDeleted: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/account-deletion.service.js', () => accountDeletionServiceMock);

const app = createApp();
const PASSWORD = 'Admin123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

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

const PLATFORM_RECORD = {
  ...EMPLOYEE_RECORD,
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  role: UserRole.PLATFORM_ADMIN,
};

async function signedInAs(record: typeof EMPLOYEE_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  accountDeletionServiceMock.deleteOwnAccount.mockResolvedValue(undefined);
  accountDeletionServiceMock.listAccountDeletions.mockResolvedValue([]);
});

describe('DELETE /api/me/account', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).delete('/api/me/account').send({
      password: PASSWORD,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
      reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
    });
    expect(res.status).toBe(401);
    expect(accountDeletionServiceMock.deleteOwnAccount).not.toHaveBeenCalled();
  });

  it('returns 422 when confirmation is wrong', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.delete('/api/me/account').send({
      password: PASSWORD,
      confirmation: 'please delete',
      reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
    });
    expect(res.status).toBe(422);
    expect(accountDeletionServiceMock.deleteOwnAccount).not.toHaveBeenCalled();
  });

  it('deletes only the signed-in account', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.delete('/api/me/account').send({
      password: PASSWORD,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
      reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
      userId: 'someone-else',
    });
    expect(res.status).toBe(204);
    expect(accountDeletionServiceMock.deleteOwnAccount).toHaveBeenCalledWith(
      { id: EMPLOYEE_RECORD.id, storeId: EMPLOYEE_RECORD.storeId, role: EMPLOYEE_RECORD.role },
      expect.objectContaining({
        password: PASSWORD,
        confirmation: ACCOUNT_DELETE_CONFIRMATION,
        reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
      }),
    );
    const [actor] = accountDeletionServiceMock.deleteOwnAccount.mock.calls[0] as [
      { id: string },
      unknown,
    ];
    expect(actor.id).toBe(EMPLOYEE_RECORD.id);
  });
});

describe('GET /api/platform/account-deletions', () => {
  it('forbids store employees', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.get('/api/platform/account-deletions');
    expect(res.status).toBe(403);
    expect(accountDeletionServiceMock.listAccountDeletions).not.toHaveBeenCalled();
  });

  it('lists reasons for platform admin', async () => {
    accountDeletionServiceMock.listAccountDeletions.mockResolvedValue([
      {
        id: 'del_1',
        storeId: 'store_1',
        userId: 'user_ali',
        emailSnapshot: 'ali@furniture-erp.local',
        usernameSnapshot: 'ali',
        fullNameSnapshot: 'Ali Usta',
        role: UserRole.EMPLOYEE,
        reasonCode: AccountDeletionReasonCode.TOO_EXPENSIVE,
        reasonDetail: null,
        createdAt: '2026-09-13T00:00:00.000Z',
      },
    ]);
    const agent = await signedInAs(PLATFORM_RECORD);
    const res = await agent.get('/api/platform/account-deletions');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });
});
