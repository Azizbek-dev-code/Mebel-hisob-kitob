import {
  DateRangePreset,
  UserRole,
  moneySharePercent,
  periodNetProfit,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  analyticsMock,
  reportsRepoMock,
  debtRepoMock,
  inventoryRepoMock,
  purchasingRepoMock,
} = vi.hoisted(() => ({
  analyticsMock: {
    assertCanAccessAnalytics: vi.fn(),
    getFinancialSummary: vi.fn(),
    getFinancialTrend: vi.fn(),
    getExpenseAnalytics: vi.fn(),
  },
  reportsRepoMock: {
    aggregateSettledCompensation: vi.fn(),
    countCancelledSales: vi.fn(),
    aggregateCancelledExpenses: vi.fn(),
    aggregateRetainedFeesOnCancelledDocuments: vi.fn(),
    sumDiscountAmount: vi.fn(),
    groupPaymentsByMethod: vi.fn(),
    sumWorkerPayments: vi.fn(),
    groupSettledCompensationByWorker: vi.fn(),
    aggregateSalesBySellerDetailed: vi.fn(),
    findUserNames: vi.fn(),
    aggregateSaleItemsByProduct: vi.fn(),
    aggregateSaleItemsByCategory: vi.fn(),
    aggregateSalesByDay: vi.fn(),
    aggregateInventoryMovements: vi.fn(),
  },
  debtRepoMock: {
    summarizeDebts: vi.fn(),
    listDebts: vi.fn(),
  },
  inventoryRepoMock: {
    summarizeInventory: vi.fn(),
  },
  purchasingRepoMock: {
    sumSupplierPaymentsInPeriod: vi.fn(),
    getReportsSupplierPayablesData: vi.fn(),
  },
}));

vi.mock('./analytics.service.js', () => analyticsMock);
vi.mock('../repositories/reports.repository.js', () => reportsRepoMock);
vi.mock('../repositories/debt.repository.js', () => debtRepoMock);
vi.mock('../repositories/inventory.repository.js', () => inventoryRepoMock);
vi.mock('../repositories/purchasing.repository.js', () => purchasingRepoMock);

const { getReportsSummary, getReportsCashFlow, getReportsSales } = await import(
  './reports.service.js'
);

const STORE_ID = 'store_1';
const PERIOD = {
  from: '2026-08-01',
  to: '2026-08-31',
  fromInstant: '2026-07-31T19:00:00.000Z',
  toInstant: '2026-08-31T19:00:00.000Z',
  label: 'August 2026',
  timeZone: 'Asia/Tashkent',
};

