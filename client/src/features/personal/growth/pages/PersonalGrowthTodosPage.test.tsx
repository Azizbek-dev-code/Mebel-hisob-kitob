import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthTodosPage } from './PersonalGrowthTodosPage';

const PERSONAL: PersonalAuthUser = {
  kind: 'PERSONAL',
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz',
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Shaxsiy',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  membershipRole: 'OWNER',
  subscription: {
    status: 'TRIAL',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-20T00:00:00.000Z',
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGrowthTodosPage', () => {
  it('lists open todos and offers create CTA', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/todos': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'todo_1',
                title: 'React authentication — 60 min',
                description: null,
                priority: 'MEDIUM',
                status: 'TODO',
                category: 'Dasturlash',
                dueAt: '2026-09-17T18:00:00.000Z',
                remindMinutesBefore: null,
                remindAt: null,
                estimatedMinutes: 60,
                actualMinutes: 0,
                recurrence: 'NONE',
                intervalDays: null,
                isDailyFocus: true,
                completedAt: null,
                linkedGoalId: null,
                linkedCalendarEventId: null,
                createdAt: '2026-09-17T09:00:00.000Z',
                updatedAt: '2026-09-17T09:00:00.000Z',
              },
            ],
            openCount: 1,
            doneTodayCount: 0,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px]">
          <PersonalGrowthTodosPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Vazifalar' })).toBeInTheDocument();
    expect(await screen.findByText('React authentication — 60 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vazifa' })).toBeInTheDocument();
    expect(screen.getByText(/Bugungi asosiy/)).toBeInTheDocument();
  });
});
