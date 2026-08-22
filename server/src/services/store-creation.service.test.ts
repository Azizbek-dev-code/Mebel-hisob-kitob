import {
  StoreCreationRequestStatus,
  UserRole,
  type CreateStoreRequestBody,
  type StoreCreationRequestAdmin,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const {
  prismaMock,
  hashPasswordMock,
  recordAuditMock,
  createPendingRequest,
  findById,
  findPendingByPhone,
  findPendingByEmail,
  findPendingByUsername,
  findPendingByStoreName,
  findUserByEmail,
  findUserByUsername,
  listRequests,
  countPending,
  loadPendingForUpdate,
  toPublicView,
  toAdminView,
  provisionStoreSubscription,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  hashPasswordMock: vi.fn(),
  recordAuditMock: vi.fn(),
  createPendingRequest: vi.fn(),
  findById: vi.fn(),
  findPendingByPhone: vi.fn(),
  findPendingByEmail: vi.fn(),
  findPendingByUsername: vi.fn(),
  findPendingByStoreName: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserByUsername: vi.fn(),
  listRequests: vi.fn(),
  countPending: vi.fn(),
  loadPendingForUpdate: vi.fn(),
  toPublicView: vi.fn(),
  toAdminView: vi.fn(),
  provisionStoreSubscription: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/password.js', () => ({ hashPassword: hashPasswordMock }));
vi.mock('./audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./platform-billing.service.js', () => ({
  provisionStoreSubscription,
}));
vi.mock('../repositories/store-creation.repository.js', () => ({
  createPendingRequest,
  findById,
  findPendingByPhone,
  findPendingByEmail,
  findPendingByUsername,
  findPendingByStoreName,
  findUserByEmail,
  findUserByUsername,
  listRequests,
  countPending,
  loadPendingForUpdate,
  toPublicView,
  toAdminView,
  applicantDisplayName: vi.fn(),
}));

const {
  approveStoreRequest,
  assertCanReviewStoreCreationRequests,
  canReviewStoreCreationRequests,
  createStoreRequest,
  getPendingSummary,
  listStoreRequests,
  rejectStoreRequest,
} = await import('./store-creation.service.js');

const BODY: CreateStoreRequestBody = {
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  password: 'Owner123!',
  passwordConfirmation: 'Owner123!',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
};

const PENDING_ROW = {
  id: 'req_1',
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
  status: StoreCreationRequestStatus.PENDING,
  rejectionReason: null,
  reviewedAt: null,
  createdAt: new Date('2026-08-21T00:00:00.000Z'),
  updatedAt: new Date('2026-08-21T00:00:00.000Z'),
  createdStoreId: null,
  reviewedById: null,
  createdUserId: null,
  reviewedBy: null,
};

const PUBLIC_VIEW = {
  id: 'req_1',
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
  status: StoreCreationRequestStatus.PENDING,
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdStoreId: null,
};

const ADMIN_VIEW: StoreCreationRequestAdmin = {
  ...PUBLIC_VIEW,
  reviewedById: null,
  reviewedByName: null,
};

const PLATFORM = { id: 'user_platform', role: UserRole.PLATFORM_ADMIN, storeId: 'store_1' };

beforeEach(() => {
  vi.clearAllMocks();
  hashPasswordMock.mockResolvedValue('$2a$hashed');
  recordAuditMock.mockResolvedValue(undefined);
  toPublicView.mockReturnValue(PUBLIC_VIEW);
  toAdminView.mockReturnValue(ADMIN_VIEW);
  provisionStoreSubscription.mockResolvedValue(undefined);
  findPendingByPhone.mockResolvedValue(null);
  findPendingByEmail.mockResolvedValue(null);
  findPendingByUsername.mockResolvedValue(null);
  findPendingByStoreName.mockResolvedValue(null);
  findUserByEmail.mockResolvedValue(null);
  findUserByUsername.mockResolvedValue(null);
  createPendingRequest.mockResolvedValue(PENDING_ROW);
});

describe('permissions', () => {
  it('allows only PLATFORM_ADMIN', () => {
    expect(canReviewStoreCreationRequests(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(canReviewStoreCreationRequests(UserRole.ADMIN)).toBe(false);
    expect(canReviewStoreCreationRequests(UserRole.CASHIER)).toBe(false);
    expect(canReviewStoreCreationRequests(UserRole.EMPLOYEE)).toBe(false);
    expect(() => assertCanReviewStoreCreationRequests(UserRole.ADMIN)).toThrow(ApiError);
  });
});

describe('createStoreRequest', () => {
  it('creates a PENDING request and hashes the password', async () => {
    const result = await createStoreRequest(BODY);

    expect(hashPasswordMock).toHaveBeenCalledWith('Owner123!');
    expect(createPendingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: '$2a$hashed',
        phone: '+998901112233',
        email: 'owner@example.com',
        username: 'testowner',
        storeName: 'TEST Furniture Store',
      }),
    );
    expect(result.status).toBe('PENDING');
    expect(JSON.stringify(result)).not.toContain('Owner123!');
    expect(JSON.stringify(result)).not.toContain('$2a$hashed');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'STORE_CREATION_REQUESTED',
        storeId: null,
        entityId: 'req_1',
      }),
    );
  });

  it('does not create an active store on submit', async () => {
    await createStoreRequest(BODY);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate pending phone', async () => {
    findPendingByPhone.mockResolvedValue({ id: 'req_old' });
    await expect(createStoreRequest(BODY)).rejects.toMatchObject({ statusCode: 409 });
    expect(createPendingRequest).not.toHaveBeenCalled();
  });

  it('rejects a duplicate pending email or existing user email', async () => {
    findUserByEmail.mockResolvedValue({ id: 'user_1' });
    await expect(createStoreRequest(BODY)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects password confirmation mismatch', async () => {
    await expect(
      createStoreRequest({ ...BODY, passwordConfirmation: 'Other123!' }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });
});

describe('listStoreRequests', () => {
  it('forbids store admins', async () => {
    await expect(listStoreRequests({ actorRole: UserRole.ADMIN })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns pending items for platform admin', async () => {
    listRequests.mockResolvedValue({
      rows: [PENDING_ROW],
      totalItems: 1,
      pendingCount: 1,
    });

    const result = await listStoreRequests({ actorRole: UserRole.PLATFORM_ADMIN });
    expect(result.pendingCount).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});

describe('getPendingSummary', () => {
  it('forbids cashiers', async () => {
    await expect(getPendingSummary(UserRole.CASHIER)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns the pending count', async () => {
    countPending.mockResolvedValue(3);
    await expect(getPendingSummary(UserRole.PLATFORM_ADMIN)).resolves.toEqual({ pendingCount: 3 });
  });
});

describe('approveStoreRequest', () => {
  it('forbids a store ADMIN', async () => {
    await expect(approveStoreRequest({ ...PLATFORM, role: UserRole.ADMIN }, 'req_1')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('creates an ACTIVE store and ADMIN owner inside a transaction', async () => {
    const storeCreate = vi.fn().mockResolvedValue({
      id: 'store_new',
      name: 'TEST Furniture Store',
      isActive: true,
    });
    const userCreate = vi.fn().mockResolvedValue({
      id: 'user_new',
      email: 'owner@example.com',
      username: 'testowner',
      fullName: 'Test Store Owner',
      role: UserRole.ADMIN,
      storeId: 'store_new',
    });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const updateRequest = vi.fn().mockResolvedValue({
      ...PENDING_ROW,
      status: StoreCreationRequestStatus.APPROVED,
      createdStoreId: 'store_new',
      createdUserId: 'user_new',
      reviewedById: PLATFORM.id,
      reviewedBy: { id: PLATFORM.id, fullName: 'Platform Administrator' },
      passwordHash: null,
    });

    loadPendingForUpdate.mockResolvedValue({
      ...PENDING_ROW,
      passwordHash: '$2a$hashed',
    });

    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        store: { create: storeCreate },
        user: { create: userCreate },
        expenseCategory: { createMany },
        storeCreationRequest: { update: updateRequest },
      }),
    );

    const result = await approveStoreRequest(PLATFORM, 'req_1');

    expect(storeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'TEST Furniture Store', isActive: true }),
      }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: UserRole.ADMIN,
          storeId: 'store_new',
          passwordHash: '$2a$hashed',
        }),
      }),
    );
    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StoreCreationRequestStatus.APPROVED,
          passwordHash: null,
        }),
      }),
    );
    expect(result.store.isActive).toBe(true);
    expect(result.owner.role).toBe('ADMIN');
    expect(result.owner.storeId).toBe('store_new');
    expect(provisionStoreSubscription).toHaveBeenCalledWith('store_new');
    expect(JSON.stringify(result)).not.toContain('$2a$hashed');
    expect(JSON.stringify(result)).not.toContain('Owner123!');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'STORE_CREATION_APPROVED',
        storeId: 'store_new',
        actorUserId: PLATFORM.id,
      }),
    );
  });

  it('rolls back when a later write fails', async () => {
    loadPendingForUpdate.mockResolvedValue({ ...PENDING_ROW, passwordHash: '$2a$hashed' });
    const storeCreate = vi.fn().mockResolvedValue({
      id: 'store_new',
      name: 'TEST Furniture Store',
      isActive: true,
    });
    const userCreate = vi.fn().mockRejectedValue(new Error('unique constraint'));

    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        store: { create: storeCreate },
        user: { create: userCreate },
        expenseCategory: { createMany: vi.fn() },
        storeCreationRequest: { update: vi.fn() },
      }),
    );

    await expect(approveStoreRequest(PLATFORM, 'req_1')).rejects.toThrow('unique constraint');
    expect(recordAuditMock).not.toHaveBeenCalled();
  });
});

