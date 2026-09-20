import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessNotificationsPage } from '@/features/notifications/BusinessNotificationsPage';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders } from '@/test/test-utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BusinessNotificationsPage', () => {
  it('lists a store notification and does not mix personal copy', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/notifications': {
        status: 200,
        body: {
          success: true,
          data: {
            unreadCount: 1,
            prefs: {
              notifySales: true,
              notifyInventory: true,
              notifyDelivery: true,
              notifyAssembly: true,
              notifyWorkers: true,
              notifyBilling: true,
              notifyImportant: true,
            },
            items: [
              {
                id: 'sale-new:s1',
                category: 'SALES',
                kind: 'SALE_NEW',
                severity: 'INFO',
                href: '/sales',
                title: 'Yangi sotuv #12',
                body: 'Ali',
                createdAt: '2026-09-20T10:00:00.000Z',
                read: false,
              },
            ],
          },
        },
      },
      '/notifications/read': { status: 200, body: { success: true, data: { unreadCount: 0 } } },
    });

    renderWithProviders(
      <MemoryRouter>
        <BusinessNotificationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Yangi sotuv #12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yangi sotuv #12/i })).toHaveAttribute('href', '/sales');
    expect(screen.getByText('Sotuvlar')).toBeInTheDocument();
  });
});
