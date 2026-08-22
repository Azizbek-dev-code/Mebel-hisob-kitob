import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

function renderShell(initialPath = '/dashboard') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
          <Route path="/sales" element={<p>Sales content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppLayout', () => {
  it('lists every module in the sidebar', () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderShell();

    const modules = within(screen.getByRole('navigation', { name: 'Modules' }));
    for (const label of [
      'Dashboard',
      'Sotuvlar',
      'Terlash',
      'Mebellar',
      'Mijozlar',
      'Xarajatlar',
      'Ishchilar',
      'Hisobotlar',
      'Sozlamalar',
    ]) {
      expect(modules.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(modules.queryByRole('link', { name: 'Ustalar' })).not.toBeInTheDocument();
  });

  it('names the current module in the header and marks it in the sidebar', () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderShell();

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('moves between modules without leaving the shell', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('link', { name: 'Sotuvlar' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Sotuvlar' })).toBeInTheDocument();
    expect(screen.getByText('Sales content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sotuvlar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: 'Modules' })).toBeInTheDocument();
  });

  it('shows the signed-in user and their role in the header', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderShell();

    expect(await screen.findByText('Store Administrator')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('opens the navigation drawer on request and closes it on Escape', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the drawer once a destination is chosen', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = within(screen.getByRole('dialog', { name: 'Navigation' }));
    await user.click(drawer.getByRole('link', { name: 'Hisobotlar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signs out from the sidebar through the existing auth mutation', async () => {
    const fetchMock = mockApi({ '/auth/me': SIGNED_IN_RESPONSE, '/auth/logout': { status: 204 } });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/logout'))).toBe(true);
    });
  });
});
