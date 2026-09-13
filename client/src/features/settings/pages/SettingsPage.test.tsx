import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

const STORE_BODY = {
  status: 200,
  body: {
    success: true,
    data: {
      store: {
        id: 'store_1',
        name: 'Mebel Savdo',
        phone: '+998901234567',
        address: 'Toshkent',
        currency: 'UZS',
        timezone: 'Asia/Tashkent',
        updatedAt: '2026-08-19T00:00:00.000Z',
      },
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('renders editable store settings for admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/settings/store': STORE_BODY,
      '/billing/subscription': {
        status: 200,
        body: { success: true, data: { subscription: null } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Sozlamalar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Do‘kon nomi')).toHaveValue('Mebel Savdo');
    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeInTheDocument();
    expect(screen.getAllByText('Akkauntni o‘chirish').length).toBeGreaterThan(0);
  });

  it('renders read-only store settings for non-admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_EMPLOYEE } } },
      '/settings/store': STORE_BODY,
    });

    renderWithProviders(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Sozlamalar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Do‘kon nomi')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Saqlash' })).not.toBeInTheDocument();
  });
});
