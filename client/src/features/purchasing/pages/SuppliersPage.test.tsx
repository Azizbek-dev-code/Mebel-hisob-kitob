import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SuppliersPage } from '@/features/purchasing/pages/SuppliersPage';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

const LIST_BODY = {
  status: 200,
  body: {
    success: true,
    data: {
      summary: {
        totalSuppliers: 1,
        activeCount: 1,
        archivedCount: 0,
        suppliersInDebt: 1,
        totalOutstanding: 5_000_000,
      },
      items: [
        {
          id: 'sup_1',
          name: 'Urgut Ombor',
          phone: '+998901234567',
          notes: 'Asosiy',
          status: 'ACTIVE',
          totalPurchases: 10_000_000,
          totalPaid: 5_000_000,
          outstandingDebt: 5_000_000,
          openPurchaseCount: 1,
          lastPurchaseAt: '2026-08-10T00:00:00.000Z',
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

describe('SuppliersPage', () => {
  it('renders supplier catalogue', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/suppliers?': LIST_BODY,
      '/suppliers': LIST_BODY,
    });

    renderWithProviders(
      <MemoryRouter>
        <SuppliersPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Yetkazuvchilar' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Urgut Ombor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yangi yetkazuvchi/i })).toBeInTheDocument();
    expect(screen.getAllByText('Qarzimiz bor').length).toBeGreaterThan(0);
  });
});
