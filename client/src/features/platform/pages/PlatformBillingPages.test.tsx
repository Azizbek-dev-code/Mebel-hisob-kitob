import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformPlansPage } from './PlatformPlansPage';
import { PlatformPaymentsHistoryPage } from './PlatformPaymentsPages';
import { AccessBlockedPage } from './AccessBlockedPage';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { StoreAccessStatus } from '@furniture-erp/shared';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('platform billing UI', () => {
  it('lists plans without overflowing the 390px layout class', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/plans': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'plan_1',
                name: 'START',
                description: 'Asosiy',
                monthlyPrice: 150000,
                currency: 'UZS',
                isActive: true,
                features: {},
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        },
      },
    });
    const { container } = renderWithProviders(
      <MemoryRouter>
        <PlatformPlansPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('START')).toBeInTheDocument();
    expect(container.querySelector('.overflow-x-hidden')).toBeTruthy();
  });

  it('shows pending payments and a record-payment action', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/invoices': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'inv_1',
                storeId: 'store_1',
                storeName: 'Fayz Mebel',
                ownerName: 'Ali',
                ownerPhone: '+998901112233',
                subscriptionId: 'sub_1',
                planId: 'plan_1',
                planName: 'PRO',
                amount: 200000,
                currency: 'UZS',
                billingPeriodStart: '2026-09-01T00:00:00.000Z',
                billingPeriodEnd: '2026-10-01T00:00:00.000Z',
                dueDate: '2026-09-22T00:00:00.000Z',
                status: 'PENDING',
                paidAt: null,
                paymentMethod: null,
                reference: null,
                note: null,
                durationMonths: 1,
                rejectionReason: null,
                daysOverdue: 0,
                createdAt: '2026-08-22T00:00:00.000Z',
              },
            ],
            totalAmount: 200000,
            storeCount: 1,
            meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          },
        },
      },
      '/platform/shops': { status: 200, body: { success: true, data: { items: [] } } },
      '/platform/plans': { status: 200, body: { success: true, data: { items: [] } } },
    });
    renderWithProviders(
      <MemoryRouter>
        <PlatformPaymentsHistoryPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Fayz Mebel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /To'lovni qayd etish/ })).toBeInTheDocument();
  });

  it('shows the payment-required screen for a blocked owner', async () => {
    mockApi({
      '/auth/me': {
        status: 200,
        body: {
          success: true,
          data: { user: { ...TEST_ADMIN, storeAccessStatus: StoreAccessStatus.PAYMENT_BLOCKED } },
        },
      },
      '/store-access': {
        status: 200,
        body: {
          success: true,
          data: {
            access: {
              storeName: 'Fayz Mebel',
              accessStatus: StoreAccessStatus.PAYMENT_BLOCKED,
              planName: 'PRO',
              outstandingAmount: 200000,
              dueDate: '2026-09-22T00:00:00.000Z',
              daysOverdue: 4,
            },
          },
        },
      },
    });
    renderWithProviders(
      <MemoryRouter>
        <AccessBlockedPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/vaqtinchalik bloklangan/)).toBeInTheDocument();
    expect(await screen.findByText('Fayz Mebel')).toBeInTheDocument();
    expect(screen.getByText(/Platforma administratori/)).toBeInTheDocument();
  });
});
