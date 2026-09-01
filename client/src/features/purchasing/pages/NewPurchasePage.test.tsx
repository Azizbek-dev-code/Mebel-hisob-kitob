import { WorkerResponsibility } from '@furniture-erp/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

const createPurchaseMock = vi.fn();
const suppliersListMock = vi.fn();
const productsMock = vi.fn();
const workersMock = vi.fn();

vi.mock('@/services/purchasing.service', () => ({
  purchasingService: {
    createPurchase: (...args: unknown[]) => createPurchaseMock(...args),
    createSupplier: vi.fn(),
    listSuppliers: (...args: unknown[]) => suppliersListMock(...args),
    getSupplier: vi.fn(),
  },
}));

vi.mock('@/services/lookups.service', () => ({
  lookupsService: {
    products: (...args: unknown[]) => productsMock(...args),
    workers: (...args: unknown[]) => workersMock(...args),
  },
}));

import { NewPurchasePage } from './NewPurchasePage';

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <NewPurchasePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  createPurchaseMock.mockReset();
  suppliersListMock.mockResolvedValue({
    summary: {
      totalSuppliers: 1,
      activeCount: 1,
      archivedCount: 0,
      suppliersInDebt: 0,
      totalOutstanding: 0,
    },
    items: [
      {
        id: 'sup_1',
        name: 'Shermat aka',
        phone: '+998901112233',
        notes: null,
        status: 'ACTIVE',
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        openPurchaseCount: 0,
        lastPurchaseAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  productsMock.mockResolvedValue([
    {
      id: 'prod_1',
      name: 'Divan',
      sku: 'DV-1',
      costPrice: 5_200_000,
      defaultSalePrice: 7_000_000,
    },
  ]);
  workersMock.mockResolvedValue([
    { id: 'drv_1', fullName: 'Abdulla', responsibilities: [WorkerResponsibility.DELIVERY] },
  ]);
});

describe('NewPurchasePage delivery fields', () => {
  it('renders Yetkazib berish section with date, days, shopir and fee', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yangi kirim' })).toBeInTheDocument();
    expect(screen.getByText('Yetkazib berish')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-delivered-at')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-delivery-days')).toBeInTheDocument();
    expect(await screen.findByTestId('purchase-driver')).toBeInTheDocument();
    expect(screen.getAllByText('Shopir haqi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mahsulotlar').length).toBeGreaterThan(0);
    expect(screen.getByText('Qolgan qarz')).toBeInTheDocument();
  });

  it('accepts delivery days and shopir selection', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Yetkazib berish');

    const days = screen.getByTestId('purchase-delivery-days');
    await user.clear(days);
    await user.type(days, '3');
    expect(days).toHaveValue(3);

    const driver = await screen.findByTestId('purchase-driver');
    await user.selectOptions(driver, 'drv_1');
    expect(driver).toHaveValue('drv_1');
  });
});
