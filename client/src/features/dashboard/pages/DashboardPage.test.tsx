import type { AuthUser } from '@furniture-erp/shared';
import { DateRangePreset } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import i18n from '@/i18n';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import {
  EMPTY_EXPENSE_ANALYTICS,
  EMPTY_FINANCIAL_SUMMARY,
  EMPTY_FINANCIAL_TREND,
  NEGATIVE_NET_SUMMARY,
  POPULATED_EXPENSE_ANALYTICS,
  POPULATED_FINANCIAL_SUMMARY,
  POPULATED_FINANCIAL_TREND,
} from '../test/financial-fixtures';
import { DashboardPage } from './DashboardPage';

/** Money uses a non-breaking thin space; match digits regardless of separator. */
function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${amount < 0 ? '-' : ''}${digits}[\\s\\u00A0]*so'm`);
}

const ADMIN: AuthUser = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: 'ADMIN',
  responsibilities: ['SELLER', 'ASSEMBLER', 'DELIVERY'],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

const EMPLOYEE: AuthUser = {
  id: 'user_employee',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  phone: null,
  role: 'EMPLOYEE',
  responsibilities: ['SELLER', 'ASSEMBLER'],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

const SIGNED_IN = { status: 200, body: { success: true, data: { user: ADMIN } } };

function financialResponse(summary = EMPTY_FINANCIAL_SUMMARY) {
  return { status: 200, body: { success: true, data: { summary } } };
}

function trendResponse(trend = EMPTY_FINANCIAL_TREND) {
  return { status: 200, body: { success: true, data: { trend } } };
}

function expenseResponse(analytics = EMPTY_EXPENSE_ANALYTICS) {
  return { status: 200, body: { success: true, data: { analytics } } };
}

function mockDashboardApis(options?: {
  summary?: typeof EMPTY_FINANCIAL_SUMMARY;
  trend?: typeof EMPTY_FINANCIAL_TREND;
  expenses?: typeof EMPTY_EXPENSE_ANALYTICS;
  summaryError?: boolean;
  trendError?: boolean;
  expenseError?: boolean;
}) {
  return mockApi({
    '/auth/me': SIGNED_IN,
    '/analytics/financial-summary': options?.summaryError
      ? {
          status: 500,
          body: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
          },
        }
      : financialResponse(options?.summary),
    '/analytics/financial-trend': options?.trendError
      ? {
          status: 500,
          body: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Chart failed' },
          },
        }
      : trendResponse(options?.trend),
    '/analytics/expenses': options?.expenseError
      ? {
          status: 500,
          body: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Expense analytics failed' },
          },
        }
      : expenseResponse(options?.expenses),
  });
}

function workerStatsResponse() {
  return {
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
  };
}

