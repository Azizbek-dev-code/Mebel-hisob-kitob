import { DateRangePreset, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    store: { findUnique: vi.fn() },
    sale: { aggregate: vi.fn(), findMany: vi.fn() },
    payment: { aggregate: vi.fn() },
    expense: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    expenseCategory: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

const {
  buildFinancialTrendPoints,
  getExpenseAnalytics,
  getFinancialSummary,
  getFinancialTrend,
  previousEquivalentRange,
  resolveAnalyticsRangeForTests,
} = await import('./analytics.service.js');

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const NOW = new Date('2026-08-09T05:00:00.000Z'); // ~10:00 Tashkent on 9 Aug

const STORE = {
  id: STORE_ID,
  name: 'Mebel Savdo',
  timezone: 'Asia/Tashkent',
  currency: 'UZS',
};

function emptySaleAggregate() {
  return {
    _sum: {
      totalSalePrice: null,
      totalCostPrice: null,
      grossProfit: null,
      netProfit: null,
      remainingAmount: null,
    },
    _count: { _all: 0 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.store.findUnique.mockResolvedValue(STORE);
  prismaMock.sale.aggregate.mockResolvedValue(emptySaleAggregate());
  prismaMock.sale.findMany.mockResolvedValue([]);
  prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } });
  prismaMock.expense.groupBy.mockResolvedValue([]);
  prismaMock.expense.findMany.mockResolvedValue([]);
  prismaMock.expenseCategory.findMany.mockResolvedValue([]);
});

