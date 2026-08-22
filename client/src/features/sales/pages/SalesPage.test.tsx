import { SalePaymentStatus } from '@furniture-erp/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

const listMock = vi.fn();
const workersMock = vi.fn();

vi.mock('@/services/sales.service', () => ({
  salesService: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

vi.mock('@/services/lookups.service', () => ({
  lookupsService: {
    workers: (...args: unknown[]) => workersMock(...args),
  },
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'user_admin',
      fullName: 'Admin',
      role: 'ADMIN',
      storeId: 'store_1',
      storeName: 'Mebel Savdo',
    },
    isLoading: false,
  }),
}));

import { SalesPage } from './SalesPage';

const SALE = {
  id: 'sale_1',
  saleNumber: 123,
  saleDate: '2026-08-08T12:00:00.000Z',
  status: 'ACTIVE',
  customer: {
    id: 'cust_1',
    firstName: 'Ali',
    lastName: 'Valiyev',
    phone: '+998901111111',
    address: null,
  },
  productSummary: 'Bedroom Set "Milano"',
  itemCount: 1,
  seller: { id: 'user_1', fullName: 'Sardor', role: 'CASHIER' },
  totalSalePrice: 9_500_000,
  paidAmount: 2_000_000,
  remainingAmount: 7_500_000,
  paymentStatus: SalePaymentStatus.PARTIALLY_PAID,
  paymentType: 'DEPOSIT',
  assemblyStatus: 'PENDING',
  deliveryStatus: 'NOT_REQUIRED',
  installationStatus: 'PENDING',
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <SalesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  workersMock.mockReset();
  workersMock.mockResolvedValue([]);
  listMock.mockResolvedValue({
    items: [SALE],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe('SalesPage', () => {
  it('renders the sales list with financial columns', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Sotuvlar' })).toBeInTheDocument();
    expect(await screen.findByText('#S-000123')).toBeInTheDocument();
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    expect(screen.getByText(/9[\s\u00A0]*500[\s\u00A0]*000/)).toBeInTheDocument();
    expect(screen.getAllByText('Part paid').length).toBeGreaterThan(0);
  });

  it('applies search filter to the list query', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('#S-000123');
    await user.type(screen.getByPlaceholderText(/Search customer/i), 'Ali');

    await waitFor(() => {
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Ali' }),
        expect.anything(),
      );
    });
  });

  it('links to the new sale form', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: /New sale/i });
    expect(link).toHaveAttribute('href', '/sales/new');
  });
});