function renderDashboard() {
  return renderWithProviders(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardPage (financial summary)', () => {
  it('renders the dashboard heading and loading skeletons', async () => {
    mockDashboardApis();
    renderDashboard();

    expect(screen.getByRole('heading', { name: i18n.t('dashboard.title') })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();

    expect(await screen.findByText('Sotuv')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });
  });

  it('defaults to the current month preset', async () => {
    const fetchMock = mockDashboardApis();
    renderDashboard();
    await screen.findByText('Sotuv');

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/financial-summary') &&
            url.includes(`preset=${DateRangePreset.THIS_MONTH}`) &&
            url.includes('comparison=previous'),
        ),
      ).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/financial-trend') &&
            url.includes(`preset=${DateRangePreset.THIS_MONTH}`),
        ),
      ).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/expenses') &&
            url.includes(`preset=${DateRangePreset.THIS_MONTH}`),
        ),
      ).toBe(true);
    });
  });

  it('renders primary and secondary financial KPIs from the analytics API', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
      expenses: POPULATED_EXPENSE_ANALYTICS,
    });
    renderDashboard();

    expect(await screen.findByText(moneyMatcher(20_450_000))).toBeInTheDocument();
    expect(screen.getAllByText('Sotuv').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tannarx').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yalpi foyda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Xarajatlar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sof foyda').length).toBeGreaterThan(0);
    expect(screen.getByText('Tushgan pul')).toBeInTheDocument();
    expect(screen.getByText('Davr qarzdorligi')).toBeInTheDocument();
    expect(screen.getByText('Xarajatlar soni')).toBeInTheDocument();

    expect(screen.getByText(moneyMatcher(14_900_000))).toBeInTheDocument();
    expect(screen.getByText(moneyMatcher(5_550_000))).toBeInTheDocument();
    expect(screen.getAllByText(moneyMatcher(2_100_000)).length).toBeGreaterThan(0);
    expect(screen.getByText(moneyMatcher(3_450_000))).toBeInTheDocument();
    expect(screen.getByText(moneyMatcher(3_000_000))).toBeInTheDocument();
    expect(screen.getByText(moneyMatcher(17_450_000))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the financial performance chart with series lines', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
      expenses: POPULATED_EXPENSE_ANALYTICS,
    });
    renderDashboard();

    expect(await screen.findByTestId('financial-performance-chart')).toBeInTheDocument();
    expect(screen.getByText('Moliyaviy natijalar')).toBeInTheDocument();
    expect(document.querySelector('[data-series="revenue"]')).toBeTruthy();
    expect(document.querySelector('[data-series="cogs"]')).toBeTruthy();
    expect(document.querySelector('[data-series="grossProfit"]')).toBeTruthy();
    expect(document.querySelector('[data-series="netProfit"]')).toBeTruthy();
  });

  it('renders daily and category expense charts from the expenses API', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
      expenses: POPULATED_EXPENSE_ANALYTICS,
    });
    renderDashboard();

    expect(await screen.findByTestId('daily-expense-trend-chart')).toBeInTheDocument();
    expect(screen.getByText('Kunlik xarajatlar')).toBeInTheDocument();
    expect(screen.getByText("Tanlangan davr bo'yicha xarajatlar")).toBeInTheDocument();
    expect(await screen.findByTestId('expense-category-chart')).toBeInTheDocument();
    expect(screen.getByText("Xarajatlar kategoriyalar bo'yicha")).toBeInTheDocument();
    expect(screen.getByText('Elektr')).toBeInTheDocument();
    expect(screen.getByText('Boshqa')).toBeInTheDocument();
  });

  it('reconciles expense chart totals with the Expense KPI', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
      expenses: POPULATED_EXPENSE_ANALYTICS,
    });
    renderDashboard();

    expect(await screen.findByTestId('daily-expense-trend-chart')).toBeInTheDocument();
    const dailyTotal = POPULATED_EXPENSE_ANALYTICS.dailyTrend.reduce((sum, p) => sum + p.amount, 0);
    const categoryTotal = POPULATED_EXPENSE_ANALYTICS.byCategory.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    expect(dailyTotal).toBe(POPULATED_FINANCIAL_SUMMARY.metrics.operatingExpenses);
    expect(categoryTotal).toBe(POPULATED_FINANCIAL_SUMMARY.metrics.operatingExpenses);
    expect(POPULATED_EXPENSE_ANALYTICS.total).toBe(
      POPULATED_FINANCIAL_SUMMARY.metrics.operatingExpenses,
    );
  });

  it('formats money with the Uzbek so\'m suffix', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
    });
    renderDashboard();
    expect(await screen.findByText(moneyMatcher(20_450_000))).toHaveTextContent(/so'm/);
  });

  it('shows comparison percentages when the backend provides them', async () => {
    mockDashboardApis({ summary: POPULATED_FINANCIAL_SUMMARY, trend: POPULATED_FINANCIAL_TREND });
    renderDashboard();
    expect(await screen.findByText(/\+104\.5%/)).toBeInTheDocument();
  });

  it('shows "Taqqoslash mavjud emas" when changePercent is null', async () => {
    mockDashboardApis({ summary: NEGATIVE_NET_SUMMARY });
    renderDashboard();
    expect(await screen.findByText('Davr zarari')).toBeInTheDocument();
    expect(screen.getAllByText('Taqqoslash mavjud emas').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Infinity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
  });

  it('highlights negative net profit', async () => {
    mockDashboardApis({ summary: NEGATIVE_NET_SUMMARY });
    renderDashboard();
    expect(await screen.findByText(moneyMatcher(-300_000))).toBeInTheDocument();
    expect(screen.getByText('Davr zarari')).toBeInTheDocument();
  });

  it('shows an empty-period message when there are no sales or expenses', async () => {
    mockDashboardApis();
    renderDashboard();
    expect(
      (await screen.findAllByText(/Bu davr uchun moliyaviy ma'lumot topilmadi/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(moneyMatcher(0)).length).toBeGreaterThan(0);
  });

  it('shows chart empty state when trend has no activity', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: EMPTY_FINANCIAL_TREND,
    });
    renderDashboard();
    expect(await screen.findByText(moneyMatcher(20_450_000))).toBeInTheDocument();
    expect(
      await screen.findByText(/Sotuv yoki xarajat paydo bo'lganda/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('financial-performance-chart')).not.toBeInTheDocument();
  });

  it('isolates chart errors from KPI cards', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trendError: true,
    });
    renderDashboard();

    expect(await screen.findByText(moneyMatcher(20_450_000))).toBeInTheDocument();
    expect(screen.getByText(/Grafik ma'lumotlarini yuklab bo'lmadi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Qayta urinish' })).toBeInTheDocument();
  });

  it('isolates expense analytics errors from KPI and financial charts', async () => {
    mockDashboardApis({
      summary: POPULATED_FINANCIAL_SUMMARY,
      trend: POPULATED_FINANCIAL_TREND,
      expenseError: true,
    });
    renderDashboard();

    expect(await screen.findByText(moneyMatcher(20_450_000))).toBeInTheDocument();
    expect(await screen.findByTestId('financial-performance-chart')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Xarajatlar ma'lumotlarini yuklab bo'lmadi/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Qayta urinish' }).length).toBeGreaterThan(0);
  });

  it('changes summary, trend, and expense queries when Bugun is selected', async () => {
    const fetchMock = mockDashboardApis();
    const user = userEvent.setup();

    renderDashboard();
    await screen.findByText('Sotuv');

    await user.click(screen.getByRole('button', { name: /bugun/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes(`preset=${DateRangePreset.TODAY}`))).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/financial-trend') &&
            url.includes(`preset=${DateRangePreset.TODAY}`),
        ),
      ).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/expenses') &&
            url.includes(`preset=${DateRangePreset.TODAY}`),
        ),
      ).toBe(true);
    });
  });

  it('applies a custom date range only after Qo\'llash', async () => {
    const fetchMock = mockDashboardApis();
    const user = userEvent.setup();

    renderDashboard();
    await screen.findByText('Sotuv');
    await waitFor(() => {
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });
    fetchMock.mockClear();

    await user.click(screen.getByRole('button', { name: /custom/i }));
    const fromInput = screen.getByLabelText('Boshlanish sanasi');
    const toInput = screen.getByLabelText('Tugash sanasi');

    await user.clear(fromInput);
    await user.type(fromInput, '2026-08-01');
    await user.clear(toInput);
    await user.type(toInput, '2026-08-31');

    const urlsBeforeApply = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urlsBeforeApply.some((url) => url.includes('from=2026-08-01'))).toBe(false);

    await user.click(screen.getByRole('button', { name: /Qo'llash/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/financial-summary') &&
            url.includes('from=2026-08-01') &&
            url.includes('to=2026-08-31'),
        ),
      ).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/financial-trend') &&
            url.includes('from=2026-08-01') &&
            url.includes('to=2026-08-31'),
        ),
      ).toBe(true);
      expect(
        urls.some(
          (url) =>
            url.includes('/analytics/expenses') &&
            url.includes('from=2026-08-01') &&
            url.includes('to=2026-08-31'),
        ),
      ).toBe(true);
    });
  });

  it('shows an error state with Qayta urinish when the API fails', async () => {
    const fetchMock = mockDashboardApis({
      summaryError: true,
      trendError: true,
      expenseError: true,
    });
    const user = userEvent.setup();

    renderDashboard();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Moliyaviy ma'lumotlarni yuklab bo'lmadi/i)).toBeInTheDocument();

    fetchMock.mockClear();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (url.includes('/analytics/financial-trend')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(trendResponse(EMPTY_FINANCIAL_TREND).body),
        } as Response);
      }
      if (url.includes('/analytics/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(expenseResponse(EMPTY_EXPENSE_ANALYTICS).body),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(financialResponse(EMPTY_FINANCIAL_SUMMARY).body),
      } as Response);
    });

    await user.click(screen.getByRole('button', { name: 'Qayta urinish' }));

    expect(await screen.findByText('Sotuv')).toBeInTheDocument();
    expect(screen.queryByText(/Moliyaviy ma'lumotlarni yuklab bo'lmadi/i)).not.toBeInTheDocument();
  });

  it('does not show financial KPI cards to EMPLOYEE on the home route', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: EMPLOYEE } } },
      '/me/stats': workerStatsResponse(),
      '/analytics/financial-summary': financialResponse(POPULATED_FINANCIAL_SUMMARY),
      '/analytics/financial-trend': trendResponse(POPULATED_FINANCIAL_TREND),
      '/analytics/expenses': expenseResponse(POPULATED_EXPENSE_ANALYTICS),
    });

    const router = createMemoryRouter(routes, { initialEntries: [ROUTES.dashboard] });
    renderWithProviders(<RouterProvider router={router} />);

    expect(await screen.findByText(/Welcome/i)).toBeInTheDocument();
    expect(screen.queryByText('Sotuv')).not.toBeInTheDocument();
    expect(screen.queryByText(moneyMatcher(20_450_000))).not.toBeInTheDocument();
  });
});
