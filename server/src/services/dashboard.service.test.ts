import { DateRangePreset, SalePaymentStatus, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    store: { findUnique: vi.fn() },
    sale: { aggregate: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    expense: { aggregate: vi.fn() },
    installmentPayment: { aggregate: vi.fn() },
    customer: { findMany: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
  },
}));

// The service is exercised through the real repository so that the store scoping
// written into each `where` is covered too — mocking the repository away would
// leave the one rule that keeps stores apart untested.
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

const { getDashboardSummary } = await import('./dashboard.service.js');

/** 07:00 on Saturday 8 August 2026 in Tashkent, which is still 7 August in UTC. */
const NOW = new Date('2026-08-08T02:00:00.000Z');
const TODAY_START = '2026-08-07T19:00:00.000Z';
const MONTH_START = '2026-07-31T19:00:00.000Z';

const STORE = {
  id: 'store_1',
  name: 'Mebel Savdo',
  timezone: 'Asia/Tashkent',
  currency: 'UZS',
};

function emptySaleAggregate() {
  return {
    _sum: { totalSalePrice: null, totalCostPrice: null, grossProfit: null, netProfit: null },
    _count: { _all: 0 },
  };
}

function summaryFor(preset: DateRangePreset = DateRangePreset.THIS_MONTH, storeId = 'store_1') {
  return getDashboardSummary({ storeId, preset, now: NOW });
}

/**
 * `sale.findMany` serves two very different reads — the chart series and the
 * recent sales list — so the mock answers them by the `take` that only the
 * second one sets.
 */
function mockSaleFindMany(rows: { series?: unknown[]; recent?: unknown[] }) {
  prismaMock.sale.findMany.mockImplementation((args: Record<string, never>) => {
    const query = args as unknown as { take?: number };
    return Promise.resolve((query.take ? rows.recent : rows.series) ?? []);
  });
}

/** Every `where` the summary sent to the database, whichever model it targeted. */
function everyWhereClause(): Record<string, unknown>[] {
  return [
    ...prismaMock.sale.aggregate.mock.calls,
    ...prismaMock.sale.findMany.mock.calls,
    ...prismaMock.sale.groupBy.mock.calls,
    ...prismaMock.expense.aggregate.mock.calls,
    ...prismaMock.installmentPayment.aggregate.mock.calls,
    ...prismaMock.customer.findMany.mock.calls,
    ...prismaMock.user.findMany.mock.calls,
    ...prismaMock.user.count.mock.calls,
  ].map((call) => call[0].where);
}

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.store.findUnique.mockResolvedValue(STORE);
  prismaMock.sale.aggregate.mockResolvedValue(emptySaleAggregate());
  prismaMock.sale.findMany.mockResolvedValue([]);
  prismaMock.sale.groupBy.mockResolvedValue([]);
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
  prismaMock.installmentPayment.aggregate.mockResolvedValue({
    _sum: { remainingAmount: null },
    _count: { _all: 0 },
  });
  prismaMock.customer.findMany.mockResolvedValue([]);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(0);
});

describe('an empty database', () => {
  it('reports zero rather than leaving a figure undefined', async () => {
    const summary = await summaryFor();

    expect(summary.kpis).toEqual({
      todayRevenue: 0,
      todaySalesCount: 0,
      monthRevenue: 0,
      monthSalesCount: 0,
      periodRevenue: 0,
      periodSalesCount: 0,
      outstandingDebt: 0,
      customersInDebt: 0,
    });
    expect(summary.financials).toEqual({
      revenue: 0,
      costOfGoods: 0,
      grossProfit: 0,
      additionalCosts: 0,
      netProfit: 0,
      expenses: 0,
      netResult: 0,
    });
  });

  it('still returns a full set of empty chart buckets', async () => {
    const summary = await summaryFor();

    expect(summary.salesSeries).toHaveLength(31);
    expect(summary.salesSeries.every((point) => point.revenue === 0)).toBe(true);
    expect(summary.salesSeries[0]?.label).toBe('1 Aug');
  });

  it('returns empty collections, not fabricated rows', async () => {
    const summary = await summaryFor();

    expect(summary.recentSales).toEqual([]);
    expect(summary.debt.topDebtors).toEqual([]);
    expect(summary.workforce.sellers).toEqual([]);
    expect(summary.debt.overdueInstallmentCount).toBe(0);
  });
});

