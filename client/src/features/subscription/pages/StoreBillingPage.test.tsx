import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { StoreBillingPage } from './StoreBillingPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StoreBillingPage', () => {
  it('shows the current trial, change-plan action, and request status', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/billing/plans': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'plan_start',
                name: 'START',
                description: 'Asosiy tarif',
                monthlyPrice: 150000,
                currency: 'UZS',
                trialDays: 0,
                isActive: true,
                isDefaultTrial: false,
                features: {},
                featureKeys: ['sales', 'inventory'],
                featuresRestricted: true,
                enabledFeatures: [
                  { id: 'sales', key: 'sales', name: 'Sotuvlar', description: '', category: '', isActive: true, sortOrder: 1 },
                ],
                limits: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        },
      },
      '/billing/subscription': {
        status: 200,
        body: {
          success: true,
          data: {
            subscription: {
              id: 'sub_1',
              storeId: 'store_1',
              planId: 'plan_trial',
              planName: 'Bepul sinov',
              monthlyPrice: 0,
              currency: 'UZS',
              status: 'TRIAL',
              storedStatus: 'TRIAL',
              startedAt: '2026-09-01T00:00:00.000Z',
              currentPeriodStart: '2026-09-01T00:00:00.000Z',
              currentPeriodEnd: '2026-09-08T00:00:00.000Z',
              expiresAt: '2026-09-08T00:00:00.000Z',
              nextPaymentDue: '2026-09-08T00:00:00.000Z',
              trialStartedAt: '2026-09-01T00:00:00.000Z',
              trialEndsAt: '2026-09-08T00:00:00.000Z',
              trialWelcomeSeenAt: null,
              pendingPlanId: null,
              pendingPlanName: null,
              cancelledAt: null,
              endedAt: null,
              isCurrent: true,
              canWrite: true,
              daysRemaining: 3,
              featureKeys: ['sales', 'products'],
              featuresRestricted: true,
              enabledFeatures: [
                { id: 'sales', key: 'sales', name: 'Sotuvlar', description: '', category: '', isActive: true, sortOrder: 1 },
              ],
              limits: [],
              usage: [],
            },
          },
        },
      },
      '/billing/requests': { status: 200, body: { success: true, data: { items: [] } } },
      '/billing/payments': {
        status: 200,
        body: { success: true, data: { totalPaid: 0, paidCount: 0, lastPaymentAt: null, items: [] } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <StoreBillingPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Bepul sinov/)).toBeInTheDocument();
    expect(screen.getByText(/Sinovdan 3 kun qoldi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tarifni o‘zgartirish' })).toBeInTheDocument();
  });
});
