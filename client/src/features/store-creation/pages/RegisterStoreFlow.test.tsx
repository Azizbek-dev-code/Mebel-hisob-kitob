import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { RegisterStorePage } from './RegisterStorePage';
import { StoreRequestStatusPage } from './StoreRequestStatusPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('store creation browser flow', () => {
  it('keeps the public form from overflowing at 390px-class layouts', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    const { container } = renderWithProviders(
      <MemoryRouter>
        <RegisterStorePage />
      </MemoryRouter>,
    );

    expect(container.querySelector('main')).toHaveClass('overflow-x-hidden');
    expect(await screen.findByRole('heading', { name: "Yangi do'kon ochish" })).toBeInTheDocument();
  });

  it('shows the pending screen copy after a successful submit payload', async () => {
    mockApi({
      '/store-requests/req_1': {
        status: 200,
        body: {
          success: true,
          data: {
            request: {
              id: 'req_1',
              applicantFirstName: 'Test',
              applicantLastName: 'Store Owner',
              phone: '+998901112233',
              email: 'owner@example.com',
              username: 'testowner',
              storeName: 'TEST Furniture Store',
              region: 'Samarqand',
              district: 'Urgut',
              address: 'Urgut',
              status: 'PENDING',
              rejectionReason: null,
              reviewedAt: null,
              createdAt: '2026-08-21T00:00:00.000Z',
              updatedAt: '2026-08-21T00:00:00.000Z',
              createdStoreId: null,
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/register-store/req_1']}>
        <Routes>
          <Route path="/register-store/:id" element={<StoreRequestStatusPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('KUTILMOQDA')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('overflow-x-hidden');
  });
});