describe('analytics authorization', () => {
  it('forbids EMPLOYEE from financial summary', async () => {
    await expect(
      getFinancialSummary({
        storeId: STORE_ID,
        actorRole: UserRole.EMPLOYEE,
        from: '2026-08-01',
        to: '2026-08-31',
        now: NOW,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(prismaMock.sale.aggregate).not.toHaveBeenCalled();
  });

  it('forbids EMPLOYEE from expense analytics', async () => {
    await expect(
      getExpenseAnalytics({
        storeId: STORE_ID,
        actorRole: UserRole.EMPLOYEE,
        from: '2026-08-01',
        to: '2026-08-31',
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('date range boundaries', () => {
  it('includes the end calendar day via a half-open exclusive to', () => {
    const range = resolveAnalyticsRangeForTests(
      DateRangePreset.CUSTOM,
      '2026-08-01',
      '2026-08-31',
      'Asia/Tashkent',
      NOW,
    );

    expect(range.from.toISOString()).toBe('2026-07-31T19:00:00.000Z');
    // 1 Sep 00:00 Tashkent = 31 Aug 19:00 UTC — end day 31 Aug is included.
    expect(range.to.toISOString()).toBe('2026-08-31T19:00:00.000Z');
  });

  it('builds a previous period of equal length', () => {
    const range = resolveAnalyticsRangeForTests(
      DateRangePreset.CUSTOM,
      '2026-08-01',
      '2026-08-31',
      'Asia/Tashkent',
      NOW,
    );
    const previous = previousEquivalentRange(range);
    expect(previous.to.toISOString()).toBe(range.from.toISOString());
    expect(previous.to.getTime() - previous.from.getTime()).toBe(
      range.to.getTime() - range.from.getTime(),
    );
  });
});

describe('getFinancialSummary', () => {
  it('returns zeros for an empty period', async () => {
    const summary = await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(summary.metrics).toMatchObject({
      revenue: 0,
      cashCollected: 0,
      remainingReceivables: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      expenseCount: 0,
      salesCount: 0,
    });
    expect(summary.previousPeriod).toBeNull();
  });

  it('computes revenue, COGS, gross profit, operating expenses and net profit', async () => {
    prismaMock.sale.aggregate.mockResolvedValue({
      _sum: {
        totalSalePrice: 9_500_000n,
        totalCostPrice: 7_000_000n,
        grossProfit: 2_500_000n,
        netProfit: 2_500_000n,
        remainingAmount: 7_500_000n,
      },
      _count: { _all: 1 },
    });
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 2_000_000n } });
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: { amount: 2_100_000n },
      _count: { _all: 3 },
    });

    const summary = await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(summary.metrics.revenue).toBe(9_500_000);
    expect(summary.metrics.costOfGoodsSold).toBe(7_000_000);
    expect(summary.metrics.grossProfit).toBe(2_500_000);
    expect(summary.metrics.operatingExpenses).toBe(2_100_000);
    expect(summary.metrics.netProfit).toBe(400_000);
    expect(summary.metrics.cashCollected).toBe(2_000_000);
    expect(summary.metrics.remainingReceivables).toBe(7_500_000);
    expect(summary.metrics.expenseCount).toBe(3);
    expect(summary.metrics.salesCount).toBe(1);
  });

  it('keeps revenue distinct from cash collected', async () => {
    prismaMock.sale.aggregate.mockResolvedValue({
      _sum: {
        totalSalePrice: 9_500_000n,
        totalCostPrice: 7_000_000n,
        grossProfit: 2_500_000n,
        netProfit: 2_400_000n,
        remainingAmount: 7_500_000n,
      },
      _count: { _all: 1 },
    });
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 2_000_000n } });

    const summary = await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(summary.metrics.revenue).toBe(9_500_000);
    expect(summary.metrics.cashCollected).toBe(2_000_000);
    expect(summary.metrics.revenue).not.toBe(summary.metrics.cashCollected);
    expect(summary.metrics.additionalCosts).toBe(100_000);
    expect(summary.metrics.saleNetProfit).toBe(2_400_000);
  });

  it('scopes every aggregate to the session store', async () => {
    await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    for (const call of [
      ...prismaMock.sale.aggregate.mock.calls,
      ...prismaMock.payment.aggregate.mock.calls,
      ...prismaMock.expense.aggregate.mock.calls,
    ]) {
      expect(call[0].where.storeId).toBe(STORE_ID);
      expect(call[0].where.storeId).not.toBe(OTHER_STORE);
    }
  });

  it('uses BigInt money sums from Prisma without floating point', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: { amount: 850_000n },
      _count: { _all: 1 },
    });

    const summary = await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-09',
      to: '2026-08-09',
      now: NOW,
    });

    expect(Number.isInteger(summary.metrics.operatingExpenses)).toBe(true);
    expect(summary.metrics.operatingExpenses).toBe(850_000);
  });

  it('compares against the previous period and returns null change when previous is zero', async () => {
    prismaMock.sale.aggregate
      .mockResolvedValueOnce({
        _sum: {
          totalSalePrice: 10_000_000n,
          totalCostPrice: 6_000_000n,
          grossProfit: 4_000_000n,
          netProfit: 3_500_000n,
          remainingAmount: 0n,
        },
        _count: { _all: 2 },
      })
      .mockResolvedValueOnce(emptySaleAggregate());

    prismaMock.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 5_000_000n } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    prismaMock.expense.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1_000_000n }, _count: { _all: 2 } })
      .mockResolvedValueOnce({ _sum: { amount: null }, _count: { _all: 0 } });

    const summary = await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      comparison: 'previous',
      now: NOW,
    });

    expect(summary.previousPeriod).not.toBeNull();
    expect(summary.previousPeriod!.revenue).toBe(0);
    expect(summary.previousPeriod!.changes.revenue.changePercent).toBeNull();
    expect(summary.previousPeriod!.changes.netProfit.current).toBe(3_000_000);
    expect(summary.previousPeriod!.changes.netProfit.previous).toBe(0);
    expect(summary.previousPeriod!.changes.netProfit.changePercent).toBeNull();
  });

  it('filters sales with REVENUE statuses only', async () => {
    await getFinancialSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(prismaMock.sale.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['ACTIVE', 'COMPLETED'] },
        }),
      }),
    );
  });
});

