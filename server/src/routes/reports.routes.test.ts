import { DateRangePreset, UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApiError } from '../utils/api-error.js';

const { prismaMock, reportsServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  reportsServiceMock: {
    getReportsSummary: vi.fn(),
    getReportsProfitLoss: vi.fn(),
    getReportsCashFlow: vi.fn(),
    getReportsSales: vi.fn(),
    getReportsExpenses: vi.fn(),
    getReportsDebts: vi.fn(),
    getReportsWorkers: vi.fn(),
    getReportsProducts: vi.fn(),
    getReportsInventory: vi.fn(),
    getReportsTrend: vi.fn(),
    getReportsBundle: vi.fn(),
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

vi.mock('../services/reports.service.js', () => reportsServiceMock);

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
  id: 'user_emp',
  email: 'emp@furniture-erp.local',
  username: 'emp',
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
  reportsServiceMock.getReportsSummary.mockResolvedValue({
    period: { from: '2026-08-01', to: '2026-08-31', label: 'August 2026' },
    extras: { settledCompensation: 0, cancelledSalesCount: 0 },
    financial: { metrics: { revenue: 1_000_000, netProfit: 200_000 } },
  });
  reportsServiceMock.getReportsBundle.mockResolvedValue({
    summary: { financial: { metrics: { revenue: 1_000_000 } } },
  });
  reportsServiceMock.getReportsSales.mockRejectedValue(
    ApiError.forbidden('Only store administrators can view financial analytics'),
  );
});

describe('reports routes', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/reports/summary').expect(401);
  });

  it('returns summary for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent
      .get('/api/reports/summary')
      .query({ preset: DateRangePreset.THIS_MONTH })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(reportsServiceMock.getReportsSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        actorRole: UserRole.ADMIN,
        preset: DateRangePreset.THIS_MONTH,
      }),
    );
  });

  it('forbids employee from reports', async () => {
    reportsServiceMock.getReportsSummary.mockRejectedValue(
      ApiError.forbidden('Only store administrators can view financial analytics'),
    );
    const agent = await signedInAs(EMPLOYEE_RECORD);
    await agent.get('/api/reports/summary').query({ preset: DateRangePreset.THIS_MONTH }).expect(403);
  });

  it('accepts LAST_MONTH preset', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    await agent
      .get('/api/reports/bundle')
      .query({ preset: DateRangePreset.LAST_MONTH })
      .expect(200);
    expect(reportsServiceMock.getReportsBundle).toHaveBeenCalled();
  });
});
