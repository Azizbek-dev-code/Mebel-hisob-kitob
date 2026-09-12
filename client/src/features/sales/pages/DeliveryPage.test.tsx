import { FulfilmentStatus } from '@furniture-erp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { DeliveryPage } from './DeliveryPage';

const myDeliveriesMock = vi.fn();
const updateDeliveryStatusMock = vi.fn();
const updatePurchaseDeliveryStatusMock = vi.fn();

vi.mock('@/services/sales.service', () => ({
  salesService: {
    myDeliveries: (...args: unknown[]) => myDeliveriesMock(...args),
    updateDeliveryStatus: (...args: unknown[]) => updateDeliveryStatusMock(...args),
    updatePurchaseDeliveryStatus: (...args: unknown[]) =>
      updatePurchaseDeliveryStatusMock(...args),
  },
}));

const SALE_ITEM = {
  kind: 'SALE' as const,
  id: 'sale_1',
  saleId: 'sale_1',
  saleNumber: 11,
  customerName: 'Client Client',
  customerPhone: '+998901112233',
  address: 'jgdsg',
  saleDate: '2026-08-25T10:00:00.000Z',
  deliveryDueDate: '2026-08-26T10:00:00.000Z',
  deliveryDate: null,
  status: FulfilmentStatus.SCHEDULED,
  fee: 120_000,
  ledgerStatus: 'PENDING' as const,
  hint: 'Shopir haqi yetkazib berish yakunlangandan keyin hisobga olinadi.',
  canStart: true,
  canComplete: false,
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <DeliveryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  myDeliveriesMock.mockReset();
  updateDeliveryStatusMock.mockReset();
  updatePurchaseDeliveryStatusMock.mockReset();
  myDeliveriesMock.mockResolvedValue({
    kpis: {
      todayTotal: 1,
      todayPending: 1,
      todayInProgress: 0,
      todayCompleted: 0,
      todayEarned: 0,
      monthTotal: 1,
      monthEarned: 0,
      monthPaid: 0,
      monthOutstanding: 0,
    },
    saleDeliveries: [SALE_ITEM],
    purchaseDeliveries: [],
  });
});

