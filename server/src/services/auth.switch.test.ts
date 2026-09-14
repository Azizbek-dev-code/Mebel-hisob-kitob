import {
  AuthSessionKind,
  UserRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  findActiveUserById,
  toAuthUser,
  loadPersonalAuthUser,
  recordAuditMock,
} = vi.hoisted(() => ({
  prismaMock: {
    workspaceMembership: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
  },
  findActiveUserById: vi.fn(),
  toAuthUser: vi.fn(),
  loadPersonalAuthUser: vi.fn(),
  recordAuditMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../repositories/user.repository.js', () => ({
  findActiveUserById,
  findSignInCandidate: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  toAuthUser,
}));
vi.mock('../modules/personal-finance/billing/personal-subscription.service.js', () => ({
  findPersonalSignInCandidate: vi.fn(),
  loadPersonalAuthUser,
}));
vi.mock('../lib/jwt.js', () => ({
  signAccessToken: vi.fn(() => ({ token: 'token', expiresAt: new Date('2099-01-01T00:00:00.000Z') })),
  verifyAccessToken: vi.fn(),
}));
vi.mock('../lib/password.js', () => ({
  equaliseVerificationCost: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('../utils/logger.js', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const { switchWorkspace } = await import('./auth.service.js');

const PERSONAL_USER = {
  kind: AuthSessionKind.PERSONAL,
  id: 'idn_1',
  identityId: 'idn_1',
  workspaceId: 'ws_personal',
  email: 'aziz@example.com',
  fullName: 'Aziz',
  username: null,
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Shaxsiy',
  membershipRole: 'OWNER',
  subscription: { canWrite: true },
};

const STORE_RECORD = {
  id: 'user_store',
  storeId: 'store_a',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  loadPersonalAuthUser.mockResolvedValue(PERSONAL_USER);
  findActiveUserById.mockResolvedValue(STORE_RECORD);
  toAuthUser.mockReturnValue({
    id: 'user_store',
    email: 'aziz@example.com',
    username: 'aziz',
    fullName: 'Aziz',
    phone: null,
    role: UserRole.ADMIN,
    responsibilities: [],
    storeId: 'store_a',
    storeName: 'Fayz Mebel',
  });
});

describe('switchWorkspace', () => {
  it('forbids switching to a workspace the identity does not belong to', async () => {
    prismaMock.workspaceMembership.findUnique.mockResolvedValue(null);
    await expect(switchWorkspace('idn_1', 'ws_other')).rejects.toMatchObject({ statusCode: 403 });
    expect(findActiveUserById).not.toHaveBeenCalled();
  });

  it('issues a personal session only for an owned personal workspace', async () => {
    prismaMock.workspaceMembership.findUnique.mockResolvedValue({
      workspace: {
        id: 'ws_personal',
        type: WorkspaceType.PERSONAL,
        status: WorkspaceStatus.ACTIVE,
        storeId: null,
        name: 'Shaxsiy',
      },
    });

    const session = await switchWorkspace('idn_1', 'ws_personal');
    expect(session.kind).toBe(AuthSessionKind.PERSONAL);
    expect(loadPersonalAuthUser).toHaveBeenCalledWith('idn_1', 'ws_personal');
  });

  it('issues a store session only for a store user on that identity', async () => {
    prismaMock.workspaceMembership.findUnique.mockResolvedValue({
      workspace: {
        id: 'ws_a',
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        storeId: 'store_a',
        name: 'Fayz Mebel',
      },
    });
    prismaMock.user.findFirst.mockResolvedValue({ id: 'user_store' });

    const session = await switchWorkspace('idn_1', 'ws_a');
    expect(session.kind).toBe(AuthSessionKind.STORE);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ identityId: 'idn_1', storeId: 'store_a' }),
      }),
    );
  });

  it('does not let one business session impersonate another store', async () => {
    prismaMock.workspaceMembership.findUnique.mockResolvedValue({
      workspace: {
        id: 'ws_b',
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        storeId: 'store_b',
        name: 'Boshqa',
      },
    });
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(switchWorkspace('idn_1', 'ws_b')).rejects.toMatchObject({ statusCode: 403 });
  });
});
