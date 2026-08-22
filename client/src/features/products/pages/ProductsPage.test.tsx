import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';

const LIST_BODY = {
  status: 200,
  body: {
    success: true,
    data: {
      summary: {
        totalProducts: 1,
        activeCount: 1,
        archivedCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      items: [
        {
          id: 'prod_1',
          name: 'Spalni komplekt',
          sku: 'SP-15',
          description: null,
          imageUrl: null,
          categoryId: null,
          categoryName: 'Spalni',
          costPrice: 5_000_000,
          defaultSalePrice: 7_300_000,
          stockQty: 4,
          minStockQty: 2,
          trackStock: true,
          stockStatus: 'IN_STOCK',
          status: 'ACTIVE',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    },
  },
};

const CATEGORIES = {
  status: 200,
  body: { success: true, data: { categories: [] } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ProductsPage', () => {
  it('renders catalogue for admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/products?': LIST_BODY,
      '/products': LIST_BODY,
      '/product-categories': CATEGORIES,
    });

    renderWithProviders(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Mebellar' })).toBeInTheDocument();
    expect(await screen.findByText('Spalni komplekt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yangi mebel/i })).toBeInTheDocument();
  });

  it('redirects employees away from /products', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_EMPLOYEE } } },
      '/sales/assembly-tasks/mine': { status: 200, body: { success: true, data: { items: [] } } },
      '/me/stats': {
        status: 200,
        body: {
          success: true,
          data: {
            stats: {
              totalSales: 0,
              salesThisMonth: 0,
              salesToday: 0,
              totalAssemblyTasks: 0,
              completedAssemblyTasks: 0,
              pendingAssemblyTasks: 0,
              completedTasksThisMonth: 0,
            },
          },
        },
      },
    });

    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.products] })}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Mebellar' })).not.toBeInTheDocument();
    });
  });
});
