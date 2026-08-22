import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { StoreRequestStatusPage } from './StoreRequestStatusPage';

const BASE = {
  id: 'req_1',
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
  rejectionReason: null as string | null,
  reviewedAt: null,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdStoreId: null,
};

function renderStatus() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/register-store/req_1']}>
      <Routes>
        <Route path="/register-store/:id" element={<StoreRequestStatusPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StoreRequestStatusPage', () => {
  it('shows the pending confirmation', async () => {
    mockApi({
      '/store-requests/req_1': {
        status: 200,
        body: { success: true, data: { request: { ...BASE, status: 'PENDING' } } },
      },
    });
    renderStatus();

    expect(await screen.findByRole('heading', { name: 'Arizangiz yuborildi' })).toBeInTheDocument();
    expect(
      screen.getByText("Do'kon ochish so'rovingiz Platform Admin tomonidan ko'rib chiqiladi."),
    ).toBeInTheDocument();
    expect(screen.getByText('KUTILMOQDA')).toBeInTheDocument();
  });

  it('shows the rejection reason', async () => {
    mockApi({
      '/store-requests/req_1': {
        status: 200,
        body: {
          success: true,
          data: {
            request: { ...BASE, status: 'REJECTED', rejectionReason: 'Hujjatlar to‘liq emas' },
          },
        },
      },
    });
    renderStatus();

    expect(await screen.findByText('RAD ETILDI')).toBeInTheDocument();
    expect(screen.getByText('Hujjatlar to‘liq emas')).toBeInTheDocument();
  });

  it('offers login after approval', async () => {
    mockApi({
      '/store-requests/req_1': {
        status: 200,
        body: { success: true, data: { request: { ...BASE, status: 'APPROVED' } } },
      },
    });
    renderStatus();

    expect(await screen.findByText('QABUL QILINDI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kirish' })).toHaveAttribute('href', '/login');
  });
});
