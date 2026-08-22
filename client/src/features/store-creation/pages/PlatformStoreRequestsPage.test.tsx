import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, within } from '@/test/test-utils';

import { PlatformStoreRequestDetailPage } from './PlatformStoreRequestDetailPage';
import { PlatformStoreRequestsPage } from './PlatformStoreRequestsPage';

const REQUEST = {
  id: 'req_1',
  applicantFirstName: 'Ali',
  applicantLastName: 'Valiyev',
  phone: '+998901112233',
  email: 'ali@example.com',
  username: 'alivaliyev',
  storeName: 'Fayz Mebel',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
  status: 'PENDING',
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdStoreId: null,
  reviewedById: null,
  reviewedByName: null,
};

const LIST_BODY = {
  success: true,
  data: {
    items: [REQUEST],
    pendingCount: 1,
    meta: {
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformStoreRequestsPage', () => {
  it('lists a pending request', async () => {
    mockApi({
      '/platform/store-requests': { status: 200, body: LIST_BODY },
    });
    renderWithProviders(
      <MemoryRouter>
        <PlatformStoreRequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Fayz Mebel')).toBeInTheDocument();
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    expect(screen.getByText('KUTILMOQDA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Ko'rish" })).toBeInTheDocument();
  });
});

describe('PlatformStoreRequestDetailPage', () => {
  it('opens the approve dialog', async () => {
    mockApi({
      '/platform/store-requests/req_1': {
        status: 200,
        body: { success: true, data: { request: REQUEST } },
      },
    });
    const user = userEvent.setup({ delay: null });
    renderWithProviders(
      <MemoryRouter initialEntries={['/platform/stores/requests/req_1']}>
        <Routes>
          <Route path="/platform/stores/requests/:id" element={<PlatformStoreRequestDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Qabul qilish' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Qabul qilish' }));
    expect(await screen.findByText("Do'konni ochishni tasdiqlaysizmi?")).toBeInTheDocument();
  });

  it('requires a rejection reason before submitting', async () => {
    mockApi({
      '/platform/store-requests/req_1': {
        status: 200,
        body: { success: true, data: { request: REQUEST } },
      },
    });
    const user = userEvent.setup({ delay: null });
    renderWithProviders(
      <MemoryRouter initialEntries={['/platform/stores/requests/req_1']}>
        <Routes>
          <Route path="/platform/stores/requests/:id" element={<PlatformStoreRequestDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Rad etish' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Rad etish sababi' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Rad etish' })).toBeDisabled();
  });
});

describe('platform store request 403', () => {
  it('shows 403 for a store ADMIN', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
    });
    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.platformStoreRequests] })}
      />,
    );

    expect(await screen.findByRole('heading', { name: /403/ })).toBeInTheDocument();
    expect(screen.queryByText('Fayz Mebel')).not.toBeInTheDocument();
  });

  it('does not 403 a PLATFORM_ADMIN', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/store-requests/summary': {
        status: 200,
        body: { success: true, data: { pendingCount: 1 } },
      },
      '/platform/store-requests': { status: 200, body: LIST_BODY },
    });
    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.platformStoreRequests] })}
      />,
    );

    expect(await screen.findByText('Fayz Mebel')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /403/ })).not.toBeInTheDocument();
  });
});
