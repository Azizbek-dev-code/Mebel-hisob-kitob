import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApiError } from '../utils/api-error.js';

const { prismaMock, storeCreationServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  storeCreationServiceMock: {
    createStoreRequest: vi.fn(),
    getPublicStoreRequest: vi.fn(),
    listStoreRequests: vi.fn(),
    getStoreRequestForAdmin: vi.fn(),
    getPendingSummary: vi.fn(),
    approveStoreRequest: vi.fn(),
    rejectStoreRequest: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/store-creation.service.js', () => storeCreationServiceMock);

const app = createApp();
const PASSWORD = 'Admin123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const ADMIN_RECORD = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: UserRole.ADMIN,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const PLATFORM_RECORD = {
  ...ADMIN_RECORD,
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  role: UserRole.PLATFORM_ADMIN,
};

const CASHIER_RECORD = {
  ...ADMIN_RECORD,
  id: 'user_cashier',
  email: 'cashier@furniture-erp.local',
  username: 'cashier',
  fullName: 'Vali Sotuvchi',
  role: UserRole.CASHIER,
};

const PUBLIC_REQUEST = {
  id: 'req_1',
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: 'Urgut',
  status: 'PENDING',
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdStoreId: null,
};

async function loginAs(user: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(user);
  prismaMock.user.update.mockResolvedValue(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: user.username, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'] as string[];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('public store-request routes', () => {
  it('validates the create body', async () => {
    const res = await request(app).post('/api/store-requests').send({});
    expect(res.status).toBe(422);
    expect(storeCreationServiceMock.createStoreRequest).not.toHaveBeenCalled();
  });

  it('creates a pending request without returning the password', async () => {
    storeCreationServiceMock.createStoreRequest.mockResolvedValue(PUBLIC_REQUEST);

    const res = await request(app).post('/api/store-requests').send({
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
    });

    expect(res.status).toBe(201);
    expect(res.body.data.request.status).toBe('PENDING');
    expect(JSON.stringify(res.body)).not.toContain('Owner123!');
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('returns public status', async () => {
    storeCreationServiceMock.getPublicStoreRequest.mockResolvedValue(PUBLIC_REQUEST);
    const res = await request(app).get('/api/store-requests/clxxxxxxxxxxxxxxxxxxxxxx');
    expect(res.status).toBe(200);
    expect(res.body.data.request.id).toBe('req_1');
  });
});

describe('platform store-request authorization', () => {
  it('requires auth for the inbox', async () => {
    const res = await request(app).get('/api/platform/store-requests');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a store ADMIN', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app).get('/api/platform/store-requests').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(storeCreationServiceMock.listStoreRequests).not.toHaveBeenCalled();
  });

  it('returns 403 for a cashier on approve', async () => {
    const cookie = await loginAs(CASHIER_RECORD);
    const res = await request(app)
      .post('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx/approve')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(storeCreationServiceMock.approveStoreRequest).not.toHaveBeenCalled();
  });

  it('returns 403 for a store ADMIN on reject', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const res = await request(app)
      .post('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx/reject')
      .set('Cookie', cookie)
      .send({ reason: 'Duplicate application' });
    expect(res.status).toBe(403);
    expect(storeCreationServiceMock.rejectStoreRequest).not.toHaveBeenCalled();
  });

  it('lists requests for PLATFORM_ADMIN', async () => {
    const cookie = await loginAs(PLATFORM_RECORD);
    storeCreationServiceMock.listStoreRequests.mockResolvedValue({
      items: [{ ...PUBLIC_REQUEST, reviewedById: null, reviewedByName: null }],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      pendingCount: 1,
    });

    const res = await request(app).get('/api/platform/store-requests').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.pendingCount).toBe(1);
    expect(storeCreationServiceMock.listStoreRequests).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: UserRole.PLATFORM_ADMIN }),
    );
  });

  it('approves for PLATFORM_ADMIN', async () => {
    const cookie = await loginAs(PLATFORM_RECORD);
    storeCreationServiceMock.approveStoreRequest.mockResolvedValue({
      request: { ...PUBLIC_REQUEST, status: 'APPROVED', reviewedById: 'user_platform', reviewedByName: 'Platform' },
      store: { id: 'store_new', name: 'TEST Furniture Store', isActive: true },
      owner: {
        id: 'user_new',
        email: 'owner@example.com',
        username: 'testowner',
        fullName: 'Test Store Owner',
        role: 'ADMIN',
        storeId: 'store_new',
      },
    });

    const res = await request(app)
      .post('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx/approve')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.store.isActive).toBe(true);
    expect(res.body.data.owner.role).toBe('ADMIN');
  });

  it('rejects with a reason for PLATFORM_ADMIN', async () => {
    const cookie = await loginAs(PLATFORM_RECORD);
    storeCreationServiceMock.rejectStoreRequest.mockResolvedValue({
      ...PUBLIC_REQUEST,
      status: 'REJECTED',
      rejectionReason: 'Incomplete',
      reviewedById: 'user_platform',
      reviewedByName: 'Platform',
    });

    const res = await request(app)
      .post('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx/reject')
      .set('Cookie', cookie)
      .send({ reason: 'Incomplete' });

    expect(res.status).toBe(200);
    expect(storeCreationServiceMock.rejectStoreRequest).toHaveBeenCalled();
  });

  it('requires a rejection reason', async () => {
    const cookie = await loginAs(PLATFORM_RECORD);
    const res = await request(app)
      .post('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx/reject')
      .set('Cookie', cookie)
      .send({ reason: '' });
    expect(res.status).toBe(422);
  });
});

describe('service 403 surfaces on detail', () => {
  it('returns 403 when the service forbids an ADMIN who bypassed the middleware', async () => {
    // Middleware already blocks ADMIN; this documents the service error shape.
    storeCreationServiceMock.getStoreRequestForAdmin.mockRejectedValue(
      ApiError.forbidden("Faqat Platform Admin do'kon so'rovlarini ko'ra oladi"),
    );
    const cookie = await loginAs(PLATFORM_RECORD);
    const res = await request(app)
      .get('/api/platform/store-requests/clxxxxxxxxxxxxxxxxxxxxxx')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});
