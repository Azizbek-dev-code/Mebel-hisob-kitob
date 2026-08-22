import { UserRole } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { AUTH_COOKIE_NAME } from '../lib/auth-cookie.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    store: { findUnique: vi.fn() },
    sale: { aggregate: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    expense: { aggregate: vi.fn() },
    installmentPayment: { aggregate: vi.fn() },
    customer: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

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
  responsibilities: [],
};

const STORE = { id: 'store_1', name: 'Mebel Savdo', timezone: 'Asia/Tashkent', currency: 'UZS' };

// A fixed clock so the period the route resolves can be asserted exactly.
const NOW = new Date('2026-08-08T02:00:00.000Z');

async function signedInAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: 'admin', password: PASSWORD });
  return agent;
}

beforeEach(() => {
  // Call history has to start clean: several tests assert that a rejected
  // request never reached the database at all.
  vi.clearAllMocks();
  // Supertest needs its own timers to keep running, so the clock is pinned
  // rather than frozen.
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW });

  prismaMock.user.findFirst.mockResolvedValue(ADMIN_RECORD);
  prismaMock.user.update.mockResolvedValue(ADMIN_RECORD);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(2);
  prismaMock.store.findUnique.mockResolvedValue(STORE);
  prismaMock.sale.aggregate.mockResolvedValue({
    _sum: { totalSalePrice: null, totalCostPrice: null, grossProfit: null, netProfit: null },
    _count: { _all: 0 },
  });
  prismaMock.sale.findMany.mockResolvedValue([]);
  prismaMock.sale.groupBy.mockResolvedValue([]);
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
  prismaMock.installmentPayment.aggregate.mockResolvedValue({
    _sum: { remainingAmount: null },
    _count: { _all: 0 },
  });
  prismaMock.customer.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/dashboard/summary', () => {
  it('answers a signed-in request with the whole screen in one payload', async () => {
    const agent = await signedInAgent();

    const response = await agent.get('/api/dashboard/summary').expect(200);

    expect(response.body.success).toBe(true);
    expect(Object.keys(response.body.data.summary).sort()).toEqual([
      'debt',
      'financials',
      'generatedAt',
      'kpis',
      'range',
      'recentSales',
      'salesSeries',
      'store',
      'workforce',
    ]);
  });

  it('turns an empty database into zeros and empty sections', async () => {
    const agent = await signedInAgent();

    const { body } = await agent.get('/api/dashboard/summary').expect(200);
    const { summary } = body.data;

    expect(summary.kpis.periodRevenue).toBe(0);
    expect(summary.kpis.outstandingDebt).toBe(0);
    expect(summary.financials.netResult).toBe(0);
    expect(summary.recentSales).toEqual([]);
    expect(summary.debt.topDebtors).toEqual([]);
  });

  it('defaults to the current month', async () => {
    const agent = await signedInAgent();

    const { body } = await agent.get('/api/dashboard/summary').expect(200);

    expect(body.data.summary.range).toMatchObject({
      preset: 'THIS_MONTH',
      from: '2026-07-31T19:00:00.000Z',
      to: '2026-08-31T19:00:00.000Z',
      label: 'August 2026',
    });
  });

  it('narrows the period when one is asked for', async () => {
    const agent = await signedInAgent();

    const { body } = await agent.get('/api/dashboard/summary?preset=TODAY').expect(200);

    expect(body.data.summary.range).toMatchObject({
      preset: 'TODAY',
      from: '2026-08-07T19:00:00.000Z',
      to: '2026-08-08T19:00:00.000Z',
      granularity: 'HOUR',
    });
    expect(body.data.summary.salesSeries).toHaveLength(24);
  });

  it('accepts a custom period given as calendar dates', async () => {
    const agent = await signedInAgent();

    const { body } = await agent
      .get('/api/dashboard/summary?preset=CUSTOM&from=2026-08-01&to=2026-08-07')
      .expect(200);

    expect(body.data.summary.range).toMatchObject({
      preset: 'CUSTOM',
      from: '2026-07-31T19:00:00.000Z',
      to: '2026-08-07T19:00:00.000Z',
    });
  });
});

describe('access control', () => {
  it('rejects a request with no session', async () => {
    const response = await request(app).get('/api/dashboard/summary').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(prismaMock.sale.aggregate).not.toHaveBeenCalled();
  });

  it('rejects a forged token', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', `${AUTH_COOKIE_NAME}=not.a.real.token`)
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(prismaMock.sale.aggregate).not.toHaveBeenCalled();
  });

  it('reads the store from the session and ignores one named in the query', async () => {
    const agent = await signedInAgent();

    await agent.get('/api/dashboard/summary?storeId=store_2').expect(200);

    prismaMock.sale.aggregate.mock.calls.forEach(([args]) => {
      expect(args.where.storeId).toBe('store_1');
    });
    expect(prismaMock.store.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'store_1' } }),
    );
  });

  it('follows the session when a different store signs in', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...ADMIN_RECORD,
      id: 'user_other',
      storeId: 'store_2',
      store: { name: 'Boshqa Mebel' },
    });
    prismaMock.store.findUnique.mockResolvedValue({ ...STORE, id: 'store_2' });

    const agent = await signedInAgent();
    await agent.get('/api/dashboard/summary').expect(200);

    prismaMock.sale.aggregate.mock.calls.forEach(([args]) => {
      expect(args.where.storeId).toBe('store_2');
    });
  });
});

describe('invalid periods', () => {
  it('rejects a custom period with no dates', async () => {
    const agent = await signedInAgent();

    const response = await agent.get('/api/dashboard/summary?preset=CUSTOM').expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual([
      { field: 'from', message: 'A custom period needs both a start and an end date' },
    ]);
    expect(prismaMock.sale.aggregate).not.toHaveBeenCalled();
  });

  it('rejects a period that ends before it starts', async () => {
    const agent = await signedInAgent();

    const response = await agent
      .get('/api/dashboard/summary?preset=CUSTOM&from=2026-08-20&to=2026-08-01')
      .expect(422);

    expect(response.body.error.details).toEqual([
      { field: 'from', message: 'The start date must not be after the end date' },
    ]);
  });

  it('rejects a date that does not exist', async () => {
    const agent = await signedInAgent();

    const response = await agent
      .get('/api/dashboard/summary?preset=CUSTOM&from=2026-02-31&to=2026-03-01')
      .expect(422);

    expect(response.body.error.details?.[0]).toMatchObject({ field: 'from' });
  });

  it('rejects a period long enough to be a runaway query', async () => {
    const agent = await signedInAgent();

    const response = await agent
      .get('/api/dashboard/summary?preset=CUSTOM&from=2020-01-01&to=2026-08-01')
      .expect(422);

    expect(response.body.error.details?.[0]).toMatchObject({ field: 'to' });
  });

  it('rejects a period name it does not recognise', async () => {
    const agent = await signedInAgent();

    const response = await agent.get('/api/dashboard/summary?preset=LAST_DECADE').expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('failures', () => {
  it('reports a database failure as a server error without leaking the query', async () => {
    prismaMock.sale.aggregate.mockRejectedValue(new Error('connection terminated: sales_pkey'));

    const agent = await signedInAgent();
    const response = await agent.get('/api/dashboard/summary').expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