function financialSummary(overrides: Record<string, unknown> = {}) {
  return {
    period: PERIOD,
    generatedAt: '2026-08-18T10:00:00.000Z',
    metrics: {
      revenue: 10_000_000,
      cashCollected: 8_000_000,
      remainingReceivables: 2_000_000,
      costOfGoodsSold: 6_000_000,
      grossProfit: 4_000_000,
      additionalCosts: 200_000,
      saleNetProfit: 3_800_000,
      operatingExpenses: 500_000,
      netProfit: periodNetProfit(4_000_000, 500_000),
      expenseCount: 3,
      salesCount: 5,
    },
    previousPeriod: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  analyticsMock.assertCanAccessAnalytics.mockImplementation((role: string) => {
    if (role !== UserRole.ADMIN && role !== UserRole.PLATFORM_ADMIN) {
      const error = Object.assign(new Error('forbidden'), { statusCode: 403 });
      throw error;
    }
  });
  analyticsMock.getFinancialSummary.mockResolvedValue(financialSummary());
  reportsRepoMock.aggregateSettledCompensation.mockResolvedValue({ total: 150_000, count: 2 });
  reportsRepoMock.countCancelledSales.mockResolvedValue(1);
  reportsRepoMock.aggregateCancelledExpenses.mockResolvedValue({ count: 1, amount: 50_000 });
  reportsRepoMock.aggregateRetainedFeesOnCancelledDocuments.mockResolvedValue({
    total: 430_000,
    count: 2,
  });
  debtRepoMock.summarizeDebts.mockResolvedValue({
    totalOutstanding: 2_000_000,
    customersInDebt: 2,
    openSaleCount: 2,
    overdueInstallmentCount: 0,
    overdueAmount: 0,
  });
  reportsRepoMock.groupPaymentsByMethod.mockResolvedValue([
    { method: 'CASH', amount: 5_000_000 },
    { method: 'CARD', amount: 3_000_000 },
  ]);
  reportsRepoMock.sumWorkerPayments.mockResolvedValue(100_000);
  purchasingRepoMock.sumSupplierPaymentsInPeriod.mockResolvedValue(250_000);
  purchasingRepoMock.getReportsSupplierPayablesData.mockResolvedValue({
    summary: {
      totalPurchases: 5_000_000,
      totalPaid: 2_000_000,
      totalOutstanding: 3_000_000,
      suppliersInDebt: 1,
      openPurchaseCount: 2,
    },
    items: [],
  });
  reportsRepoMock.sumDiscountAmount.mockResolvedValue(200_000);
  reportsRepoMock.aggregateSalesBySellerDetailed.mockResolvedValue([
    {
      sellerId: 'seller_1',
      salesCount: 5,
      revenue: 10_000_000,
      cogs: 6_000_000,
      grossProfit: 4_000_000,
      discounts: 200_000,
      customerCount: 4,
    },
  ]);
  reportsRepoMock.findUserNames.mockResolvedValue(new Map([['seller_1', 'Ali']]));
  reportsRepoMock.aggregateSaleItemsByProduct.mockResolvedValue([]);
  reportsRepoMock.aggregateSaleItemsByCategory.mockResolvedValue([]);
  reportsRepoMock.aggregateSalesByDay.mockResolvedValue([]);
  reportsRepoMock.groupSettledCompensationByWorker.mockResolvedValue([
    { workerId: 'seller_1', amount: 150_000, count: 2 },
  ]);
});

describe('reports.service accounting rules', () => {
  it('includes settled commission separately and does not fold it into netProfit', async () => {
    const summary = await getReportsSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      preset: DateRangePreset.THIS_MONTH,
    });

    expect(summary.financial.metrics.netProfit).toBe(3_500_000);
    expect(summary.extras.settledCompensation).toBe(150_000);
    expect(summary.extras.compensationInNetProfit).toBe(false);
    expect(summary.extras.cancelledSalesCount).toBe(1);
  });

  it('surfaces completed worker fees kept on cancelled documents without touching netProfit', async () => {
    const summary = await getReportsSummary({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      preset: DateRangePreset.THIS_MONTH,
    });

    expect(summary.extras.retainedWorkerFeesOnCancelled).toBe(430_000);
    expect(summary.extras.retainedWorkerFeesOnCancelledCount).toBe(2);
    // Ledger COMMISSION rows are never subtracted from P&L net profit again.
    expect(summary.financial.metrics.netProfit).toBe(3_500_000);
  });

  it('cash flow sums payment methods and treats commission as non-cash', async () => {
    const cash = await getReportsCashFlow({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      preset: DateRangePreset.THIS_MONTH,
    });

    expect(cash.inflow.total).toBe(8_000_000);
    expect(cash.outflow.operatingExpenses).toBe(500_000);
    expect(cash.outflow.workerPayments).toBe(100_000);
    expect(cash.outflow.supplierPayments).toBe(250_000);
    expect(cash.outflow.total).toBe(850_000);
    expect(cash.netCashFlow).toBe(7_150_000);
    expect(cash.openingBalanceSupported).toBe(false);
  });

  it('sales report attaches settled compensation per seller once', async () => {
    const sales = await getReportsSales({
      storeId: STORE_ID,
      actorRole: UserRole.ADMIN,
      preset: DateRangePreset.THIS_MONTH,
    });

    expect(sales.bySeller[0]?.settledCompensation).toBe(150_000);
    expect(sales.totals.cancelledSalesCount).toBe(1);
    expect(sales.totals.grossMarginPercent).toBe(moneySharePercent(4_000_000, 10_000_000));
  });

  it('forbids employees', async () => {
    await expect(
      getReportsSummary({
        storeId: STORE_ID,
        actorRole: UserRole.EMPLOYEE,
        preset: DateRangePreset.THIS_MONTH,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
