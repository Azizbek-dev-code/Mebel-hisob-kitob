import {
  PERSONAL_PLAN_KEY,
  SubscriptionStatus,
  UserRole,
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { AUTH_COOKIE_NAME } from '../lib/auth-cookie.js';

// Declared through `vi.hoisted` because `vi.mock` is lifted above the imports,
// so a plain `const` would still be in its temporal dead zone when the factory runs.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    identity: {
      findFirst: vi.fn(),
    },
    workspaceMembership: {
      findUnique: vi.fn(),
    },
    personalSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptionRequest: {
      findFirst: vi.fn(),
    },
  },
}));

// Authentication is the one place worth testing end to end through the real
// middleware stack, so only the database boundary is replaced.
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

const app = createApp();

const PASSWORD = 'Admin123!';
// Four rounds keeps the suite fast; bcrypt.compare reads the cost from the digest.
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
  responsibilities: [],
};

const PERSONAL_SUBSCRIPTION = {
  status: SubscriptionStatus.TRIAL,
  planKey: PERSONAL_PLAN_KEY.TRIAL,
  trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
  trialWelcomeSeenAt: new Date('2026-09-13T00:00:00.000Z'),
};

function mockPersonalIdentity() {
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.identity.findFirst.mockResolvedValue({
    id: 'idn_1',
    email: 'navphase2@example.com',
    fullName: 'Nav Test',
    passwordHash: PASSWORD_HASH,
    memberships: [{ workspaceId: 'ws_1', role: WorkspaceMembershipRole.OWNER }],
  });
  prismaMock.workspaceMembership.findUnique.mockResolvedValue({
    role: WorkspaceMembershipRole.OWNER,
    identity: { id: 'idn_1', email: 'navphase2@example.com', fullName: 'Nav Test' },
    workspace: {
      id: 'ws_1',
      type: WorkspaceType.PERSONAL,
      name: 'Nav Test shaxsiy',
      status: WorkspaceStatus.ACTIVE,
      storeId: null,
    },
  });
  prismaMock.personalSubscription.findUnique.mockResolvedValue(PERSONAL_SUBSCRIPTION);
}

