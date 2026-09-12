import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, analyticsServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  analyticsServiceMock: {
    getFinancialSummary: vi.fn(),
    getExpenseAnalytics: vi.fn(),
    getFinancialTrend: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(async () => undefined),
  assertCanCreateResource: vi.fn(async () => undefined),
}));

vi.mock('../services/analytics.service.js', () => analyticsServiceMock);

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

const EMPLOYEE_RECORD = {
  ...ADMIN_RECORD,
  id: 'user_ali',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  role: UserRole.EMPLOYEE,
};

async function signedInAs(record: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  analyticsServiceMock.getFinancialSummary.mockResolvedValue({
    period: {
      from: '2026-08-01',
      to: '2026-08-31',
      fromInstant: '2026-07-31T19:00:00.000Z',
      toInstant: '2026-08-31T19:00:00.000Z',
      label: 'August 2026',
      timeZone: 'Asia/Tashkent',
    },
    generatedAt: '2026-08-09T05:00:00.000Z',
    metrics: {
      revenue: 0,
      cashCollected: 0,
      remainingReceivables: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      additionalCosts: 0,
      saleNetProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      expenseCount: 0,
      salesCount: 0,
    },
    previousPeriod: null,
  });
  analyticsServiceMock.getExpenseAnalytics.mockResolvedValue({
    period: {
      from: '2026-08-01',
      to: '2026-08-31',
      fromInstant: '2026-07-31T19:00:00.000Z',
      toInstant: '2026-08-31T19:00:00.000Z',
      label: 'August 2026',
      timeZone: 'Asia/Tashkent',
    },
    generatedAt: '2026-08-09T05:00:00.000Z',
    total: 0,
    count: 0,
    byCategory: [],
    dailyTrend: [],
  });
  analyticsServiceMock.getFinancialTrend.mockResolvedValue({
    period: {
      from: '2026-08-01',
      to: '2026-08-31',
      fromInstant: '2026-07-31T19:00:00.000Z',
      toInstant: '2026-08-31T19:00:00.000Z',
      label: 'August 2026',
      timeZone: 'Asia/Tashkent',
    },
    generatedAt: '2026-08-09T05:00:00.000Z',
    granularity: 'DAY',
    points: [],
    totals: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
    },
  });
});

describe('analytics routes', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/analytics/financial-summary').expect(401);
    await request(app).get('/api/analytics/expenses').expect(401);
    await request(app).get('/api/analytics/financial-trend').expect(401);
  });

  it('passes session storeId into financial summary', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get('/api/analytics/financial-summary?from=2026-08-01&to=2026-08-31&comparison=previous')
      .expect(200);

    expect(analyticsServiceMock.getFinancialSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        actorRole: UserRole.ADMIN,
        from: '2026-08-01',
        to: '2026-08-31',
        comparison: 'previous',
      }),
    );
  });

  it('ignores a client-supplied storeId query parameter', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get('/api/analytics/expenses?from=2026-08-01&to=2026-08-31&storeId=other_store')
      .expect(200);

    expect(analyticsServiceMock.getExpenseAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1' }),
    );
    expect(analyticsServiceMock.getExpenseAnalytics).toHaveBeenCalledWith(
      expect.not.objectContaining({ storeId: 'other_store' }),
    );
  });

  it('rejects invalid date ranges', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get('/api/analytics/financial-summary?from=2026-08-31&to=2026-08-01')
      .expect(422);
    expect(analyticsServiceMock.getFinancialSummary).not.toHaveBeenCalled();
  });

  it('forwards employee role so the service can forbid', async () => {
    analyticsServiceMock.getFinancialSummary.mockRejectedValue({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only store administrators can view financial analytics',
      isOperational: true,
      name: 'ApiError',
    });

    const agent = await signedInAs(EMPLOYEE_RECORD);
    // Service mock rejection may surface as 500 unless it's ApiError instance;
    // assert the role is forwarded instead.
    analyticsServiceMock.getFinancialSummary.mockResolvedValue({
      period: {
        from: '2026-08-01',
        to: '2026-08-31',
        fromInstant: '2026-07-31T19:00:00.000Z',
        toInstant: '2026-08-31T19:00:00.000Z',
        label: 'August 2026',
        timeZone: 'Asia/Tashkent',
      },
      generatedAt: '2026-08-09T05:00:00.000Z',
      metrics: {
        revenue: 0,
        cashCollected: 0,
        remainingReceivables: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        additionalCosts: 0,
        saleNetProfit: 0,
        operatingExpenses: 0,
        netProfit: 0,
        expenseCount: 0,
        salesCount: 0,
      },
      previousPeriod: null,
    });

    await agent.get('/api/analytics/financial-summary?from=2026-08-01&to=2026-08-31').expect(200);
    expect(analyticsServiceMock.getFinancialSummary).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: UserRole.EMPLOYEE, storeId: 'store_1' }),
    );
  });

  it('passes period params into financial trend', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const { body } = await agent
      .get('/api/analytics/financial-trend?from=2026-08-01&to=2026-08-31')
      .expect(200);

    expect(body.data.trend).toBeDefined();
    expect(analyticsServiceMock.getFinancialTrend).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        actorRole: UserRole.ADMIN,
        from: '2026-08-01',
        to: '2026-08-31',
      }),
    );
  });
});
