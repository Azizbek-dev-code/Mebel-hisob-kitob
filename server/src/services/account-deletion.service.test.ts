import {
  ACCOUNT_DELETE_CONFIRMATION,
  BUSINESS_DELETE_CONFIRMATION,
  AccountDeletionReasonCode,
  StoreAccessStatus,
  UserRole,
  WorkspaceStatus,
  WorkspaceType,
  type DeleteAccountRequest,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock, verifyPasswordMock, hashPasswordMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
    identity: { update: vi.fn() },
    store: { findUnique: vi.fn(), update: vi.fn() },
    workspace: { findUnique: vi.fn(), update: vi.fn() },
    workspaceMembership: { deleteMany: vi.fn() },
    authSession: { updateMany: vi.fn() },
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

const { deleteOwnAccount, deleteBusinessAccount, listAccountDeletions, assertAccountNotDeleted } =
  await import('./account-deletion.service.js');

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
  identityId: null as string | null,
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
  prismaMock.authSession.updateMany.mockResolvedValue({ count: 0 });
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

  it('never scrambles Identity — Personal Finance must stay usable', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...USER, identityId: 'idn_ali' });

    await deleteOwnAccount({ id: USER.id, storeId: USER.storeId, role: USER.role }, BODY);

    expect(prismaMock.identity.update).not.toHaveBeenCalled();
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

  it('blocks deleting the last store admin login (use business delete instead)', async () => {
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

describe('deleteBusinessAccount', () => {
  const ADMIN = {
    ...USER,
    role: UserRole.ADMIN,
    identityId: 'idn_owner',
  };

  const BUSINESS_BODY = {
    password: 'Ali12345!',
    confirmation: BUSINESS_DELETE_CONFIRMATION,
    reasonCode: AccountDeletionReasonCode.NOT_NEEDED,
  } as const;

  beforeEach(() => {
    prismaMock.user.findFirst.mockResolvedValue(ADMIN);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: ADMIN.id,
        email: ADMIN.email,
        username: ADMIN.username,
        fullName: ADMIN.fullName,
        role: ADMIN.role,
      },
      {
        id: 'user_worker',
        email: 'worker@example.com',
        username: 'worker',
        fullName: 'Worker',
        role: UserRole.EMPLOYEE,
      },
    ]);
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'store_1',
      name: 'Do‘kon A',
      isActive: true,
    });
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'ws_biz',
      type: WorkspaceType.BUSINESS,
    });
    prismaMock.workspace.update.mockResolvedValue({});
    prismaMock.workspaceMembership.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.store.update.mockResolvedValue({});
  });

  it('closes the store without requiring another admin and preserves Identity', async () => {
    await deleteBusinessAccount(
      { id: ADMIN.id, storeId: ADMIN.storeId, role: UserRole.ADMIN },
      BUSINESS_BODY,
    );

    expect(prismaMock.identity.update).not.toHaveBeenCalled();
    expect(prismaMock.store.update).toHaveBeenCalledWith({
      where: { id: 'store_1' },
      data: {
        isActive: false,
        accessStatus: StoreAccessStatus.MANUALLY_BLOCKED,
      },
    });
    expect(prismaMock.workspace.update).toHaveBeenCalledWith({
      where: { id: 'ws_biz' },
      data: { status: WorkspaceStatus.ARCHIVED },
    });
    expect(prismaMock.workspaceMembership.deleteMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_biz' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(2);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          scope: 'business',
          identityPreserved: true,
        }),
      }),
    );
  });

  it('rejects non-admin members', async () => {
    await expect(
      deleteBusinessAccount(
        { id: USER.id, storeId: USER.storeId, role: UserRole.EMPLOYEE },
        BUSINESS_BODY,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a wrong password', async () => {
    verifyPasswordMock.mockResolvedValue(false);
    await expect(
      deleteBusinessAccount(
        { id: ADMIN.id, storeId: ADMIN.storeId, role: UserRole.ADMIN },
        BUSINESS_BODY,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(prismaMock.store.update).not.toHaveBeenCalled();
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
