import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';

import { AppLayout } from './AppLayout';

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

function renderShell(initialPath = '/dashboard', extra: Record<string, { status: number; body?: unknown }> = {}) {
  const fetchMock = mockApi({
    '/auth/me': SIGNED_IN_RESPONSE,
    '/notifications': {
      status: 200,
      body: { success: true, data: { items: [], prefs: {}, unreadCount: 0 } },
    },
    ...extra,
  });
  renderWithProviders(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
          <Route path="/sales" element={<p>Sales content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppLayout', () => {
  it('lists every module in the sidebar', async () => {
    renderShell();

    const modules = within(screen.getByRole('navigation', { name: i18n.t('nav.modules') }));
    for (const label of [
      i18n.t('nav.dashboard'),
      i18n.t('nav.sales'),
      i18n.t('nav.assembly'),
      i18n.t('nav.products'),
      i18n.t('nav.customers'),
      i18n.t('nav.workers'),
      i18n.t('nav.reports'),
      i18n.t('nav.profile'),
    ]) {
      expect(await modules.findByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(modules.queryByRole('link', { name: i18n.t('nav.expenses') })).not.toBeInTheDocument();
    expect(modules.queryByRole('link', { name: 'Ustalar' })).not.toBeInTheDocument();
    expect(modules.getAllByRole('link', { name: i18n.t('nav.profile') })).toHaveLength(1);
    expect(modules.getByRole('link', { name: i18n.t('nav.profile') })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('names the current module in the header and marks it in the sidebar', () => {
    renderShell();

    expect(
      screen.getByRole('heading', { level: 1, name: i18n.t('nav.dashboard') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('nav.dashboard') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('moves between modules without leaving the shell', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('link', { name: i18n.t('nav.sales') }));

    expect(
      screen.getByRole('heading', { level: 1, name: i18n.t('nav.sales') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sales content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('nav.sales') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('navigation', { name: i18n.t('nav.modules') })).toBeInTheDocument();
  });

  it('shows the signed-in user and their role in the header', async () => {
    renderShell();

    expect(await screen.findByText('Store Administrator')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('roles.ADMIN'))).toBeInTheDocument();
  });

  it('opens the navigation drawer on request and closes it on Escape', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('nav.openNav') }));
    expect(screen.getByRole('dialog', { name: i18n.t('nav.navigation') })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the drawer once a destination is chosen', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: i18n.t('nav.openNav') }));
    const drawer = within(screen.getByRole('dialog', { name: i18n.t('nav.navigation') }));
    await user.click(drawer.getByRole('link', { name: i18n.t('nav.reports') }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signs out from the sidebar through the existing auth mutation', async () => {
    const fetchMock = renderShell('/dashboard', { '/auth/logout': { status: 204 } });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: i18n.t('auth.logout') }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/logout'))).toBe(true);
    });
  });
});
