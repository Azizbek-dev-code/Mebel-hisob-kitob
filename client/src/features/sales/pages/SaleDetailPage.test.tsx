import { SalePaymentStatus } from '@furniture-erp/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${digits}[\\s\\u00A0]*so'm`);
}

const getMock = vi.fn();
const addPaymentMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/services/sales.service', () => ({
  salesService: {
    get: (...args: unknown[]) => getMock(...args),
    addPayment: (...args: unknown[]) => addPaymentMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
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

import { SaleDetailPage } from './SaleDetailPage';

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
    address: 'Toshkent',
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
  deliveryDueDate: null,
  installationStatus: 'PENDING',
  subtotal: 9_500_000,
  discountAmount: 0,
  totalCostPrice: 7_000_000,
  depositAmount: 2_000_000,
  sellerBonus: 0,
  installationCost: 300_000,
  installerFee: 0,
  deliveryCost: 150_000,
  assemblerFee: 300_000,
  driverFee: 150_000,
  otherCosts: 0,
  grossProfit: 2_500_000,
  netProfit: 2_050_000,
  sellerCommissionEstimate: 250_000,
  sellerCommissionRateLabel: '10%',
  items: [
    {
      id: 'item_1',
      productId: 'prod_1',
      productName: 'Bedroom Set "Milano"',
      productSku: 'BR-MIL-01',
      productImageUrl: null,
      quantity: 1,
      unitCostPrice: 7_000_000,
      unitSalePrice: 9_500_000,
      lineCostTotal: 7_000_000,
      lineSaleTotal: 9_500_000,
    },
  ],
  payments: [
    {
      id: 'pay_1',
      amount: 2_000_000,
      method: 'CASH',
      paidAt: '2026-08-08T12:00:00.000Z',
      isDeposit: true,
      note: 'Initial deposit',
      createdBy: { id: 'user_admin', fullName: 'Admin', role: 'ADMIN' },
      createdAt: '2026-08-08T12:00:00.000Z',
    },
  ],
  installmentPlan: null,
  assembler: { id: 'user_ali', fullName: 'Ali Usta', role: 'EMPLOYEE' },
  installationWorker: { id: 'user_ali', fullName: 'Ali Usta', role: 'EMPLOYEE' },
  deliveryPerson: { id: 'user_shopir', fullName: 'Azizbek Shopir', role: 'EMPLOYEE' },
  createdBy: { id: 'user_admin', fullName: 'Admin', role: 'ADMIN' },
  cancelledBy: null,
  cancellationReason: null,
  cancelledAt: null,
  assemblyTasks: [],
  activeAssemblyTask: {
    id: 'task_1',
    saleId: 'sale_1',
    saleNumber: 123,
    status: 'PENDING',
    assignedAt: '2026-08-08T12:00:00.000Z',
    deadline: null,
    startedAt: null,
    completedAt: null,
    notes: null,
    assignee: { id: 'user_ali', fullName: 'Ali Usta', role: 'EMPLOYEE' },
    assignedBy: null,
    completedBy: null,
    customerName: 'Ali Valiyev',
    productSummary: 'Bedroom Set "Milano"',
  },
  installationDate: null,
  installationNotes: null,
  deliveryDate: null,
  deliveryAddress: null,
  deliveryNotes: null,
  notes: null,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
  workerCompensation: [],
  workerCompensationLocked: false,
  contributionAfterWorkerPay: 2_500_000,
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/sales/sale_1']}>
      <Routes>
        <Route path="/sales/:id" element={<SaleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  addPaymentMock.mockReset();
  updateMock.mockReset();
  getMock.mockResolvedValue(SALE);
  addPaymentMock.mockResolvedValue({
    sale: { ...SALE, paidAmount: 5_000_000, remainingAmount: 4_500_000 },
    payment: {
      id: 'pay_2',
      amount: 3_000_000,
      method: 'CARD',
      paidAt: '2026-08-15T12:00:00.000Z',
      isDeposit: false,
      note: null,
      createdBy: null,
      createdAt: '2026-08-15T12:00:00.000Z',
    },
  });
  updateMock.mockResolvedValue(SALE);
});

describe('SaleDetailPage', () => {
  it('shows profit waterfall, payment history and remaining balance', async () => {
    renderPage();

    expect(await screen.findByText('#S-000123')).toBeInTheDocument();
    expect(screen.getByTestId('sale-profit-waterfall')).toBeInTheDocument();
    expect(screen.getAllByText('Sotuv narxi').length).toBeGreaterThan(0);
    expect(screen.getByText('= Yalpi foyda')).toBeInTheDocument();
    expect(screen.getByText('= Sof foyda')).toBeInTheDocument();
    expect(screen.getByText('Initial deposit')).toBeInTheDocument();
    expect(screen.getAllByText('Ali Usta').length).toBeGreaterThan(0);
    expect(screen.getAllByText(moneyMatcher(7_500_000)).length).toBeGreaterThan(0);
  });

  it('adds a payment from the detail view', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Summa');
    const amountLabel = screen.getByText('Summa');
    const amountInput = amountLabel.parentElement?.querySelector('input');
    await user.type(amountInput!, '3000000');
    const paymentSave = screen
      .getAllByRole('button', { name: /Saqlash/i })
      .find((btn) => btn.getAttribute('data-testid') !== 'sale-fees-save');
    expect(paymentSave).toBeTruthy();
    await user.click(paymentSave!);

    await waitFor(() => {
      expect(addPaymentMock).toHaveBeenCalledWith(
        'sale_1',
        expect.objectContaining({ amount: 3_000_000 }),
      );
    });
  });

  it('shows Sotuvchilar va xizmat haqlari with seller estimate and fees', async () => {
    renderPage();
    expect(await screen.findByTestId('sale-people-services-section')).toBeInTheDocument();
    expect(screen.getByText(/Odamlar va xizmatlar/i)).toBeInTheDocument();
    expect(screen.getByTestId('sale-seller-commission')).toHaveTextContent(/Sardor/);
    expect(screen.getByTestId('sale-seller-commission')).toHaveTextContent(/10%/);
    expect(screen.getAllByText(/Ali Usta/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('sale-assembler-fee')).toBeInTheDocument();
    expect(screen.getByTestId('sale-delivery-fee')).toBeInTheDocument();
    expect(screen.queryByTestId('sale-installer-fee')).not.toBeInTheDocument();
    // Installer row can appear when an installation worker is assigned (fee may be 0).
    expect(screen.getByText(/O‘rnatuvchi/i)).toBeInTheDocument();
    expect(screen.queryByTestId('worker-compensation-empty')).not.toBeInTheDocument();
  });

  it('lets admin save usta and shopir fees', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('sale-fees-save');
    await user.click(screen.getByTestId('sale-fees-save'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'sale_1',
        expect.objectContaining({
          assemblerFee: 300_000,
          driverFee: 150_000,
        }),
      );
    });
    expect(updateMock.mock.calls[0]?.[1]?.installerFee).toBeUndefined();
  });
});
