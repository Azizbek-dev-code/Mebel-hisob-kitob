import { AUDIT_REDACTED, AuditEntityType, AuditEventType, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { auditRepoMock } = vi.hoisted(() => ({
  auditRepoMock: {
    insertAuditLog: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

vi.mock('../repositories/audit.repository.js', () => auditRepoMock);

const {
  assertCanReadAuditLog,
  canReadAuditLog,
  listAuditLogs,
  recordAudit,
  sanitiseAuditMetadata,
} = await import('./audit.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('audit.service permissions', () => {
  it('allows admins and platform admins', () => {
    expect(canReadAuditLog(UserRole.ADMIN)).toBe(true);
    expect(canReadAuditLog(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(() => assertCanReadAuditLog(UserRole.ADMIN)).not.toThrow();
  });

  it('forbids employees', () => {
    expect(canReadAuditLog(UserRole.EMPLOYEE)).toBe(false);
    expect(() => assertCanReadAuditLog(UserRole.EMPLOYEE)).toThrow(ApiError);
  });
});

describe('sanitiseAuditMetadata', () => {
  it('strips secrets without dropping surrounding context', () => {
    const result = sanitiseAuditMetadata({
      username: 'admin',
      password: 'Secret123!',
      passwordHash: '$2a$…',
      token: 'jwt-token',
      secret: 'top',
      DATABASE_URL: 'postgres://user:pass@localhost/db',
      cookie: 'session=abc',
      note: 'safe',
    });

    expect(result).toEqual({
      username: 'admin',
      password: AUDIT_REDACTED,
      passwordHash: AUDIT_REDACTED,
      token: AUDIT_REDACTED,
      secret: AUDIT_REDACTED,
      DATABASE_URL: AUDIT_REDACTED,
      cookie: AUDIT_REDACTED,
      note: 'safe',
    });
  });
});

describe('recordAudit', () => {
  it('persists a sanitised row and never rejects', async () => {
    auditRepoMock.insertAuditLog.mockResolvedValue(undefined);

    await expect(
      recordAudit({
        storeId: 'store_1',
        actorUserId: 'user_1',
        eventType: AuditEventType.EXPENSE_CREATED,
        entityType: AuditEntityType.EXPENSE,
        entityId: 'exp_1',
        summary: 'Expense created',
        metadata: { password: 'nope', amount: 1000 },
      }),
    ).resolves.toBeUndefined();

    expect(auditRepoMock.insertAuditLog).toHaveBeenCalledWith({
      storeId: 'store_1',
      actorUserId: 'user_1',
      eventType: AuditEventType.EXPENSE_CREATED,
      entityType: AuditEntityType.EXPENSE,
      entityId: 'exp_1',
      summary: 'Expense created',
      metadata: { password: AUDIT_REDACTED, amount: 1000 },
    });
  });

  it('writes platform-level events with a null storeId', async () => {
    auditRepoMock.insertAuditLog.mockResolvedValue(undefined);

    await recordAudit({
      storeId: null,
      eventType: AuditEventType.STORE_CREATION_REQUESTED,
      entityType: AuditEntityType.STORE_CREATION_REQUEST,
      entityId: 'req_1',
      summary: 'Store creation requested',
      metadata: { password: 'nope' },
    });

    expect(auditRepoMock.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: null,
        eventType: 'STORE_CREATION_REQUESTED',
        metadata: expect.objectContaining({ password: AUDIT_REDACTED }),
      }),
    );
  });

  it('swallows repository failures', async () => {
    auditRepoMock.insertAuditLog.mockRejectedValue(new Error('db down'));

    await expect(
      recordAudit({
        storeId: 'store_1',
        eventType: AuditEventType.LOGIN,
        entityType: AuditEntityType.SESSION,
        summary: 'Signed in',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('listAuditLogs', () => {
  it('scopes the query to the session store', async () => {
    auditRepoMock.listAuditLogs.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    await listAuditLogs({
      storeId: 'store_1',
      actorRole: UserRole.ADMIN,
      query: { page: 1, eventType: 'LOGIN' },
    });

    expect(auditRepoMock.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        eventType: 'LOGIN',
      }),
    );
  });
});
