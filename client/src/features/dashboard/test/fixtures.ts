import type { DashboardSummary } from '@furniture-erp/shared';
import { DateRangePreset, SalePaymentStatus, UserRole } from '@furniture-erp/shared';

/** An empty but fully-shaped summary — what a seeded store with no sales returns. */
export const EMPTY_SUMMARY: DashboardSummary = {
  store: {
    id: 'store_1',
    name: 'Mebel Savdo',
    timeZone: 'Asia/Tashkent',
    currency: 'UZS',
  },
  range: {
    preset: DateRangePreset.THIS_MONTH,
    from: '2026-07-31T19:00:00.000Z',
    to: '2026-08-31T19:00:00.000Z',
    granularity: 'DAY',
    label: 'August 2026',
    timeZone: 'Asia/Tashkent',
  },
  generatedAt: '2026-08-08T02:00:00.000Z',
  kpis: {
    todayRevenue: 0,
    todaySalesCount: 0,
    monthRevenue: 0,
    monthSalesCount: 0,
    periodRevenue: 0,
    periodSalesCount: 0,
    outstandingDebt: 0,
    customersInDebt: 0,
  },
  financials: {
    revenue: 0,
    costOfGoods: 0,
    grossProfit: 0,
    additionalCosts: 0,
    netProfit: 0,
    expenses: 0,
    netResult: 0,
  },
  salesSeries: Array.from({ length: 3 }, (_, index) => ({
    bucketStart: `2026-08-0${index + 1}T19:00:00.000Z`,
    label: `${index + 1} Aug`,
    revenue: 0,
    grossProfit: 0,
    salesCount: 0,
  })),
  recentSales: [],
  debt: {
    totalOutstanding: 0,
    customersInDebt: 0,
    overdueInstallmentCount: 0,
    overdueAmount: 0,
    topDebtors: [],
  },
  workforce: {
    activeStaff: 2,
    sellers: [],
    unassignedSalesCount: 0,
  },
};

/** A populated summary for rendering assertions that need non-zero figures. */
export const POPULATED_SUMMARY: DashboardSummary = {
  ...EMPTY_SUMMARY,
  kpis: {
    todayRevenue: 6_000_000,
    todaySalesCount: 1,
    monthRevenue: 40_000_000,
    monthSalesCount: 4,
    periodRevenue: 40_000_000,
    periodSalesCount: 4,
    outstandingDebt: 10_000_000,
    customersInDebt: 2,
  },
  financials: {
    revenue: 40_000_000,
    costOfGoods: 28_000_000,
    grossProfit: 12_000_000,
    additionalCosts: 2_500_000,
    netProfit: 9_500_000,
    expenses: 3_000_000,
    netResult: 6_500_000,
  },
  salesSeries: [
    {
      bucketStart: '2026-08-01T19:00:00.000Z',
      label: '1 Aug',
      revenue: 4_000_000,
      grossProfit: 1_000_000,
      salesCount: 1,
    },
    {
      bucketStart: '2026-08-07T19:00:00.000Z',
      label: '8 Aug',
      revenue: 7_000_000,
      grossProfit: 1_750_000,
      salesCount: 2,
    },
  ],
  recentSales: [
    {
      id: 'sale_1',
      saleNumber: 1042,
      saleDate: '2026-08-07T20:30:00.000Z',
      deliveryDueDate: null,
      customerName: 'Anvar Aliyev',
      productSummary: 'Bedroom Set "Milano" +2',
      itemCount: 3,
      sellerName: 'Vali Sotuvchi',
      totalSalePrice: 9_000_000,
      paidAmount: 3_000_000,
      remainingAmount: 6_000_000,
      paymentStatus: SalePaymentStatus.PARTIALLY_PAID,
    },
  ],
  debt: {
    totalOutstanding: 10_000_000,
    customersInDebt: 2,
    overdueInstallmentCount: 2,
    overdueAmount: 1_200_000,
    topDebtors: [
      {
        customerId: 'customer_2',
        customerName: 'Bekzod Rahimov',
        phone: '+998935556677',
        outstanding: 8_000_000,
        saleCount: 3,
      },
    ],
  },
  workforce: {
    activeStaff: 4,
    sellers: [
      {
        userId: 'user_2',
        fullName: 'Store Administrator',
        role: UserRole.ADMIN,
        salesCount: 3,
        revenue: 12_000_000,
      },
    ],
    unassignedSalesCount: 1,
  },
};
