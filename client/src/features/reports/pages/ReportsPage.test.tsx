import { DateRangePreset } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

const EMPTY_BUNDLE = {
  status: 200,
  body: {
    success: true,
    data: {
      reports: {
        summary: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          financial: {
            period: {
              from: '2026-08-01',
              to: '2026-08-31',
              fromInstant: '2026-07-31T19:00:00.000Z',
              toInstant: '2026-08-31T19:00:00.000Z',
              label: 'August 2026',
              timeZone: 'Asia/Tashkent',
            },
            generatedAt: '2026-08-18T10:00:00.000Z',
            metrics: {
              revenue: 10_000_000,
              cashCollected: 8_000_000,
              remainingReceivables: 2_000_000,
              costOfGoodsSold: 6_000_000,
              grossProfit: 4_000_000,
              additionalCosts: 0,
              saleNetProfit: 4_000_000,
              operatingExpenses: 500_000,
              netProfit: 3_500_000,
              expenseCount: 2,
              salesCount: 4,
            },
            previousPeriod: null,
          },
          extras: {
            settledCompensation: 100_000,
            settledCompensationCount: 1,
            cancelledSalesCount: 0,
            cancelledExpenseCount: 0,
            cancelledExpenseAmount: 0,
            debt: {
              totalOutstanding: 2_000_000,
              customersInDebt: 1,
              openSaleCount: 1,
              overdueInstallmentCount: 0,
              overdueAmount: 0,
            },
            compensationInNetProfit: false,
          },
          sources: {
            revenue: 'Sale.totalSalePrice (ACTIVE|COMPLETED)',
            cogs: 'Sale.totalCostPrice (ACTIVE|COMPLETED)',
            grossProfit: 'Sale.grossProfit',
            operatingExpenses: 'Expense.amount (ACTIVE)',
            netProfit: 'grossProfit − operatingExpenses',
            cashCollected: 'Payment.amount (paidAt in range, revenue sales)',
            settledCompensation: 'WorkerFinancialTransaction COMMISSION + COMPENSATION ref',
            receivables: 'Sale.remainingAmount > 0 (ACTIVE|COMPLETED)',
          },
        },
        profitLoss: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          lines: [
            {
              key: 'revenue',
              label: 'Daromad',
              amount: 10_000_000,
              percentOfRevenue: 100,
              previousAmount: null,
              changePercent: null,
            },
            {
              key: 'netProfit',
              label: 'Sof foyda',
              amount: 3_500_000,
              percentOfRevenue: 35,
              previousAmount: null,
              changePercent: null,
            },
          ],
          settledCompensationNote: {
            amount: 100_000,
            count: 1,
            includedInNetProfit: false,
          },
        },
        cashFlow: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          openingBalanceSupported: false,
          closingBalanceSupported: false,
          inflow: { total: 8_000_000, byMethod: [{ method: 'CASH', amount: 8_000_000 }] },
          outflow: {
            operatingExpenses: 500_000,
            workerPayments: 0,
            supplierPayments: 0,
            total: 500_000,
          },
          netCashFlow: 7_500_000,
          notes: ['test'],
        },
        sales: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          totals: {
            salesCount: 4,
            revenue: 10_000_000,
            cogs: 6_000_000,
            grossProfit: 4_000_000,
            discounts: 0,
            averageOrderValue: 2_500_000,
            grossMarginPercent: 40,
            cancelledSalesCount: 0,
          },
          byDay: [],
          bySeller: [],
          byProduct: [],
          byCategory: [],
        },
        expenses: {
          analytics: {
            period: {
              from: '2026-08-01',
              to: '2026-08-31',
              fromInstant: '2026-07-31T19:00:00.000Z',
              toInstant: '2026-08-31T19:00:00.000Z',
              label: 'August 2026',
              timeZone: 'Asia/Tashkent',
            },
            generatedAt: '2026-08-18T10:00:00.000Z',
            total: 500_000,
            count: 2,
            byCategory: [],
            dailyTrend: [],
          },
          cancelledExpenseCount: 0,
          cancelledExpenseAmount: 0,
        },
        debts: {
          generatedAt: '2026-08-18T10:00:00.000Z',
          summary: {
            totalOutstanding: 2_000_000,
            customersInDebt: 1,
            openSaleCount: 1,
            overdueInstallmentCount: 0,
            overdueAmount: 0,
          },
          items: [],
          periodPaymentsCollected: 8_000_000,
        },
        supplierPayables: {
          generatedAt: '2026-08-18T10:00:00.000Z',
          summary: {
            totalPurchases: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            suppliersInDebt: 0,
            openPurchaseCount: 0,
          },
          items: [],
        },
        workers: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          sellers: [],
          compensation: { settledTotal: 100_000, settledCount: 1, byWorker: [] },
        },
        products: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          limit: 10,
          items: [],
          byCategory: [],
        },
        inventory: {
          generatedAt: '2026-08-18T10:00:00.000Z',
          snapshot: {
            totalProducts: 9,
            totalUnits: 40,
            lowStockCount: 1,
            outOfStockCount: 0,
          },
          movements: {
            stockIn: 5,
            stockOut: 3,
            soldQuantity: 2,
            cancelledSaleQuantity: 0,
          },
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
        },
        trend: {
          period: {
            from: '2026-08-01',
            to: '2026-08-31',
            fromInstant: '2026-07-31T19:00:00.000Z',
            toInstant: '2026-08-31T19:00:00.000Z',
            label: 'August 2026',
            timeZone: 'Asia/Tashkent',
          },
          generatedAt: '2026-08-18T10:00:00.000Z',
          granularity: 'DAY',
          points: [],
          totals: {
            revenue: 10_000_000,
            cogs: 6_000_000,
            grossProfit: 4_000_000,
            operatingExpenses: 500_000,
            netProfit: 3_500_000,
          },
        },
      },
    },
  },
};

const SIGNED_IN = { status: 200, body: { success: true, data: { user: TEST_ADMIN } } };
const EMPLOYEE_SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_EMPLOYEE } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReportsPage', () => {
  it('renders reports for admin and loads bundle', async () => {
    const fetchMock = mockApi({
      '/auth/me': SIGNED_IN,
      '/reports/bundle': EMPTY_BUNDLE,
    });

    renderWithProviders(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Hisobotlar' })).toBeInTheDocument();
    expect(await screen.findByText(/Moliyaviy hisobotlar · August 2026/i)).toBeInTheDocument();
    expect(screen.getByTestId('reports-page')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).includes('/reports/bundle')),
      ).toBe(true);
    });
    expect(screen.queryByText(/Hisobotlarni yuklab bo‘lmadi/i)).not.toBeInTheDocument();
  });

  it('redirects employees away from /reports', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
      '/sales/assembly-tasks/mine': { status: 200, body: { success: true, data: { items: [] } } },
      '/me/stats': {
        status: 200,
        body: {
          success: true,
          data: {
            stats: {
              totalSales: 0,
              salesThisMonth: 0,
              salesToday: 0,
              totalAssemblyTasks: 0,
              completedAssemblyTasks: 0,
              pendingAssemblyTasks: 0,
              completedTasksThisMonth: 0,
            },
          },
        },
      },
    });

    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.reports] })}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Hisobotlar' })).not.toBeInTheDocument();
    });
  });
});

void DateRangePreset.THIS_MONTH;
