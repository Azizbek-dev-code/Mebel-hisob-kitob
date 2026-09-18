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
        <Route path="/personal/dashboard" element={<p>Personal home</p>} />
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
    expect(screen.getByLabelText('Login yoki email')).toBeInTheDocument();
    expect(screen.getByLabelText('Parol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Meni eslab qolish/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Yangi hisob ochish' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
    expect(screen.queryByRole('link', { name: 'Yangi do‘kon ochish' })).not.toBeInTheDocument();
  });

  it('asks for both fields before contacting the API', async () => {
    const fetchMock = mockApi({});
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByText('Login yoki emailni kiriting')).toBeInTheDocument();
    expect(screen.getByText('Parolni kiriting')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in and moves on to the workspace', async () => {
    const fetchMock = mockApi({
      '/auth/login': { status: 200, body: { success: true, data: { user: ADMIN } } },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Login yoki email'), 'admin');
    await user.type(screen.getByLabelText('Parol'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByText('Workspace')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'admin',
      password: 'Admin123!',
      rememberMe: false,
    });
  });

  it('sends rememberMe true when the checkbox is checked', async () => {
    const fetchMock = mockApi({
      '/auth/login': { status: 200, body: { success: true, data: { user: ADMIN } } },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Login yoki email'), 'admin');
    await user.type(screen.getByLabelText('Parol'), 'Admin123!');
    await user.click(screen.getByLabelText(/Meni eslab qolish/));
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByText('Workspace')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'admin',
      password: 'Admin123!',
      rememberMe: true,
    });
  });

  it('sends a personal session to the personal dashboard', async () => {
    mockApi({
      '/auth/login': {
        status: 200,
        body: {
          success: true,
          data: {
            user: {
              kind: 'PERSONAL',
              id: 'idn_1',
              email: 'aziz@example.com',
              username: null,
              fullName: 'Aziz Karimov',
              phone: null,
              role: 'PERSONAL',
              responsibilities: [],
              storeId: null,
              storeName: 'Azizning shaxsiy moliyasi',
              workspaceId: 'ws_1',
              identityId: 'idn_1',
              membershipRole: 'OWNER',
              subscription: {
                status: 'TRIAL',
                storedStatus: 'TRIAL',
                planId: 'PERSONAL_TRIAL',
                planName: 'Sinov',
                trialEndsAt: '2026-09-20T00:00:00.000Z',
                currentPeriodEnd: '2026-09-20T00:00:00.000Z',
                trialWelcomeSeenAt: null,
                daysRemaining: 7,
                canWrite: true,
                hasPendingPaymentRequest: false,
                featureKeys: [],
                featuresRestricted: false,
              },
            },
          },
        },
      },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Login yoki email'), 'aziz@example.com');
    await user.type(screen.getByLabelText('Parol'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByText('Personal home')).toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
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

    await user.type(screen.getByLabelText('Login yoki email'), 'admin');
    await user.type(screen.getByLabelText('Parol'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

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

    await user.type(screen.getByLabelText('Login yoki email'), 'admin');
    await user.type(screen.getByLabelText('Parol'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
  });

  it('reveals and re-hides the password on request', async () => {
    mockApi({});
    const user = userEvent.setup();
    renderLoginPage();

    const password = screen.getByLabelText('Parol');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Parolni ko‘rsatish' }));
    expect(password).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Parolni yashirish' }));
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

    await user.type(screen.getByLabelText('Login yoki email'), 'admin');
    await user.type(screen.getByLabelText('Parol'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Kirish' }));

    expect(await screen.findByRole('button', { name: /Yuklanmoqda/ })).toBeDisabled();
    expect(screen.getByLabelText('Login yoki email')).toBeDisabled();

    releaseLogin?.();
    await waitFor(() => expect(screen.getByText('Workspace')).toBeInTheDocument());
  });
});