describe('getExpenseAnalytics', () => {
  it('aggregates total expenses and count', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: { amount: 2_100_000n },
      _count: { _all: 3 },
    });

    const analytics = await getExpenseAnalytics({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(analytics.total).toBe(2_100_000);
    expect(analytics.count).toBe(3);
  });

  it('aggregates expenses by category with percentages', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: { amount: 2_100_000n },
      _count: { _all: 3 },
    });
    prismaMock.expense.groupBy.mockResolvedValue([
      { categoryId: 'cat_elektr', _sum: { amount: 1_600_000n }, _count: { _all: 2 } },
      { categoryId: 'cat_other', _sum: { amount: 500_000n }, _count: { _all: 1 } },
    ]);
    prismaMock.expenseCategory.findMany.mockResolvedValue([
      { id: 'cat_elektr', name: 'Elektr' },
      { id: 'cat_other', name: 'Boshqa' },
    ]);

    const analytics = await getExpenseAnalytics({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(analytics.byCategory).toEqual([
      {
        categoryId: 'cat_elektr',
        categoryName: 'Elektr',
        amount: 1_600_000,
        percentage: 76.2,
        count: 2,
      },
      {
        categoryId: 'cat_other',
        categoryName: 'Boshqa',
        amount: 500_000,
        percentage: 23.8,
        count: 1,
      },
    ]);
  });

  it('builds a daily expense trend from expenseDate', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: { amount: 2_050_000n },
      _count: { _all: 2 },
    });
    prismaMock.expense.findMany.mockResolvedValue([
      { expenseDate: new Date('2026-08-08T12:00:00.000Z'), amount: 1_350_000n },
      { expenseDate: new Date('2026-08-09T12:00:00.000Z'), amount: 700_000n },
    ]);

    const analytics = await getExpenseAnalytics({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-08',
      to: '2026-08-09',
      now: NOW,
    });

    const nonZero = analytics.dailyTrend.filter((point) => point.amount > 0);
    expect(nonZero).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-08-08', amount: 1_350_000 }),
        expect.objectContaining({ date: '2026-08-09', amount: 700_000 }),
      ]),
    );
  });

  it('applies optional categoryId filter to all expense queries', async () => {
    await getExpenseAnalytics({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      now: NOW,
    });

    expect(prismaMock.expense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: STORE_ID,
          categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        }),
      }),
    );
    expect(prismaMock.expense.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' }),
      }),
    );
  });

  it('filters expenses by expenseDate half-open range', async () => {
    await getExpenseAnalytics({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    const where = prismaMock.expense.aggregate.mock.calls[0]![0].where;
    expect(where.expenseDate.gte.toISOString()).toBe('2026-07-31T19:00:00.000Z');
    expect(where.expenseDate.lt.toISOString()).toBe('2026-08-31T19:00:00.000Z');
  });
});

describe('financial trend', () => {
  it('forbids EMPLOYEE from financial trend', async () => {
    await expect(
      getFinancialTrend({
        storeId: STORE_ID,
        actorRole: UserRole.EMPLOYEE,
        from: '2026-08-01',
        to: '2026-08-31',
        now: NOW,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('buckets sales and expenses with Step 3 net profit', () => {
    const range = resolveAnalyticsRangeForTests(
      DateRangePreset.CUSTOM,
      '2026-08-01',
      '2026-08-03',
      'Asia/Tashkent',
      NOW,
    );

    const points = buildFinancialTrendPoints(
      range,
      [
        {
          saleDate: new Date('2026-07-31T20:00:00.000Z'), // 1 Aug Tashkent
          revenue: 9_500_000,
          cogs: 7_000_000,
          grossProfit: 2_500_000,
        },
        {
          saleDate: new Date('2026-08-01T20:00:00.000Z'), // 2 Aug
          revenue: 1_000_000,
          cogs: 400_000,
          grossProfit: 600_000,
        },
      ],
      [
        {
          expenseDate: new Date('2026-07-31T21:00:00.000Z'), // 1 Aug
          amount: 500_000,
        },
      ],
    );

    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({
      date: '2026-08-01',
      revenue: 9_500_000,
      cogs: 7_000_000,
      grossProfit: 2_500_000,
      operatingExpenses: 500_000,
      netProfit: 2_000_000,
    });
    expect(points[1]).toMatchObject({
      date: '2026-08-02',
      revenue: 1_000_000,
      netProfit: 600_000,
    });
    expect(points[2]).toMatchObject({
      date: '2026-08-03',
      revenue: 0,
      netProfit: 0,
    });
  });

  it('returns trend totals that reconcile with bucket sums', async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        saleDate: new Date('2026-07-31T20:00:00.000Z'),
        totalSalePrice: 20_450_000n,
        totalCostPrice: 14_900_000n,
        grossProfit: 5_550_000n,
      },
    ]);
    prismaMock.expense.findMany.mockResolvedValue([
      { expenseDate: new Date('2026-07-31T21:00:00.000Z'), amount: 2_100_000n },
    ]);

    const trend = await getFinancialTrend({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      from: '2026-08-01',
      to: '2026-08-31',
      now: NOW,
    });

    expect(trend.granularity).toBe('DAY');
    expect(trend.totals).toEqual({
      revenue: 20_450_000,
      cogs: 14_900_000,
      grossProfit: 5_550_000,
      operatingExpenses: 2_100_000,
      netProfit: 3_450_000,
    });
    expect(trend.points.reduce((sum, p) => sum + p.revenue, 0)).toBe(20_450_000);
    expect(trend.points.reduce((sum, p) => sum + p.netProfit, 0)).toBe(3_450_000);
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: STORE_ID }),
      }),
    );
  });

  it('uses monthly buckets for THIS_YEAR', async () => {
    const trend = await getFinancialTrend({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      preset: DateRangePreset.THIS_YEAR,
      now: NOW,
    });

    expect(trend.granularity).toBe('MONTH');
    expect(trend.points).toHaveLength(12);
  });
});