function setCookieHeader(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

function authCookie(response: request.Response): string | undefined {
  return setCookieHeader(response).find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
}

beforeEach(() => {
  prismaMock.user.findFirst.mockReset();
  prismaMock.user.update.mockReset();
  prismaMock.identity.findFirst.mockReset();
  prismaMock.workspaceMembership.findUnique.mockReset();
  prismaMock.personalSubscription.findUnique.mockReset();
  prismaMock.personalSubscription.create.mockReset();
  prismaMock.personalSubscription.update.mockReset();
  prismaMock.subscriptionRequest.findFirst.mockReset();
  prismaMock.user.findFirst.mockResolvedValue(ADMIN_RECORD);
  prismaMock.user.update.mockResolvedValue(ADMIN_RECORD);
  prismaMock.identity.findFirst.mockResolvedValue(null);
  prismaMock.subscriptionRequest.findFirst.mockResolvedValue(null);
});

describe('POST /api/auth/login', () => {
  it('signs the user in and returns the principal without any secrets', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: PASSWORD })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toEqual({
      id: 'user_admin',
      email: 'admin@furniture-erp.local',
      username: 'admin',
      fullName: 'Store Administrator',
      phone: null,
      role: 'ADMIN',
      responsibilities: [],
      storeId: 'store_1',
      storeName: 'Mebel Savdo',
      storeAccessStatus: 'ACTIVE',
      subscription: {
        status: 'ACTIVE',
        storedStatus: 'ACTIVE',
        planId: null,
        planName: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
        trialWelcomeSeenAt: null,
        daysRemaining: null,
        canWrite: true,
        hasPendingPaymentRequest: false,
        featureKeys: [],
        featuresRestricted: false,
      },
    });

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain(PASSWORD_HASH);
    expect(serialised).not.toContain(PASSWORD);
  });

  it('puts the token in an HTTP-only cookie and nowhere else', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@furniture-erp.local', password: PASSWORD })
      .expect(200);

    const cookie = authCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');

    expect(response.body.data).not.toHaveProperty('token');
    expect(response.body.data).not.toHaveProperty('accessToken');
  });

  it('accepts either the username or the email column', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'ADMIN@Furniture-ERP.local', password: PASSWORD })
      .expect(200);

    const where = prismaMock.user.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.isActive).toBe(true);
    expect(where.deletedAt).toBeNull();
    expect(where.OR).toEqual([
      { email: { equals: 'ADMIN@Furniture-ERP.local', mode: 'insensitive' } },
      { username: { equals: 'ADMIN@Furniture-ERP.local', mode: 'insensitive' } },
    ]);
  });

  it('records the sign-in time', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: PASSWORD })
      .expect(200);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_admin' } }),
    );
  });

  it('rejects a wrong password without issuing a cookie', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'not-the-password' })
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Incorrect username or password.' },
    });
    expect(authCookie(response)).toBeUndefined();
  });

  it('answers identically for an unknown account, so none can be enumerated', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: PASSWORD })
      .expect(401);

    prismaMock.user.findFirst.mockResolvedValue(ADMIN_RECORD);
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'not-the-password' })
      .expect(401);

    expect(unknown.body).toEqual(wrongPassword.body);
  });

  it('reports missing fields as validation errors the form can map', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '   ', password: '' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual([
      { field: 'identifier', message: 'Enter your username or email' },
      { field: 'password', message: 'Enter your password' },
    ]);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('still succeeds when the last-login timestamp cannot be written', async () => {
    prismaMock.user.update.mockRejectedValue(new Error('write conflict'));

    await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: PASSWORD })
      .expect(200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user for a request carrying the session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });

    const response = await agent.get('/api/auth/me').expect(200);

    expect(response.body.data.user).toMatchObject({
      id: 'user_admin',
      email: 'admin@furniture-erp.local',
      role: 'ADMIN',
      storeName: 'Mebel Savdo',
    });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a request with no cookie at all', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged token and clears the cookie', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=not.a.real.token`)
      .expect(401);

    expect(response.body.error.message).toBe('Your session has expired. Please sign in again.');
    expect(authCookie(response)).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('rejects a valid token whose account has since been deactivated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });

    // The `isActive` filter now excludes the row, exactly as it would after a suspension.
    prismaMock.user.findFirst.mockResolvedValue(null);

    const response = await agent.get('/api/auth/me').expect(401);
    expect(response.body.error.message).toBe(
      'Your session is no longer valid. Please sign in again.',
    );
  });

  it('re-reads the user rather than trusting the claims in the token', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });

    prismaMock.user.findFirst.mockResolvedValue({
      ...ADMIN_RECORD,
      role: UserRole.CASHIER,
      fullName: 'Demoted Administrator',
    });

    const response = await agent.get('/api/auth/me').expect(200);

    expect(response.body.data.user.role).toBe('CASHIER');
    expect(response.body.data.user.fullName).toBe('Demoted Administrator');
  });
});

describe('POST /api/auth/logout', () => {
  it('expires the session cookie and ends access to protected routes', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });
    await agent.get('/api/auth/me').expect(200);

    const response = await agent.post('/api/auth/logout').expect(204);
    expect(authCookie(response)).toContain('Expires=Thu, 01 Jan 1970');

    await agent.get('/api/auth/me').expect(401);
  });

  it('succeeds for a caller who was never signed in', async () => {
    await request(app).post('/api/auth/logout').expect(204);
  });
});

describe('store vs personal session isolation', () => {
  it('blocks a personal session from store ERP routes', async () => {
    mockPersonalIdentity();
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ identifier: 'navphase2@example.com', password: PASSWORD })
      .expect(200);

    expect(login.body.data.user.kind).toBe('PERSONAL');
    expect(login.body.data.user.storeId).toBeNull();

    const sales = await agent.get('/api/sales').expect(403);
    expect(sales.body.error.code).toBe('FORBIDDEN');
    expect(sales.body.error.message).toContain('do‘kon ERP');

    const expenses = await agent.get('/api/expenses').expect(403);
    expect(expenses.body.error.code).toBe('FORBIDDEN');
  });

  it('blocks a store session from personal finance routes', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD }).expect(200);

    const summary = await agent.get('/api/personal/summary').expect(403);
    expect(summary.body.error.code).toBe('FORBIDDEN');
    expect(summary.body.error.message).toContain('shaxsiy moliya');
  });
});
