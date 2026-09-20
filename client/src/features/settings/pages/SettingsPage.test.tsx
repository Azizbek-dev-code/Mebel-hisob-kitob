import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

const NOTIFY_BODY = {
  status: 200,
  body: {
    success: true,
    data: { items: [], prefs: {}, unreadCount: 0 },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('renders a grouped profile hub for admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/notifications': NOTIFY_BODY,
    });

    renderWithProviders(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Akkaunt/ })).toHaveAttribute('href', '/settings/account');
    expect(screen.getByRole('link', { name: /^Xavfsizlik/ })).toHaveAttribute('href', '/settings/security');
    expect(screen.getByRole('link', { name: /^Do‘kon/ })).toHaveAttribute('href', '/settings/shop');
    expect(screen.getByRole('link', { name: /^Bildirishnomalar/ })).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByRole('link', { name: /^Xavfli amallar/ })).toHaveAttribute(
      'href',
      '/settings/danger',
    );
  });

  it('hides shop and backup links for non-admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_EMPLOYEE } } },
      '/notifications': NOTIFY_BODY,
    });

    renderWithProviders(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Akkaunt/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Do‘kon/ })).not.toBeInTheDocument();
  });
});