describe('DeliveryPage', () => {
  it('shows KPIs and assigned sale delivery with start action', async () => {
    renderPage();
    expect(await screen.findByTestId('delivery-kpis')).toBeInTheDocument();
    expect(screen.getByText(/Sotuv yetkazib berishlari/i)).toBeInTheDocument();
    expect(screen.getByText(/Client Client/i)).toBeInTheDocument();
    expect(screen.getByTestId('start-delivery-sale_1')).toBeInTheDocument();
    expect(screen.queryByTestId('complete-delivery-sale_1')).not.toBeInTheDocument();
  });

  it('starts delivery and shows server feedback', async () => {
    const user = userEvent.setup();
    updateDeliveryStatusMock.mockResolvedValue({
      sale: { id: 'sale_1', deliveryStatus: FulfilmentStatus.IN_TRANSIT },
      ledgerPosted: false,
      message: 'Yetkazib berish boshlandi.',
    });
    myDeliveriesMock
      .mockResolvedValueOnce({
        kpis: {
          todayTotal: 1,
          todayPending: 1,
          todayInProgress: 0,
          todayCompleted: 0,
          todayEarned: 0,
          monthTotal: 1,
          monthEarned: 0,
          monthPaid: 0,
          monthOutstanding: 0,
        },
        saleDeliveries: [SALE_ITEM],
        purchaseDeliveries: [],
      })
      .mockResolvedValue({
        kpis: {
          todayTotal: 1,
          todayPending: 0,
          todayInProgress: 1,
          todayCompleted: 0,
          todayEarned: 0,
          monthTotal: 1,
          monthEarned: 0,
          monthPaid: 0,
          monthOutstanding: 0,
        },
        saleDeliveries: [
          {
            ...SALE_ITEM,
            status: FulfilmentStatus.IN_TRANSIT,
            canStart: false,
            canComplete: true,
          },
        ],
        purchaseDeliveries: [],
      });

    renderPage();
    await user.click(await screen.findByTestId('start-delivery-sale_1'));

    await waitFor(() => {
      expect(updateDeliveryStatusMock).toHaveBeenCalledWith('sale_1', {
        status: 'IN_TRANSIT',
      });
    });
    expect(await screen.findByText(/Yetkazib berish boshlandi/i)).toBeInTheDocument();
  });

  it('completes in-progress delivery after confirmation', async () => {
    const user = userEvent.setup();
    myDeliveriesMock.mockResolvedValue({
      kpis: {
        todayTotal: 1,
        todayPending: 0,
        todayInProgress: 1,
        todayCompleted: 0,
        todayEarned: 0,
        monthTotal: 1,
        monthEarned: 0,
        monthPaid: 0,
        monthOutstanding: 0,
      },
      saleDeliveries: [
        {
          ...SALE_ITEM,
          status: FulfilmentStatus.IN_TRANSIT,
          canStart: false,
          canComplete: true,
        },
      ],
      purchaseDeliveries: [],
    });
    updateDeliveryStatusMock.mockResolvedValue({
      sale: { id: 'sale_1', deliveryStatus: FulfilmentStatus.COMPLETED },
      ledgerPosted: true,
      message: 'Yetkazib berish yakunlandi. 120 000 so‘m shopir haqi hisobga tushdi.',
    });

    renderPage();
    await user.click(await screen.findByTestId('complete-delivery-sale_1'));
    expect(await screen.findByText(/mijozga topshirildimi/i)).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Yakunlash/i }));

    await waitFor(() => {
      expect(updateDeliveryStatusMock).toHaveBeenCalledWith('sale_1', {
        status: 'COMPLETED',
      });
    });
    expect(await screen.findByText(/hisobga tushdi/i)).toBeInTheDocument();
  });

  it('shows empty state when no deliveries', async () => {
    myDeliveriesMock.mockResolvedValue({
      kpis: {
        todayTotal: 0,
        todayPending: 0,
        todayInProgress: 0,
        todayCompleted: 0,
        todayEarned: 0,
        monthTotal: 0,
        monthEarned: 0,
        monthPaid: 0,
        monthOutstanding: 0,
      },
      saleDeliveries: [],
      purchaseDeliveries: [],
    });
    renderPage();
    expect(
      await screen.findByText(/Bugun sizga yetkazib berish tayinlanmagan/i),
    ).toBeInTheDocument();
  });

  it('shows error state on load failure', async () => {
    myDeliveriesMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(
      await screen.findByText(/Yetkazib berishlarni yuklashda xatolik/i),
    ).toBeInTheDocument();
  });

  it('completes a pending purchase pickup', async () => {
    const user = userEvent.setup();
    myDeliveriesMock.mockResolvedValue({
      kpis: {
        todayTotal: 0,
        todayPending: 0,
        todayInProgress: 0,
        todayCompleted: 0,
        todayEarned: 0,
        monthTotal: 1,
        monthEarned: 0,
        monthPaid: 0,
        monthOutstanding: 0,
      },
      saleDeliveries: [],
      purchaseDeliveries: [
        {
          kind: 'PURCHASE',
          id: 'pur_1',
          purchaseNumber: 5,
          supplierName: 'Wood Supply',
          date: '2026-08-25T10:00:00.000Z',
          deliveredAt: null,
          purchaseStatus: 'ACTIVE',
          status: 'PENDING',
          fee: 100_000,
          ledgerStatus: 'PENDING',
          canStart: false,
          canComplete: true,
          hint: 'Shopir haqi yuk olib kelingandan (yakunlangandan) keyin hisobga olinadi.',
        },
      ],
    });
    updatePurchaseDeliveryStatusMock.mockResolvedValue({
      purchaseId: 'pur_1',
      purchaseNumber: 5,
      deliveredAt: '2026-09-12T00:00:00.000Z',
      ledgerPosted: true,
      message: 'Kirim yetkazib berish yakunlandi. 100 000 so‘m shopir haqi hisobga tushdi.',
    });

    renderPage();
    await user.click(await screen.findByTestId('complete-purchase-delivery-pur_1'));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Yakunlash/i }));

    await waitFor(() => {
      expect(updatePurchaseDeliveryStatusMock).toHaveBeenCalledWith('pur_1', {
        status: 'COMPLETED',
      });
    });
    expect(await screen.findByText(/Kirim yetkazib berish yakunlandi/i)).toBeInTheDocument();
  });
});
