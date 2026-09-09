import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformShopDetailPage } from './PlatformShopDetailPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformShopDetailPage', () => {
  it('shows store profile, tariff, stats and payment history', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/shops/store_1': {
        status: 200,
        body: {
          success: true,
          data: {
            shop: {
              id: 'store_1',
              name: 'Fayz mebel',
              phone: '+998901112233',
              address: 'Urgut',
              isActive: true,
              accessStatus: 'ACTIVE',
              planName: 'START',
              monthlyPrice: 150000,
              nextPaymentDue: '2026-10-01T00:00:00.000Z',
              hasPendingPayment: false,
              ownerName: 'Ali Admin',
              ownerPhone: '+998901112233',
              ownerEmail: 'ali@example.com',
              createdAt: '2026-08-01T00:00:00.000Z',
              daysSinceCreated: 38,
              subscriptionStatus: 'ACTIVE',
              trialEndsAt: null,
              currentPeriodEnd: '2026-10-01T00:00:00.000Z',
              lastPaymentAt: '2026-09-01T00:00:00.000Z',
            },
            subscription: {
              id: 'sub_1',
              storeId: 'store_1',
              planId: 'plan_start',
              planName: 'START',
              monthlyPrice: 150000,
              currency: 'UZS',
              status: 'ACTIVE',
              storedStatus: 'ACTIVE',
              startedAt: '2026-09-01T00:00:00.000Z',
              currentPeriodStart: '2026-09-01T00:00:00.000Z',
              currentPeriodEnd: '2026-10-01T00:00:00.000Z',
              expiresAt: '2026-10-01T00:00:00.000Z',
              nextPaymentDue: '2026-10-01T00:00:00.000Z',
              trialStartedAt: null,
              trialEndsAt: null,
              trialWelcomeSeenAt: null,
              pendingPlanId: null,
              pendingPlanName: null,
              cancelledAt: null,
              endedAt: null,
              isCurrent: true,
              canWrite: true,
              daysRemaining: 22,
              featureKeys: ['sales'],
              featuresRestricted: true,
              enabledFeatures: [{ id: 'sales', key: 'sales', name: 'Sotuvlar', description: '', category: '', isActive: true, sortOrder: 1 }],
              limits: [],
              usage: [],
            },
            latestInvoice: null,
            stats: {
              totalUsers: 4,
              activeUsers: 3,
              totalSales: 12,
              totalRevenue: 8_000_000,
              lastActivityAt: '2026-09-07T00:00:00.000Z',
            },
            payments: {
              totalPaid: 150000,
              paidCount: 1,
              lastPaymentAt: '2026-09-01T00:00:00.000Z',
              history: [
                {
                  id: 'inv_1',
                  storeId: 'store_1',
                  storeName: 'Fayz mebel',
                  ownerName: 'Ali Admin',
                  ownerPhone: '+998901112233',
                  subscriptionId: 'sub_1',
                  planId: 'plan_start',
                  planName: 'START',
                  amount: 150000,
                  currency: 'UZS',
                  billingPeriodStart: '2026-09-01T00:00:00.000Z',
                  billingPeriodEnd: '2026-10-01T00:00:00.000Z',
                  dueDate: '2026-09-01T00:00:00.000Z',
                  status: 'PAID',
                  paidAt: '2026-09-01T00:00:00.000Z',
                  paymentMethod: 'CASH',
                  reference: null,
                  note: 'Admin accept',
                  durationMonths: 1,
                  rejectionReason: null,
                  daysOverdue: 0,
                  recordedByName: 'Platform Administrator',
                  createdAt: '2026-09-01T00:00:00.000Z',
                },
              ],
            },
            requests: [],
          },
        },
      },
      '/platform/plans': { status: 200, body: { success: true, data: { items: [] } } },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/platform/shops/store_1']}>
        <Routes>
          <Route path="/platform/shops/:id" element={<PlatformShopDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Fayz mebel')).not.toHaveLength(0);
    expect(screen.getByText('Ali Admin')).toBeInTheDocument();
    expect(screen.getByText('ali@example.com')).toBeInTheDocument();
    expect(screen.getByText("Jami to'langan")).toBeInTheDocument();
    expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
    expect(screen.getByText('Admin accept')).toBeInTheDocument();
  });
});
