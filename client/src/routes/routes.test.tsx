import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_EXPENSE_ANALYTICS, EMPTY_FINANCIAL_SUMMARY, EMPTY_FINANCIAL_TREND } from '@/features/dashboard/test/financial-fixtures';
import i18n from '@/i18n';
import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { routes } from './index';
import { NAV_ITEMS } from './navigation';
import { ROUTES } from './paths';

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

const SIGNED_IN_RESPONSE = { status: 200, body: { success: true, data: { user: ADMIN } } };
const FINANCIAL_RESPONSE = {
  status: 200,
  body: { success: true, data: { summary: EMPTY_FINANCIAL_SUMMARY } },
};
const TREND_RESPONSE = {
  status: 200,
  body: { success: true, data: { trend: EMPTY_FINANCIAL_TREND } },
};
const EXPENSE_RESPONSE = {
  status: 200,
  body: { success: true, data: { analytics: EMPTY_EXPENSE_ANALYTICS } },
};

function mockSignedInApp() {
  const emptyPage = {
    status: 200,
    body: {
      success: true,
      data: {
        items: [],
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  };

  return mockApi({
    '/auth/me': SIGNED_IN_RESPONSE,
    '/analytics/financial-summary': FINANCIAL_RESPONSE,
    '/analytics/financial-trend': TREND_RESPONSE,
    '/analytics/expenses': EXPENSE_RESPONSE,
    '/sales/assembly-tasks/mine': {
      status: 200,
      body: { success: true, data: { items: [] } },
    },
    '/api/me/stats': {
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
    '/api/me/profile': {
      status: 200,
      body: {
        success: true,
        data: {
          worker: {
            ...ADMIN,
            notes: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            lastLoginAt: null,
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
    },
    '/api/me/sales': emptyPage,
    '/api/me/activity': { status: 200, body: { success: true, data: { items: [] } } },
    '/sales': emptyPage,
    '/workers': emptyPage,
    '/expenses': emptyPage,
    '/debts': emptyPage,
    '/inventory': emptyPage,
    '/inventory/movements': emptyPage,
    '/suppliers': {
      status: 200,
      body: {
        success: true,
        data: {
          summary: {
            totalSuppliers: 0,
            activeCount: 0,
            archivedCount: 0,
            suppliersInDebt: 0,
            totalOutstanding: 0,
          },
          items: [],
          meta: emptyPage.body.data.meta,
        },
      },
    },
    '/purchases': emptyPage,
    '/expense-categories': {
      status: 200,
      body: { success: true, data: { items: [] } },
    },
  });
}

function renderApp(initialPath: string) {
  return renderWithProviders(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [initialPath] })} />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('application routes', () => {
  it('sends the root to the dashboard', async () => {
    mockSignedInApp();
    renderApp('/');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: i18n.t('nav.dashboard') },
        { timeout: 8_000 },
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: i18n.t('dashboard.title') }),
    ).toBeInTheDocument();
  });

  it('shows the store name on the dashboard from the financial summary', async () => {
    mockSignedInApp();
    renderApp(ROUTES.dashboard);

    expect(await screen.findByText(/Mebel Savdo/)).toBeInTheDocument();
    expect(screen.getByText(i18n.t('sales.totalSale'))).toBeInTheDocument();
  });

  it('falls back to the dashboard for an unknown address', async () => {
    mockSignedInApp();
    renderApp('/not-a-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: i18n.t('nav.dashboard') }),
    ).toBeInTheDocument();
  });

  it.each(NAV_ITEMS.map((item) => [i18n.t(item.labelKey), item.to]))(
    'opens %s inside the shell',
    async (label, to) => {
      mockSignedInApp();
      renderApp(to);

      expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: i18n.t('nav.modules') })).toBeInTheDocument();
    },
  );

  it('keeps the session while moving between modules', async () => {
    mockSignedInApp();
    const user = userEvent.setup();
    renderApp(ROUTES.dashboard);

    await screen.findByRole('heading', { level: 1, name: i18n.t('nav.dashboard') });
    await user.click(screen.getByRole('link', { name: i18n.t('nav.customers') }));
    await user.click(screen.getByRole('link', { name: i18n.t('nav.reports') }));

    expect(
      screen.getByRole('heading', { level: 1, name: i18n.t('nav.reports') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Store Administrator')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: i18n.t('auth.login') })).not.toBeInTheDocument();
  });

  it.each(NAV_ITEMS.map((item) => [i18n.t(item.labelKey), item.to]))(
    'keeps %s behind the login form',
    async (_label, to) => {
      mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
      renderApp(to);

      expect(await screen.findByRole('heading', { name: i18n.t('auth.login') })).toBeInTheDocument();
    },
  );

  it('keeps a signed-in user off the login form', async () => {
    mockSignedInApp();
    renderApp(ROUTES.login);

    expect(
      await screen.findByRole('heading', { level: 1, name: i18n.t('nav.dashboard') }),
    ).toBeInTheDocument();
  });
});
