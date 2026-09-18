import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalPlanPage } from './PersonalPlanPage';

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

describe('PersonalPlanPage', () => {
  it('shows month calendar, day timeline and create CTA without horizontal overflow', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/plan/events': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'evt_1',
                title: 'React dars',
                note: null,
                category: 'Dasturlash',
                priority: 'HIGH',
                startsAt: '2026-09-17T14:00:00.000Z',
                endsAt: '2026-09-17T15:00:00.000Z',
                allDay: false,
                recurrence: 'NONE',
                intervalDays: null,
                remindMinutesBefore: 30,
                remindAt: '2026-09-17T13:30:00.000Z',
                isCancelled: false,
                linkedGoalId: null,
                linkedTodoId: null,
                createdAt: '2026-09-17T09:00:00.000Z',
                updatedAt: '2026-09-17T09:00:00.000Z',
              },
            ],
            daysWithEvents: ['2026-09-17'],
          },
        },
      },
      '/personal/plan/day': {
        status: 200,
        body: {
          success: true,
          data: {
            date: '2026-09-17',
            items: [
              {
                id: 'evt_1',
                title: 'React dars',
                note: null,
                category: 'Dasturlash',
                priority: 'HIGH',
                startsAt: '2026-09-17T14:00:00.000Z',
                endsAt: '2026-09-17T15:00:00.000Z',
                allDay: false,
                recurrence: 'NONE',
                intervalDays: null,
                remindMinutesBefore: 30,
                remindAt: '2026-09-17T13:30:00.000Z',
                isCancelled: false,
                linkedGoalId: null,
                linkedTodoId: null,
                createdAt: '2026-09-17T09:00:00.000Z',
                updatedAt: '2026-09-17T09:00:00.000Z',
              },
            ],
          },
        },
      },
      '/personal/plan/reminders': {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
    });

    const { container } = renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalPlanPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Reja' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Tadbir' })).toBeInTheDocument();
    expect(screen.getByText('Bugun')).toBeInTheDocument();
    expect(await screen.findByText('React dars')).toBeInTheDocument();
    expect(container.querySelector('.overflow-x-hidden')).toBeTruthy();
  });
});