describe('period totals', () => {
  beforeEach(() => {
    prismaMock.sale.aggregate.mockImplementation((args: Record<string, never>) => {
      const query = args as unknown as {
        _sum: Record<string, boolean>;
        where: { saleDate: { gte: Date } };
      };

      // Only the period aggregate asks for profit; the two fixed cards do not.
      if (query._sum.grossProfit) {
        return Promise.resolve({
          _sum: {
            totalSalePrice: 40_000_000n,
            totalCostPrice: 28_000_000n,
            grossProfit: 12_000_000n,
            netProfit: 9_500_000n,
          },
          _count: { _all: 4 },
        });
      }

      const from = query.where.saleDate.gte.toISOString();
      if (from === TODAY_START) {
        return Promise.resolve({ _sum: { totalSalePrice: 6_000_000n }, _count: { _all: 1 } });
      }
      return Promise.resolve({ _sum: { totalSalePrice: 40_000_000n }, _count: { _all: 4 } });
    });

    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 3_000_000n } });
  });

  it('uses the totals the sale already stores instead of recomputing them', async () => {
    const summary = await summaryFor();

    expect(summary.financials).toEqual({
      revenue: 40_000_000,
      costOfGoods: 28_000_000,
      grossProfit: 12_000_000,
      // gross profit less net profit is exactly the per-sale costs.
      additionalCosts: 2_500_000,
      netProfit: 9_500_000,
      expenses: 3_000_000,
      netResult: 6_500_000,
    });
  });

  it('keeps today and this month on their own boundaries', async () => {
    const summary = await summaryFor(DateRangePreset.THIS_YEAR);

    expect(summary.kpis.todayRevenue).toBe(6_000_000);
    expect(summary.kpis.todaySalesCount).toBe(1);
    expect(summary.kpis.monthRevenue).toBe(40_000_000);
    expect(summary.kpis.periodSalesCount).toBe(4);
  });

  it('reports a loss rather than flooring the net result at zero', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 15_000_000n } });

    const summary = await summaryFor();

    expect(summary.financials.netResult).toBe(-5_500_000);
  });
});

describe('period filtering', () => {
  it('scopes the query to the store\u2019s own day for today', async () => {
    await summaryFor(DateRangePreset.TODAY);

    const periodCall = prismaMock.sale.findMany.mock.calls[0]?.[0];
    expect(periodCall.where.saleDate.gte.toISOString()).toBe(TODAY_START);
    expect(periodCall.where.saleDate.lt.toISOString()).toBe('2026-08-08T19:00:00.000Z');
  });

  it('widens the same query for a month', async () => {
    await summaryFor(DateRangePreset.THIS_MONTH);

    const periodCall = prismaMock.sale.findMany.mock.calls[0]?.[0];
    expect(periodCall.where.saleDate.gte.toISOString()).toBe(MONTH_START);
    expect(periodCall.where.saleDate.lt.toISOString()).toBe('2026-08-31T19:00:00.000Z');
  });

  it('reads a custom period as inclusive calendar dates', async () => {
    await getDashboardSummary({
      storeId: 'store_1',
      preset: DateRangePreset.CUSTOM,
      from: '2026-08-03',
      to: '2026-08-05',
      now: NOW,
    });

    const periodCall = prismaMock.sale.findMany.mock.calls[0]?.[0];
    expect(periodCall.where.saleDate.gte.toISOString()).toBe('2026-08-02T19:00:00.000Z');
    expect(periodCall.where.saleDate.lt.toISOString()).toBe('2026-08-05T19:00:00.000Z');
  });

  it('never counts a draft or a cancelled sale', async () => {
    await summaryFor();

    const periodCall = prismaMock.sale.findMany.mock.calls[0]?.[0];
    expect(periodCall.where.status).toEqual({ in: ['ACTIVE', 'COMPLETED'] });
  });
});

