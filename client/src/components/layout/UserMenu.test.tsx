import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';

import { UserMenu } from './UserMenu';

const CASHIER: AuthUser = {
  id: 'user_cashier',
  email: 'cashier@furniture-erp.local',
  username: 'cashier',
  fullName: 'Anvar Aliyev',
  phone: null,
  role: 'CASHIER',
  responsibilities: ['SELLER'],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

const SIGNED_IN_RESPONSE = { status: 200, body: { success: true, data: { user: CASHIER } } };

function renderMenu() {
  return renderWithProviders(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UserMenu', () => {
  it('shows nothing until the session is known', () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const { container } = renderMenu();

    expect(container).toBeEmptyDOMElement();
  });

  it('stays empty for a visitor without a session', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    const { container } = renderMenu();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('names the signed-in user and their role', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderMenu();

    expect(await screen.findByText('Anvar Aliyev')).toBeInTheDocument();
    expect(screen.getByText('Kassir')).toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
  });

  it('reveals the username, the role and the store when opened', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /Anvar Aliyev/ }));

    const menu = within(screen.getByRole('menu', { name: 'Hisob' }));
    expect(menu.getByText('cashier')).toBeInTheDocument();
    expect(menu.getByText(/Kassir/)).toBeInTheDocument();
    expect(menu.getByText(/Mebel Savdo/)).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: 'Profil' })).toBeInTheDocument();
    expect(menu.getByRole('button', { name: 'Chiqish' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /Anvar Aliyev/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when the pointer goes somewhere else', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /Anvar Aliyev/ }));
    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ends the session through the existing logout mutation', async () => {
    const fetchMock = mockApi({ '/auth/me': SIGNED_IN_RESPONSE, '/auth/logout': { status: 204 } });
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /Anvar Aliyev/ }));
    await user.click(screen.getByRole('button', { name: 'Chiqish' }));

    await waitFor(() => {
      const [url, init] = fetchMock.mock.calls.find(([called]) =>
        String(called).includes('/auth/logout'),
      ) as [string, RequestInit];
      expect(url).toContain('/auth/logout');
      expect(init.method).toBe('POST');
    });
  });
});
