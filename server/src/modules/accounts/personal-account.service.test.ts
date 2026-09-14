import {
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  hashPasswordMock,
  recordAuditMock,
  ensureIdentityForUser,
  ensureUserOnBusinessWorkspace,
  attributeRegistration,
  ensureReferralCode,
  markReferralAccountCreated,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    identity: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    store: { create: vi.fn() },
    storeCreationRequest: { findFirst: vi.fn() },
    workspace: { create: vi.fn() },
    workspaceMembership: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    personalSubscription: { create: vi.fn() },
  },
  hashPasswordMock: vi.fn(),
  recordAuditMock: vi.fn(),
  ensureIdentityForUser: vi.fn(),
  ensureUserOnBusinessWorkspace: vi.fn(),
  attributeRegistration: vi.fn(),
  ensureReferralCode: vi.fn(),
  markReferralAccountCreated: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../lib/password.js', () => ({ hashPassword: hashPasswordMock }));
vi.mock('../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./account-layer.service.js', () => ({
  ensureIdentityForUser,
  ensureUserOnBusinessWorkspace,
}));
vi.mock('../referrals/referral.service.js', () => ({
  attributeRegistration,
  ensureReferralCode,
  markReferralAccountCreated,
}));

const {
  createPersonalAccountForUser,
  listWorkspacesForUser,
  registerPersonalAccount,
} = await import('./personal-account.service.js');

const REGISTER = {
  firstName: 'Azizbek',
  lastName: 'Karimov',
  email: 'Azizbek@Example.com',
  password: 'Secret123',
  passwordConfirmation: 'Secret123',
};

const IDENTITY = {
  id: 'idn_1',
  email: 'azizbek@example.com',
  fullName: 'Azizbek Karimov',
  createdAt: new Date('2026-09-13T00:00:00.000Z'),
};

const PERSONAL_WORKSPACE = {
  id: 'ws_personal',
  type: WorkspaceType.PERSONAL,
  name: "Azizbek Karimovning shaxsiy moliyasi",
  status: 'ACTIVE',
  storeId: null,
  createdAt: new Date('2026-09-13T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  hashPasswordMock.mockResolvedValue('$2a$hashed');
  recordAuditMock.mockResolvedValue(undefined);
  ensureIdentityForUser.mockResolvedValue('idn_1');
  ensureUserOnBusinessWorkspace.mockResolvedValue(undefined);
  attributeRegistration.mockResolvedValue(undefined);
  ensureReferralCode.mockResolvedValue('ABX7K29Q');
  markReferralAccountCreated.mockResolvedValue(undefined);
  prismaMock.identity.findFirst.mockResolvedValue(null);
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.storeCreationRequest.findFirst.mockResolvedValue(null);
  prismaMock.workspaceMembership.findFirst.mockResolvedValue(null);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  );
});

describe('registerPersonalAccount', () => {
  it('creates a PERSONAL workspace without a Store or session user', async () => {
    prismaMock.identity.create.mockResolvedValue(IDENTITY);
    prismaMock.workspace.create.mockResolvedValue(PERSONAL_WORKSPACE);
    prismaMock.workspaceMembership.create.mockResolvedValue({ id: 'mem_1' });
    prismaMock.personalSubscription.create.mockResolvedValue({ id: 'psub_1' });

    const result = await registerPersonalAccount(REGISTER);

    expect(hashPasswordMock).toHaveBeenCalledWith('Secret123');
    expect(prismaMock.identity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'azizbek@example.com',
          fullName: 'Azizbek Karimov',
          passwordHash: '$2a$hashed',
        }),
      }),
    );
    expect(prismaMock.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: WorkspaceType.PERSONAL,
          name: "Azizbek Karimovning shaxsiy moliyasi",
        }),
      }),
    );
    expect(prismaMock.workspace.create.mock.calls[0]?.[0]?.data).not.toHaveProperty('storeId');
    expect(prismaMock.workspaceMembership.create).toHaveBeenCalledWith({
      data: {
        identityId: 'idn_1',
        workspaceId: 'ws_personal',
        role: WorkspaceMembershipRole.OWNER,
      },
    });
    expect(prismaMock.store.create).not.toHaveBeenCalled();
    expect(result.workspace.type).toBe(WorkspaceType.PERSONAL);
    expect(result.workspace.storeId).toBeNull();
    expect(JSON.stringify(result)).not.toContain('Secret123');
    expect(JSON.stringify(result)).not.toContain('$2a$hashed');
  });

  it('uses a caller-supplied account name', async () => {
    prismaMock.identity.create.mockResolvedValue(IDENTITY);
    prismaMock.workspace.create.mockResolvedValue({
      ...PERSONAL_WORKSPACE,
      name: 'Mening moliyam',
    });
    prismaMock.workspaceMembership.create.mockResolvedValue({ id: 'mem_1' });
    prismaMock.personalSubscription.create.mockResolvedValue({ id: 'psub_1' });

    await registerPersonalAccount({ ...REGISTER, name: 'Mening moliyam' });

    expect(prismaMock.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Mening moliyam' }),
      }),
    );
  });

  it('rejects an email already used by an ERP user', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'user_1' });

    await expect(registerPersonalAccount(REGISTER)).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.identity.create).not.toHaveBeenCalled();
    expect(prismaMock.store.create).not.toHaveBeenCalled();
  });

  it('rejects an email already used by an Identity', async () => {
    prismaMock.identity.findFirst.mockResolvedValue({ id: 'idn_existing' });

    await expect(registerPersonalAccount(REGISTER)).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });
});

