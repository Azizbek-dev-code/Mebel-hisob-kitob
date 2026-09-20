import type { AuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformUsageOverviewPage } from './PlatformUsageAnalyticsPages';

const ADMIN: AuthUser = {
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Admin',
  phone: null,
  role: 'PLATFORM_ADMIN',
  responsibilities: [],
  storeId: 'store_1',
  storeName: 'Platform',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformUsageOverviewPage', () => {
  it('renders usage metrics without financial fields', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: ADMIN } } },
      '/platform/usage/overview': {
        status: 200,
        body: {
          success: true,
          data: {
            totalUsers: 12,
            activeToday: 4,
            onlineNow: 2,
            dau: 4,
            wau: 8,
            mau: 10,
            averageDailyUsageSeconds: 3600,
            averageSessionSeconds: 900,
            personalUsers: 7,
            businessUsers: 5,
            newUsers: 1,
            returningUsers: 3,
            d1Retention: 40,
            d7Retention: 20,
            d30Retention: 10,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformUsageOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Platforma analitikasi' })).toBeInTheDocument();
    expect(await screen.findByText('Jami foydalanuvchilar')).toBeInTheDocument();
    expect(screen.queryByText(/so‘m|amount|profit|balance/i)).not.toBeInTheDocument();
  });

  it('surfaces the API error message instead of only a generic retry hint', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: ADMIN } } },
      '/platform/usage/overview': {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'The table public.identity_presence does not exist' },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformUsageOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Analitika yuklanmadi')).toBeInTheDocument();
    expect(
      await screen.findByText('The table public.identity_presence does not exist'),
    ).toBeInTheDocument();
  });
});