describe('store isolation', () => {
  it('scopes every query to the store it was asked for', async () => {
    await summaryFor(DateRangePreset.THIS_MONTH, 'store_1');

    const clauses = everyWhereClause();
    expect(clauses.length).toBeGreaterThan(5);
    clauses.forEach((where) => expect(where).toMatchObject({ storeId: 'store_1' }));
    expect(prismaMock.store.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'store_1' } }),
    );
  });

  it('carries a different store through to every query', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ ...STORE, id: 'store_2' });

    await summaryFor(DateRangePreset.THIS_MONTH, 'store_2');

    const clauses = everyWhereClause();
    expect(clauses.length).toBeGreaterThan(5);
    clauses.forEach((where) => {
      expect(where).toMatchObject({ storeId: 'store_2' });
      expect(where.storeId).not.toBe('store_1');
    });
  });

  it('drops a debtor whose customer is not in this store', async () => {
    prismaMock.sale.groupBy.mockImplementation((args: Record<string, never>) => {
      const query = args as unknown as { by: string[] };
      if (query.by[0] !== 'customerId') return Promise.resolve([]);

      return Promise.resolve([
        { customerId: 'customer_1', _sum: { remainingAmount: 5_000_000n }, _count: { _all: 2 } },
        { customerId: 'customer_other', _sum: { remainingAmount: 9_000_000n }, _count: { _all: 1 } },
      ]);
    });
    // The store-scoped lookup only returns the customer that belongs here.
    prismaMock.customer.findMany.mockResolvedValue([
      { id: 'customer_1', firstName: 'Anvar', lastName: 'Aliyev', phone: '+998901234567' },
    ]);

    const summary = await summaryFor();

    expect(summary.debt.topDebtors).toHaveLength(1);
    expect(summary.debt.topDebtors[0]?.customerName).toBe('Anvar Aliyev');
  });

  it('refuses to build a summary for a store that does not exist', async () => {
    prismaMock.store.findUnique.mockResolvedValue(null);

    await expect(summaryFor()).rejects.toBeInstanceOf(ApiError);
    await expect(summaryFor()).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('the sales chart', () => {
  it('puts each sale in the bucket of the store day it was made', async () => {
    mockSaleFindMany({
      series: [
        // 10:00 on 1 August in Tashkent.
        {
          saleDate: new Date('2026-08-01T05:00:00.000Z'),
          totalSalePrice: 4_000_000n,
          grossProfit: 1_000_000n,
        },
        // 01:30 on 8 August in Tashkent, although UTC still reads the 7th.
        {
          saleDate: new Date('2026-08-07T20:30:00.000Z'),
          totalSalePrice: 6_000_000n,
          grossProfit: 1_500_000n,
        },
        {
          saleDate: new Date('2026-08-07T21:00:00.000Z'),
          totalSalePrice: 1_000_000n,
          grossProfit: 250_000n,
        },
      ],
    });

    const summary = await summaryFor();

    expect(summary.salesSeries[0]).toMatchObject({ label: '1 Aug', revenue: 4_000_000, salesCount: 1 });
    expect(summary.salesSeries[7]).toMatchObject({ label: '8 Aug', revenue: 7_000_000, salesCount: 2 });
    expect(summary.salesSeries[7]?.grossProfit).toBe(1_750_000);
    expect(summary.salesSeries[1]?.revenue).toBe(0);
  });

  it('totals the buckets back to the period revenue', async () => {
    mockSaleFindMany({
      series: [
        {
          saleDate: new Date('2026-08-01T05:00:00.000Z'),
          totalSalePrice: 4_000_000n,
          grossProfit: 0n,
        },
        {
          saleDate: new Date('2026-08-07T20:30:00.000Z'),
          totalSalePrice: 6_000_000n,
          grossProfit: 0n,
        },
      ],
    });

    const summary = await summaryFor();
    const charted = summary.salesSeries.reduce((total, point) => total + point.revenue, 0);

    expect(charted).toBe(10_000_000);
  });
});

describe('recent sales', () => {
  it('names the customer, the goods and how much is still owed', async () => {
    mockSaleFindMany({
      recent: [
        {
          id: 'sale_1',
          saleNumber: 1042,
          saleDate: new Date('2026-08-07T20:30:00.000Z'),
          totalSalePrice: 9_000_000n,
          paidAmount: 3_000_000n,
          remainingAmount: 6_000_000n,
          paymentStatus: SalePaymentStatus.PARTIALLY_PAID,
          customer: { firstName: 'Anvar', lastName: 'Aliyev' },
          seller: { fullName: 'Vali Sotuvchi' },
          items: [{ productName: 'Bedroom Set "Milano"' }],
          _count: { items: 3 },
        },
      ],
    });

    const summary = await summaryFor();

    expect(summary.recentSales[0]).toEqual({
      id: 'sale_1',
      saleNumber: 1042,
      saleDate: '2026-08-07T20:30:00.000Z',
      customerName: 'Anvar Aliyev',
      productSummary: 'Bedroom Set "Milano" +2',
      itemCount: 3,
      sellerName: 'Vali Sotuvchi',
      totalSalePrice: 9_000_000,
      paidAmount: 3_000_000,
      remainingAmount: 6_000_000,
      paymentStatus: 'PARTIALLY_PAID',
      deliveryDueDate: null,
    });
  });

  it('survives a sale whose seller account has been removed', async () => {
    mockSaleFindMany({
      recent: [
        {
          id: 'sale_2',
          saleNumber: 7,
          saleDate: new Date('2026-08-07T20:30:00.000Z'),
          totalSalePrice: 1_000_000n,
          paidAmount: 1_000_000n,
          remainingAmount: 0n,
          paymentStatus: SalePaymentStatus.PAID,
          customer: { firstName: 'Dilnoza', lastName: 'Karimova' },
          seller: null,
          items: [],
          _count: { items: 0 },
        },
      ],
    });

    const summary = await summaryFor();

    expect(summary.recentSales[0]?.sellerName).toBeNull();
    expect(summary.recentSales[0]?.productSummary).toBe('No items');
  });
});

describe('debt and workforce', () => {
  it('adds up outstanding balances and ranks the largest debtors', async () => {
    prismaMock.sale.groupBy.mockImplementation((args: Record<string, never>) => {
      const query = args as unknown as { by: string[] };
      if (query.by[0] !== 'customerId') return Promise.resolve([]);

      return Promise.resolve([
        { customerId: 'customer_1', _sum: { remainingAmount: 2_000_000n }, _count: { _all: 1 } },
        { customerId: 'customer_2', _sum: { remainingAmount: 8_000_000n }, _count: { _all: 3 } },
      ]);
    });
    prismaMock.customer.findMany.mockResolvedValue([
      { id: 'customer_1', firstName: 'Anvar', lastName: 'Aliyev', phone: '+998901234567' },
      { id: 'customer_2', firstName: 'Bekzod', lastName: 'Rahimov', phone: '+998935556677' },
    ]);
    prismaMock.installmentPayment.aggregate.mockResolvedValue({
      _sum: { remainingAmount: 1_200_000n },
      _count: { _all: 2 },
    });

    const summary = await summaryFor();

    expect(summary.debt.totalOutstanding).toBe(10_000_000);
    expect(summary.debt.customersInDebt).toBe(2);
    expect(summary.debt.topDebtors.map((debtor) => debtor.customerName)).toEqual([
      'Bekzod Rahimov',
      'Anvar Aliyev',
    ]);
    expect(summary.debt.overdueAmount).toBe(1_200_000);
    expect(summary.kpis.outstandingDebt).toBe(10_000_000);
  });

  it('credits sellers by revenue and counts the sales nobody is credited with', async () => {
    prismaMock.sale.groupBy.mockImplementation((args: Record<string, never>) => {
      const query = args as unknown as { by: string[] };
      if (query.by[0] !== 'sellerId') return Promise.resolve([]);

      return Promise.resolve([
        { sellerId: 'user_1', _sum: { totalSalePrice: 5_000_000n }, _count: { _all: 2 } },
        { sellerId: 'user_2', _sum: { totalSalePrice: 12_000_000n }, _count: { _all: 3 } },
        { sellerId: null, _sum: { totalSalePrice: 900_000n }, _count: { _all: 1 } },
      ]);
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'user_1', fullName: 'Vali Sotuvchi', role: UserRole.CASHIER },
      { id: 'user_2', fullName: 'Store Administrator', role: UserRole.ADMIN },
    ]);
    prismaMock.user.count.mockResolvedValue(4);

    const summary = await summaryFor();

    expect(summary.workforce.activeStaff).toBe(4);
    expect(summary.workforce.unassignedSalesCount).toBe(1);
    expect(summary.workforce.sellers.map((seller) => seller.fullName)).toEqual([
      'Store Administrator',
      'Vali Sotuvchi',
    ]);
    expect(summary.workforce.sellers[0]?.revenue).toBe(12_000_000);
  });
});

describe('the response envelope', () => {
  it('describes the period it answered for', async () => {
    const summary = await summaryFor(DateRangePreset.THIS_WEEK);

    expect(summary.range).toEqual({
      preset: DateRangePreset.THIS_WEEK,
      from: '2026-08-02T19:00:00.000Z',
      to: '2026-08-09T19:00:00.000Z',
      granularity: 'DAY',
      label: '3 – 9 August 2026',
      timeZone: 'Asia/Tashkent',
    });
    expect(summary.store).toEqual({
      id: 'store_1',
      name: 'Mebel Savdo',
      timeZone: 'Asia/Tashkent',
      currency: 'UZS',
    });
  });

  it('never lets a bigint reach the response', async () => {
    prismaMock.sale.aggregate.mockResolvedValue({
      _sum: {
        totalSalePrice: 40_000_000n,
        totalCostPrice: 28_000_000n,
        grossProfit: 12_000_000n,
        netProfit: 9_500_000n,
      },
      _count: { _all: 4 },
    });

    const summary = await summaryFor();

    expect(() => JSON.stringify(summary)).not.toThrow();
    expect(typeof summary.financials.revenue).toBe('number');
  });
});
