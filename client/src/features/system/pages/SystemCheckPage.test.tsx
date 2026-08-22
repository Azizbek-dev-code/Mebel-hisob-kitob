import type { AuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { SystemCheckPage } from './SystemCheckPage';

const HEALTHY = {
  status: 200,
  body: {
    success: true,
    data: {
      status: 'ok',
      environment: 'development',
      uptimeSeconds: 42,
      timestamp: '2026-08-08T00:00:00.000Z',
      version: '1.0.0',
    },
  },
};

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SystemCheckPage', () => {
  it('shows the API details once the health check succeeds', async () => {
    mockApi({ '/health': HEALTHY, '/auth/me': SIGNED_OUT_RESPONSE });

    renderWithProviders(<SystemCheckPage />);

    expect(await screen.findByText('API connected')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('42s')).toBeInTheDocument();
  });

  it('surfaces a readable message when the API is down', async () => {
    mockApi({
      '/health': {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        },
      },
      '/auth/me': SIGNED_OUT_RESPONSE,
    });

    renderWithProviders(<SystemCheckPage />);

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('identifies the signed-in user and offers a way out', async () => {
    const fetchMock = mockApi({
      '/health': HEALTHY,
      '/auth/me': { status: 200, body: { success: true, data: { user: ADMIN } } },
      '/auth/logout': { status: 204 },
    });
    const user = userEvent.setup();

    renderWithProviders(<SystemCheckPage />);

    expect(await screen.findByText('Store Administrator')).toBeInTheDocument();
    expect(screen.getByText('Administrator · Mebel Savdo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/logout'))).toBe(true);
    });
  });
});
