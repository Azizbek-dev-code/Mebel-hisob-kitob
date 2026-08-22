import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

const LIST_BODY = {
  status: 200,
  body: {
    success: true,
    data: {
      summary: {
        totalCustomers: 1,
        activeCount: 1,
        archivedCount: 0,
        customersInDebt: 1,
        totalOutstanding: 5_000_000,
        overdueAmount: 1_000_000,
      },
      items: [
        {
          id: 'cust_1',
          firstName: 'Ali',
          lastName: 'Valiyev',
          fullName: 'Ali Valiyev',
          phone: '+998901234567',
          notes: 'Urgut',
          address: null,
          status: 'ACTIVE',
          debtStatus: 'OVERDUE',
          totalPurchases: 10_000_000,
          totalPaid: 5_000_000,
          outstandingDebt: 5_000_000,
          overdueAmount: 1_000_000,
          openSaleCount: 1,
          lastSaleAt: '2026-08-10T00:00:00.000Z',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CustomersPage', () => {
  it('renders customer catalogue', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/customers?': LIST_BODY,
      '/customers': LIST_BODY,
    });

    renderWithProviders(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Mijozlar' })).toBeInTheDocument();
    expect(await screen.findByText('Ali Valiyev')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yangi mijoz/i })).toBeInTheDocument();
    expect(screen.getAllByText('Muddati o‘tgan').length).toBeGreaterThan(0);
  });
});
