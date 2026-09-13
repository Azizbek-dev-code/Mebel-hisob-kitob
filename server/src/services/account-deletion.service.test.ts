import {
  ACCOUNT_DELETE_CONFIRMATION,
  AccountDeletionReasonCode,
  UserRole,
  type DeleteAccountRequest,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock, verifyPasswordMock, hashPasswordMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
    accountDeletion: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  verifyPasswordMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  recordAuditMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../lib/password.js', () => ({
  verifyPassword: verifyPasswordMock,
  hashPassword: hashPasswordMock,
}));

vi.mock('./audit.service.js', () => ({
  recordAudit: recordAuditMock,
}));

const { deleteOwnAccount, listAccountDeletions, assertAccountNotDeleted } = await import(
  './account-deletion.service.js'
);

const USER = {
  id: 'user_ali',
  storeId: 'store_1',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  role: UserRole.EMPLOYEE,
  passwordHash: 'hash',
  isActive: true,
  deletedAt: null,
};

const BODY = {
  password: 'Ali12345!',
  confirmation: ACCOUNT_DELETE_CONFIRMATION,
  reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  );
  verifyPasswordMock.mockResolvedValue(true);
  hashPasswordMock.mockResolvedValue('scrambled');
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.user.findFirst.mockResolvedValue(USER);
  prismaMock.user.count.mockResolvedValue(1);
  prismaMock.accountDeletion.create.mockResolvedValue({ id: 'del_1' });
  prismaMock.user.update.mockResolvedValue({ ...USER, isActive: false });
});

describe('deleteOwnAccount', () => {
  it('soft-deletes the signed-in user and stores the reason', async () => {
    await deleteOwnAccount({ id: USER.id, storeId: USER.storeId, role: USER.role }, BODY);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER.id, storeId: USER.storeId } }),
    );
    expect(prismaMock.accountDeletion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER.id,
          storeId: USER.storeId,
          emailSnapshot: USER.email,
          reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
        }),
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER.id },
        data: expect.objectContaining({
          isActive: false,
          email: `deleted.${USER.id}@invalid.local`,
        }),
      }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: USER.id,
        metadata: expect.not.objectContaining({ password: expect.anything() }),
      }),
    );
  });

  it('rejects a wrong password', async () => {
    verifyPasswordMock.mockResolvedValue(false);
    await expect(
      deleteOwnAccount({ id: USER.id, storeId: USER.storeId, role: USER.role }, BODY),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation phrase', async () => {
    await expect(
      deleteOwnAccount(
        { id: USER.id, storeId: USER.storeId, role: USER.role },
        { ...BODY, confirmation: 'delete my account' } as DeleteAccountRequest,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('blocks deleting the last store admin', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...USER, role: UserRole.ADMIN });
    prismaMock.user.count.mockResolvedValue(0);

    await expect(
      deleteOwnAccount({ id: USER.id, storeId: USER.storeId, role: UserRole.ADMIN }, BODY),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('blocks deleting the last platform admin', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...USER, role: UserRole.PLATFORM_ADMIN });
    prismaMock.user.count.mockResolvedValue(0);

    await expect(
      deleteOwnAccount(
        { id: USER.id, storeId: USER.storeId, role: UserRole.PLATFORM_ADMIN },
        BODY,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('requires a detail when the reason is OTHER', async () => {
    await expect(
      deleteOwnAccount(
        { id: USER.id, storeId: USER.storeId, role: USER.role },
        { ...BODY, reasonCode: AccountDeletionReasonCode.OTHER },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('listAccountDeletions', () => {
  it('forbids non-platform admins', async () => {
    await expect(listAccountDeletions(UserRole.ADMIN)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns rows for platform admin', async () => {
    prismaMock.accountDeletion.findMany.mockResolvedValue([
      {
        id: 'del_1',
        storeId: 'store_1',
        userId: USER.id,
        emailSnapshot: USER.email,
        usernameSnapshot: USER.username,
        fullNameSnapshot: USER.fullName,
        role: USER.role,
        reasonCode: AccountDeletionReasonCode.TOO_HARD,
        reasonDetail: null,
        createdAt: new Date('2026-09-13T00:00:00.000Z'),
      },
    ]);

    const items = await listAccountDeletions(UserRole.PLATFORM_ADMIN);
    expect(items).toHaveLength(1);
    expect(items[0]?.reasonCode).toBe(AccountDeletionReasonCode.TOO_HARD);
  });
});

describe('assertAccountNotDeleted', () => {
  it('blocks reactivation of a deleted account', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ deletedAt: new Date() });
    await expect(assertAccountNotDeleted('store_1', USER.id)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
