import { describe, expect, it } from 'vitest';
import { WorkspaceStatus, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, vi } from 'vitest';

const {
  membershipFindMany,
  prefDeleteMany,
  connectionFindUnique,
  connectionUpdate,
  linkTokenDeleteMany,
  pendingDeleteMany,
  workspaceFindUnique,
  membershipFindFirst,
} = vi.hoisted(() => ({
  membershipFindMany: vi.fn(),
  prefDeleteMany: vi.fn(),
  connectionFindUnique: vi.fn(),
  connectionUpdate: vi.fn(),
  linkTokenDeleteMany: vi.fn(),
  pendingDeleteMany: vi.fn(),
  workspaceFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    workspaceMembership: {
      findMany: membershipFindMany,
      findFirst: membershipFindFirst,
    },
    telegramAccountPreference: { deleteMany: prefDeleteMany },
    telegramConnection: {
      findUnique: connectionFindUnique,
      update: connectionUpdate,
    },
    telegramLinkToken: { deleteMany: linkTokenDeleteMany },
    telegramPendingLink: { deleteMany: pendingDeleteMany },
    workspace: { findUnique: workspaceFindUnique },
  },
}));

const {
  cleanupTelegramAfterBusinessDeleted,
  cleanupTelegramAfterUserAccountDeleted,
  countValidTelegramAccountContexts,
} = await import('./telegram.cleanup.service.js');

describe('telegram.cleanup.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefDeleteMany.mockResolvedValue({ count: 1 });
    linkTokenDeleteMany.mockResolvedValue({ count: 0 });
    pendingDeleteMany.mockResolvedValue({ count: 0 });
    connectionUpdate.mockResolvedValue({});
  });

  it('counts Personal + active Business as valid contexts', async () => {
    membershipFindMany.mockResolvedValue([
      {
        workspace: {
          id: 'ws_p',
          type: WorkspaceType.PERSONAL,
          status: WorkspaceStatus.ACTIVE,
          store: null,
        },
      },
      {
        workspace: {
          id: 'ws_a',
          type: WorkspaceType.BUSINESS,
          status: WorkspaceStatus.ACTIVE,
          store: { id: 'st_a', isActive: true },
        },
      },
      {
        workspace: {
          id: 'ws_dead',
          type: WorkspaceType.BUSINESS,
          status: WorkspaceStatus.ARCHIVED,
          store: { id: 'st_dead', isActive: false },
        },
      },
    ]);
    await expect(countValidTelegramAccountContexts('idn_1')).resolves.toBe(2);
  });

  it('deletes Business A prefs but keeps Telegram when Personal remains', async () => {
    membershipFindMany.mockResolvedValue([
      {
        workspace: {
          id: 'ws_p',
          type: WorkspaceType.PERSONAL,
          status: WorkspaceStatus.ACTIVE,
          store: null,
        },
      },
    ]);
    connectionFindUnique.mockResolvedValue({ id: 'conn_1', isActive: true });

    const result = await cleanupTelegramAfterBusinessDeleted({
      identityId: 'idn_1',
      workspaceId: 'ws_a',
    });

    expect(prefDeleteMany).toHaveBeenCalledWith({ where: { workspaceId: 'ws_a' } });
    expect(result.connectionUnlinked).toBe(false);
    expect(connectionUpdate).not.toHaveBeenCalled();
  });

  it('keeps Telegram when Business B remains after deleting Business A', async () => {
    membershipFindMany.mockResolvedValue([
      {
        workspace: {
          id: 'ws_b',
          type: WorkspaceType.BUSINESS,
          status: WorkspaceStatus.ACTIVE,
          store: { id: 'st_b', isActive: true },
        },
      },
    ]);

    const result = await cleanupTelegramAfterBusinessDeleted({
      identityId: 'idn_1',
      workspaceId: 'ws_a',
    });

    expect(result.prefsDeleted).toBe(1);
    expect(result.connectionUnlinked).toBe(false);
  });

  it('unlinks Telegram when last account context is gone', async () => {
    membershipFindMany.mockResolvedValue([]);
    connectionFindUnique.mockResolvedValue({ id: 'conn_1', isActive: true });

    const result = await cleanupTelegramAfterBusinessDeleted({
      identityId: 'idn_1',
      workspaceId: 'ws_a',
    });

    expect(result.connectionUnlinked).toBe(true);
    expect(connectionUpdate).toHaveBeenCalledWith({
      where: { identityId: 'idn_1' },
      data: { isActive: false, disconnectedAt: expect.any(Date) },
    });
    expect(prefDeleteMany).toHaveBeenCalled();
  });

  it('user account delete does not unlink when other contexts remain', async () => {
    workspaceFindUnique.mockResolvedValue({ id: 'ws_a' });
    membershipFindFirst.mockResolvedValue({ id: 'm1' });
    membershipFindMany.mockResolvedValue([
      {
        workspace: {
          id: 'ws_p',
          type: WorkspaceType.PERSONAL,
          status: WorkspaceStatus.ACTIVE,
          store: null,
        },
      },
    ]);

    const result = await cleanupTelegramAfterUserAccountDeleted({
      identityId: 'idn_1',
      storeId: 'st_a',
    });

    expect(result.connectionUnlinked).toBe(false);
  });
});
