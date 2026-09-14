import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformAccountsPage } from './PlatformAccountsPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformAccountsPage', () => {
  it('lists personal and furniture business rows from the unified API', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/accounts': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'ws_p',
                source: 'WORKSPACE',
                accountType: 'PERSONAL',
                businessType: null,
                name: 'Shaxsiy moliya',
                ownerName: 'Amirxon',
                ownerEmail: 'amir@example.com',
                status: 'ACTIVE',
                planName: 'Pullik',
                createdAt: '2026-09-13T00:00:00.000Z',
                workspaceId: 'ws_p',
                storeId: null,
                requestId: null,
              },
              {
                id: 'ws_b',
                source: 'WORKSPACE',
                accountType: 'BUSINESS',
                businessType: 'FURNITURE',
                name: 'Fayz Mebel',
                ownerName: 'Azizbek',
                ownerEmail: 'aziz@store.uz',
                status: 'ACTIVE',
                planName: 'PRO',
                createdAt: '2026-09-12T00:00:00.000Z',
                workspaceId: 'ws_b',
                storeId: 'store_1',
                requestId: null,
              },
            ],
            summary: {
              total: 2,
              active: 2,
              trial: 0,
              pending: 0,
              expired: 0,
              blocked: 0,
              cancelled: 0,
            },
            businessTypes: ['FURNITURE'],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformAccountsPage filter="all" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Amirxon')).toBeInTheDocument();
    expect(screen.getByText('Fayz Mebel')).toBeInTheDocument();
    expect(screen.getByText('Mebel')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.queryByText('Gilam')).not.toBeInTheDocument();
    expect(screen.queryByText('Kiyim')).not.toBeInTheDocument();
  });

  it('shows furniture/carpet/clothing/electronics/other on the business tab', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/accounts': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [],
            summary: {
              total: 0,
              active: 0,
              trial: 0,
              pending: 0,
              expired: 0,
              blocked: 0,
              cancelled: 0,
            },
            businessTypes: ['FURNITURE'],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformAccountsPage filter="business" />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('option', { name: 'Mebel' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gilam' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kiyim' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Telefon/Elektronika' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Boshqa' })).toBeInTheDocument();
  });
});
