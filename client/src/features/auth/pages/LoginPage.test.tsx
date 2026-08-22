import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { LoginPage } from './LoginPage';

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

function renderLoginPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Workspace</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('renders the branding and both credential fields', () => {
    mockApi({});
    renderLoginPage();

    expect(screen.getByRole('heading', { name: 'Furniture ERP' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Yangi do'kon ochish" })).toHaveAttribute(
      'href',
      '/register-store',
    );
  });

  it('asks for both fields before contacting the API', async () => {
    const fetchMock = mockApi({});
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your username or email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in and moves on to the workspace', async () => {
    const fetchMock = mockApi({
      '/auth/login': { status: 200, body: { success: true, data: { user: ADMIN } } },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username or email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Workspace')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'admin',
      password: 'Admin123!',
    });
  });

  it('shows the rejection message and stays put on bad credentials', async () => {
    mockApi({
      '/auth/login': {
        status: 401,
        body: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Incorrect username or password.' },
        },
      },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username or email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
  });

  it('explains an unreachable API rather than failing silently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('connection refused'))),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username or email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
  });

  it('reveals and re-hides the password on request', async () => {
    mockApi({});
    const user = userEvent.setup();
    renderLoginPage();

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('disables the form while the request is in flight', async () => {
    let releaseLogin: (() => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            releaseLogin = () =>
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true, data: { user: ADMIN } }),
              } as Response);
          }),
      ),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username or email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('button', { name: /Signing in/ })).toBeDisabled();
    expect(screen.getByLabelText('Username or email')).toBeDisabled();

    releaseLogin?.();
    await waitFor(() => expect(screen.getByText('Workspace')).toBeInTheDocument());
  });
});
