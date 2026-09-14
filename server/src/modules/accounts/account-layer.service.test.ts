import {
  UserRole,
  WorkspaceMembershipRole,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    identity: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    store: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspaceMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../utils/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const {
  backfillAccountLayer,
  ensureBusinessWorkspaceForStore,
  ensureIdentityForUser,
  ensureUserOnBusinessWorkspace,
} = await import('./account-layer.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.identity.delete.mockResolvedValue({ id: 'id_orphan' });
});

describe('ensureIdentityForUser', () => {
  it('returns the existing identity without creating another', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@example.com',
      fullName: 'A',
      identityId: 'idn_existing',
    });

    await expect(ensureIdentityForUser('user_1')).resolves.toBe('idn_existing');
    expect(prismaMock.identity.create).not.toHaveBeenCalled();
  });

  it('creates an identity and links it 1:1', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'a@example.com',
      fullName: 'A',
      identityId: null,
    });
    prismaMock.identity.create.mockResolvedValue({ id: 'idn_new' });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(ensureIdentityForUser('user_1')).resolves.toBe('idn_new');
    expect(prismaMock.identity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: 'a@example.com', fullName: 'A' },
      }),
    );
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1', identityId: null },
        data: { identityId: 'idn_new' },
      }),
    );
  });
});

describe('ensureBusinessWorkspaceForStore', () => {
  it('reuses the existing BUSINESS workspace', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws_1' });
    await expect(ensureBusinessWorkspaceForStore('store_1')).resolves.toBe('ws_1');
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });

  it('creates a BUSINESS workspace named after the store', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', name: 'Fayz Mebel' });
    prismaMock.workspace.create.mockResolvedValue({ id: 'ws_new' });

    await expect(ensureBusinessWorkspaceForStore('store_1')).resolves.toBe('ws_new');
    expect(prismaMock.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: WorkspaceType.BUSINESS,
          name: 'Fayz Mebel',
          storeId: 'store_1',
        }),
      }),
    );
  });
});

describe('ensureUserOnBusinessWorkspace', () => {
  it('gives PLATFORM_ADMIN an identity but no store membership', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_platform',
      storeId: 'store_1',
      role: UserRole.PLATFORM_ADMIN,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_platform',
      email: 'platform@example.com',
      fullName: 'Platform Administrator',
      identityId: null,
    });
    prismaMock.identity.create.mockResolvedValue({ id: 'idn_platform' });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    await ensureUserOnBusinessWorkspace('user_platform');

    expect(prismaMock.identity.create).toHaveBeenCalled();
    expect(prismaMock.workspaceMembership.create).not.toHaveBeenCalled();
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });

  it('makes a store ADMIN the OWNER of the BUSINESS workspace', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'user_admin',
        storeId: 'store_1',
        role: UserRole.ADMIN,
      })
      .mockResolvedValueOnce({
        id: 'user_admin',
        email: 'admin@example.com',
        fullName: 'Store Administrator',
        identityId: 'idn_admin',
      });
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws_1' });
    prismaMock.workspaceMembership.findUnique.mockResolvedValue(null);
    prismaMock.workspaceMembership.create.mockResolvedValue({ id: 'mem_1' });

    await ensureUserOnBusinessWorkspace('user_admin');

    expect(prismaMock.workspaceMembership.create).toHaveBeenCalledWith({
      data: {
        identityId: 'idn_admin',
        workspaceId: 'ws_1',
        role: WorkspaceMembershipRole.OWNER,
      },
    });
  });
});

describe('backfillAccountLayer', () => {
  it('is idempotent when every row is already linked', async () => {
    prismaMock.store.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await backfillAccountLayer();

    expect(result).toEqual({
      identitiesCreated: 0,
      workspacesCreated: 0,
      membershipsCreated: 0,
    });
    expect(prismaMock.identity.create).not.toHaveBeenCalled();
    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
  });

  it('does not create PERSONAL workspaces', async () => {
    prismaMock.store.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await backfillAccountLayer();

    expect(prismaMock.workspace.create).not.toHaveBeenCalled();
    const createdTypes = prismaMock.workspace.create.mock.calls.map(
      (call) => (call[0] as { data?: { type?: string } }).data?.type,
    );
    expect(createdTypes).not.toContain(WorkspaceType.PERSONAL);
  });
});