describe('rejectStoreRequest', () => {
  it('forbids employees', async () => {
    await expect(
      rejectStoreRequest({ ...PLATFORM, role: UserRole.EMPLOYEE }, 'req_1', 'Duplicate'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('marks REJECTED, saves the reason, and does not create a store', async () => {
    loadPendingForUpdate.mockResolvedValue({ ...PENDING_ROW, passwordHash: '$2a$hashed' });
    const updateRequest = vi.fn().mockResolvedValue({
      ...PENDING_ROW,
      status: StoreCreationRequestStatus.REJECTED,
      rejectionReason: 'Incomplete documents',
      reviewedById: PLATFORM.id,
      reviewedBy: { id: PLATFORM.id, fullName: 'Platform Administrator' },
    });

    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ storeCreationRequest: { update: updateRequest } }),
    );

    toAdminView.mockReturnValue({
      ...ADMIN_VIEW,
      status: StoreCreationRequestStatus.REJECTED,
      rejectionReason: 'Incomplete documents',
    });

    const result = await rejectStoreRequest(PLATFORM, 'req_1', 'Incomplete documents');

    expect(updateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StoreCreationRequestStatus.REJECTED,
          rejectionReason: 'Incomplete documents',
          passwordHash: null,
        }),
      }),
    );
    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe('Incomplete documents');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'STORE_CREATION_REJECTED' }),
    );
  });
});
