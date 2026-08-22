import { calculateSaleTotals } from '@furniture-erp/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${digits}[\\s\\u00A0]*so'm`);
}

const createMock = vi.fn();
const customersMock = vi.fn();
const productsMock = vi.fn();
const workersMock = vi.fn();
const createProductMock = vi.fn();
const listCategoriesMock = vi.fn();
const currentUserMock = vi.fn();

vi.mock('@/services/sales.service', () => ({
  salesService: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

vi.mock('@/services/lookups.service', () => ({
  lookupsService: {
    customers: (...args: unknown[]) => customersMock(...args),
    products: (...args: unknown[]) => productsMock(...args),
    workers: (...args: unknown[]) => workersMock(...args),
    createCustomer: vi.fn(),
  },
}));

vi.mock('@/services/products.service', () => ({
  productsService: {
    create: (...args: unknown[]) => createProductMock(...args),
    listCategories: (...args: unknown[]) => listCategoriesMock(...args),
  },
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useCurrentUser: () => currentUserMock(),
}));

import { NewSalePage } from './NewSalePage';

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <NewSalePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  createMock.mockReset();
  createProductMock.mockReset();
  listCategoriesMock.mockReset();
  currentUserMock.mockReturnValue({
    data: {
      id: 'user_admin',
      fullName: 'Store Administrator',
      role: 'ADMIN',
      storeId: 'store_1',
      storeName: 'Mebel Savdo',
    },
    isLoading: false,
  });
  customersMock.mockResolvedValue([
    {
      id: 'cust_1',
      firstName: 'Ali',
      lastName: 'Valiyev',
      phone: '+998901111111',
      address: null,
    },
  ]);
  productsMock.mockResolvedValue([
    {
      id: 'prod_1',
      name: 'Bedroom Set "Milano"',
      sku: 'BR-MIL-01',
      imageUrl: null,
      costPrice: 7_000_000,
      defaultSalePrice: 9_500_000,
      categoryName: 'Bedroom',
      stockQty: 10,
      minStockQty: 2,
      trackStock: true,
    },
  ]);
  workersMock.mockResolvedValue([
    {
      id: 'user_admin',
      fullName: 'Store Administrator',
      role: 'ADMIN',
      phone: null,
      responsibilities: ['SELLER', 'ASSEMBLER', 'DELIVERY'],
    },
    {
      id: 'user_ali',
      fullName: 'Ali Usta',
      role: 'EMPLOYEE',
      phone: null,
      responsibilities: ['ASSEMBLER', 'SELLER'],
    },
  ]);
  listCategoriesMock.mockResolvedValue([
    {
      id: 'cat_1',
      name: 'Bedroom',
      description: null,
      sortOrder: 0,
      isActive: true,
      productCount: 1,
    },
  ]);
  createMock.mockResolvedValue({ id: 'sale_1', saleNumber: 1 });
});

describe('NewSalePage', () => {
  it('shows live totals from the shared accounting helper', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'New sale' })).toBeInTheDocument();

    await user.click(screen.getByPlaceholderText(/Search by name or phone/i));
    await user.click(await screen.findByText('Ali Valiyev'));

    await user.click(screen.getByPlaceholderText(/Mebel qidirish/i));
    await user.click(await screen.findByText('Bedroom Set "Milano"'));

    const expected = calculateSaleTotals({
      items: [{ quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
      depositAmount: 0,
    });

    await waitFor(() => {
      expect(screen.getAllByText(moneyMatcher(expected.totalSalePrice)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(moneyMatcher(expected.grossProfit)).length).toBeGreaterThan(0);
    });
  });

  it('requires customer and product before submit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Save sale/i }));
    expect(await screen.findByText(/Select a customer and a product/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('submits a sale with deposit and assembly worker', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByPlaceholderText(/Search by name or phone/i));
    await user.click(await screen.findByText('Ali Valiyev'));

    await user.click(screen.getByPlaceholderText(/Mebel qidirish/i));
    await user.click(await screen.findByText('Bedroom Set "Milano"'));

    const depositLabel = screen.getByText('Deposit / zaklat');
    const depositInput = depositLabel.parentElement?.querySelector('input');
    expect(depositInput).toBeTruthy();
    await user.clear(depositInput!);
    await user.type(depositInput!, '2000000');

    const assemblySelect = screen.getByDisplayValue('None');
    await user.selectOptions(assemblySelect, 'user_ali');

    await user.click(screen.getByRole('button', { name: /Save sale/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust_1',
          assemblerId: 'user_ali',
          depositAmount: 2_000_000,
          assemblerFee: 0,
          driverFee: 0,
          items: [
            expect.objectContaining({
              productId: 'prod_1',
              unitCostPrice: 7_000_000,
              unitSalePrice: 9_500_000,
            }),
          ],
        }),
      );
    });
    expect(createMock.mock.calls[0]?.[0]?.workerCompensation).toBeUndefined();
  });

  it('shows Usta and Shopir fee fields instead of Ish haqlari roles', async () => {
    renderPage();
    expect(await screen.findByTestId('sale-service-fees')).toBeInTheDocument();
    expect(screen.getByText('Usta haqqi')).toBeInTheDocument();
    expect(screen.getByText('Shopir haqqi')).toBeInTheDocument();
    expect(screen.queryByTestId('worker-compensation-section')).not.toBeInTheDocument();
  });

  it('submits usta and shopir fees as assemblerFee / driverFee', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByPlaceholderText(/Search by name or phone/i));
    await user.click(await screen.findByText('Ali Valiyev'));

    await user.click(screen.getByPlaceholderText(/Mebel qidirish/i));
    await user.click(await screen.findByText('Bedroom Set "Milano"'));

    const ustaLabel = screen.getByText('Usta haqqi');
    const ustaInput = ustaLabel.parentElement?.querySelector('input');
    await user.type(ustaInput!, '300000');

    const shopirLabel = screen.getByText('Shopir haqqi');
    const shopirInput = shopirLabel.parentElement?.querySelector('input');
    await user.type(shopirInput!, '150000');

    await user.click(screen.getByRole('button', { name: /Save sale/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          assemblerFee: 300_000,
          driverFee: 150_000,
        }),
      );
    });
  });

  it('lets an admin quick-create furniture and select it on the sale', async () => {
    const user = userEvent.setup();
    createProductMock.mockResolvedValue({
      id: 'prod_quick',
      name: 'Divan Royal',
      sku: 'DV-ROY-01',
      description: null,
      imageUrl: null,
      categoryId: 'cat_1',
      categoryName: 'Bedroom',
      costPrice: 4_000_000,
      defaultSalePrice: 5_500_000,
      stockQty: 0,
      minStockQty: 0,
      trackStock: false,
      stockStatus: 'UNTRACKED',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderPage();

    await user.click(screen.getByTestId('sale-quick-product-toggle'));
    expect(await screen.findByTestId('sale-quick-product-form')).toBeInTheDocument();

    await user.type(screen.getByTestId('sale-quick-product-name'), 'Divan Royal');
    await user.selectOptions(screen.getByTestId('sale-quick-product-category'), 'cat_1');
    await user.type(screen.getByTestId('sale-quick-product-sku'), 'DV-ROY-01');

    const salePriceLabel = screen.getByText('Sotuv narxi *');
    const salePriceInput = salePriceLabel.parentElement?.querySelector('input');
    await user.clear(salePriceInput!);
    await user.type(salePriceInput!, '5500000');

    const costLabel = screen.getByText('Tannarx');
    const costInput = costLabel.parentElement?.querySelector('input');
    await user.clear(costInput!);
    await user.type(costInput!, '4000000');

    await user.click(screen.getByTestId('sale-quick-product-save'));

    await waitFor(() => {
      expect(createProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Divan Royal',
          sku: 'DV-ROY-01',
          categoryId: 'cat_1',
          costPrice: 4_000_000,
          defaultSalePrice: 5_500_000,
          trackStock: false,
          minStockQty: 0,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('sale-quick-product-form')).not.toBeInTheDocument();
      expect(screen.getByText('Divan Royal')).toBeInTheDocument();
    });

    await user.click(screen.getByPlaceholderText(/Search by name or phone/i));
    await user.click(await screen.findByText('Ali Valiyev'));
    await user.click(screen.getByRole('button', { name: /Save sale/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              productId: 'prod_quick',
              unitCostPrice: 4_000_000,
              unitSalePrice: 5_500_000,
            }),
          ],
        }),
      );
    });
  });

  it('keeps the sale form open and shows an error when product create fails', async () => {
    const user = userEvent.setup();
    const { ApiClientError } = await import('@/lib/api-client');
    createProductMock.mockRejectedValue(
      new ApiClientError(422, 'VALIDATION_ERROR', 'SKU must be unique within the store', [
        { field: 'sku', message: 'SKU must be unique within the store' },
      ]),
    );

    renderPage();

    await user.click(screen.getByTestId('sale-quick-product-toggle'));
    await user.type(screen.getByTestId('sale-quick-product-name'), 'Dup Sofa');
    const salePriceLabel = screen.getByText('Sotuv narxi *');
    const salePriceInput = salePriceLabel.parentElement?.querySelector('input');
    await user.clear(salePriceInput!);
    await user.type(salePriceInput!, '1000000');
    await user.type(screen.getByTestId('sale-quick-product-sku'), 'DUP');
    await user.click(screen.getByTestId('sale-quick-product-save'));

    expect(await screen.findByTestId('sale-quick-product-error')).toHaveTextContent(
      /SKU must be unique/i,
    );
    expect(screen.getByTestId('sale-quick-product-form')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('hides quick product create for employees without inventory access', () => {
    currentUserMock.mockReturnValue({
      data: {
        id: 'user_emp',
        fullName: 'Seller Emp',
        role: 'EMPLOYEE',
        storeId: 'store_1',
        storeName: 'Mebel Savdo',
      },
      isLoading: false,
    });

    renderPage();
    expect(screen.queryByTestId('sale-quick-product-toggle')).not.toBeInTheDocument();
  });

  it('does not create a product when quick-create validation fails', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('sale-quick-product-toggle'));
    await user.click(screen.getByTestId('sale-quick-product-save'));

    expect(await screen.findByTestId('sale-quick-product-error')).toHaveTextContent(/Nomi majburiy/i);
    expect(createProductMock).not.toHaveBeenCalled();
  });
});
