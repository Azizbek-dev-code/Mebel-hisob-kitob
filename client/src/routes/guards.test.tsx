import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLogout } from '@/features/auth/hooks/use-auth';
import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { TEST_PERSONAL } from '@/test/auth-fixtures';

import { PersonalProtectedRoute, ProtectedRoute, PublicOnlyRoute } from './guards';

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
const SIGNED_IN_PERSONAL = { status: 200, body: { success: true, data: { user: TEST_PERSONAL } } };

function Workspace() {
  const logout = useLogout();
  return (
    <div>
      <p>Workspace</p>
      <button type="button" onClick={() => logout.mutate()}>
        Sign out
      </button>
    </div>
  );
}

function renderRoutes(initialPath: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<p>Login form</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Workspace />} />
          <Route path="/reports" element={<p>Reports</p>} />
          <Route path="/sales" element={<p>ERP sales</p>} />
        </Route>
        <Route element={<PersonalProtectedRoute />}>
          <Route path="/personal/dashboard" element={<p>Personal dashboard</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProtectedRoute', () => {
  it('waits for the session check instead of flashing the login form', () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderRoutes('/dashboard');

    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
  });

  it('renders the application once a session is confirmed', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderRoutes('/dashboard');

    expect(await screen.findByText('Workspace')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to the login form', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    renderRoutes('/dashboard');

    expect(await screen.findByText('Login form')).toBeInTheDocument();
  });

  it('sends a visitor to the login form when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('connection refused'))),
    );
    renderRoutes('/dashboard');

    expect(await screen.findByText('Login form')).toBeInTheDocument();
  });

  it('protects deep links, not just the landing page', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    renderRoutes('/reports');

    expect(await screen.findByText('Login form')).toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
  });

  it('drops back to the login form the moment the user signs out', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE, '/auth/logout': { status: 204 } });
    const user = userEvent.setup();
    renderRoutes('/dashboard');

    await screen.findByText('Workspace');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Login form')).toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  it('shows the login form to a signed-out visitor', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    renderRoutes('/login');

    expect(await screen.findByText('Login form')).toBeInTheDocument();
  });

  it('bounces an already signed-in user back to the application', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderRoutes('/login');

    expect(await screen.findByText('Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
  });

  it('sends a personal session to the personal home instead of the store dashboard', async () => {
    mockApi({ '/auth/me': SIGNED_IN_PERSONAL });
    renderRoutes('/login');

    expect(await screen.findByText('Personal dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
  });
});

describe('session isolation', () => {
  it('keeps a personal session off store ERP pages', async () => {
    mockApi({ '/auth/me': SIGNED_IN_PERSONAL });
    renderRoutes('/sales');

    expect(await screen.findByText('Personal dashboard')).toBeInTheDocument();
    expect(screen.queryByText('ERP sales')).not.toBeInTheDocument();
  });

  it('keeps a store session off personal finance pages', async () => {
    mockApi({ '/auth/me': SIGNED_IN_RESPONSE });
    renderRoutes('/personal/dashboard');

    expect(await screen.findByText('Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Personal dashboard')).not.toBeInTheDocument();
  });

  it('keeps personal pages behind the login form', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    renderRoutes('/personal/dashboard');

    expect(await screen.findByText('Login form')).toBeInTheDocument();
    expect(screen.queryByText('Personal dashboard')).not.toBeInTheDocument();
  });
});