describe('createPersonalAccountForUser', () => {
  it('attaches a PERSONAL workspace to the existing Identity and never opens a Store', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_admin',
      fullName: 'Store Administrator',
      identityId: 'idn_1',
    });
    prismaMock.identity.findUnique.mockResolvedValue(IDENTITY);
    prismaMock.workspace.create.mockResolvedValue(PERSONAL_WORKSPACE);
    prismaMock.workspaceMembership.create.mockResolvedValue({ id: 'mem_1' });
    prismaMock.personalSubscription.create.mockResolvedValue({ id: 'psub_1' });

    const result = await createPersonalAccountForUser('user_admin', {});

    expect(ensureIdentityForUser).toHaveBeenCalledWith('user_admin', prismaMock);
    expect(prismaMock.store.create).not.toHaveBeenCalled();
    expect(result.workspace.type).toBe(WorkspaceType.PERSONAL);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: null,
        actorUserId: 'user_admin',
        eventType: 'PERSONAL_ACCOUNT_CREATED',
      }),
    );
  });

  it('does not open a second PERSONAL workspace on the same identity', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_admin',
      fullName: 'Store Administrator',
      identityId: 'idn_1',
    });
    prismaMock.identity.findUnique.mockResolvedValue(IDENTITY);
    prismaMock.workspaceMembership.findFirst.mockResolvedValue({ id: 'mem_existing' });

    await expect(createPersonalAccountForUser('user_admin', {})).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });
});

describe('listWorkspacesForUser', () => {
  it('returns only the signed-in identity workspaces', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: 'user_admin', identityId: 'idn_1' })
      .mockResolvedValueOnce({ identityId: 'idn_1' });
    prismaMock.workspaceMembership.findMany.mockResolvedValue([
      {
        role: WorkspaceMembershipRole.OWNER,
        workspace: PERSONAL_WORKSPACE,
      },
      {
        role: WorkspaceMembershipRole.OWNER,
        workspace: {
          id: 'ws_biz',
          type: WorkspaceType.BUSINESS,
          name: 'Fayz Mebel',
          status: 'ACTIVE',
          storeId: 'store_1',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
          store: { businessType: 'FURNITURE' },
        },
      },
    ]);

    const items = await listWorkspacesForUser('user_admin');

    expect(ensureUserOnBusinessWorkspace).toHaveBeenCalledWith('user_admin', prismaMock);
    expect(prismaMock.workspaceMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identityId: 'idn_1', workspace: { status: WorkspaceStatus.ACTIVE } },
      }),
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual(['ws_personal', 'ws_biz']);
    expect(items.find((item) => item.type === WorkspaceType.BUSINESS)?.storeId).toBe('store_1');
    expect(items.find((item) => item.type === WorkspaceType.BUSINESS)?.businessType).toBe('FURNITURE');
  });

  it('returns 404 when the store user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(listWorkspacesForUser('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});
