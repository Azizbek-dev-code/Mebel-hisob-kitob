import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformShopsPage } from './PlatformShopsPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

const SHOPS = {
  success: true,
  data: {
    items: [
      {
        id: 'store_1',
        name: 'Fayz mebel',
        phone: '+998901112233',
        address: 'Urgut',
        isActive: true,
        accessStatus: 'ACTIVE',
        planName: 'START',
        monthlyPrice: 150000,
        nextPaymentDue: '2026-09-22T00:00:00.000Z',
        hasPendingPayment: false,
        ownerName: 'Test',
        ownerPhone: '+998901112233',
        createdAt: '2026-08-21T00:00:00.000Z',
      },
      {
        id: 'store_2',
        name: 'Yopiq do\'kon',
        phone: null,
        address: null,
        isActive: false,
        accessStatus: 'MANUALLY_BLOCKED',
        planName: 'START',
        monthlyPrice: 150000,
        nextPaymentDue: null,
        hasPendingPayment: false,
        ownerName: null,
        ownerPhone: null,
        createdAt: '2026-08-20T00:00:00.000Z',
      },
    ],
  },
};

function renderShops(path: string, filter: 'all' | 'active' | 'pending-payment' | 'blocked') {
  mockApi({
    '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
    '/platform/shops': { status: 200, body: SHOPS },
  });
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={ROUTES.platformShops} element={<PlatformShopsPage filter={filter} />} />
        <Route path={ROUTES.platformShopsActive} element={<PlatformShopsPage filter="active" />} />
        <Route
          path={ROUTES.platformShopsPendingPayment}
          element={<PlatformShopsPage filter="pending-payment" />}
        />
        <Route path={ROUTES.platformShopsBlocked} element={<PlatformShopsPage filter="blocked" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformShopsPage', () => {
  it('lists active stores', async () => {
    renderShops(ROUTES.platformShopsActive, 'active');
    expect(await screen.findByText('Fayz mebel')).toBeInTheDocument();
    expect(screen.queryByText("Yopiq do'kon")).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: "Do'kon holati" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Barchasi' })).toBeInTheDocument();
    expect(screen.getAllByText('Faol').length).toBeGreaterThan(0);
  });

  it('shows an empty pending-payment state until billing exists', async () => {
    renderShops(ROUTES.platformShopsPendingPayment, 'pending-payment');
    expect(await screen.findByText("To'lov kutilayotgan do'kon yo'q")).toBeInTheDocument();
  });

  it('lists blocked stores', async () => {
    renderShops(ROUTES.platformShopsBlocked, 'blocked');
    expect(await screen.findByText("Yopiq do'kon")).toBeInTheDocument();
    expect(screen.queryByText('Fayz mebel')).not.toBeInTheDocument();
  });

  it('returns 403 for a store ADMIN', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
    });
    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.platformShops] })}
      />,
    );
    expect(await screen.findByRole('heading', { name: /403/ })).toBeInTheDocument();
  });
});
