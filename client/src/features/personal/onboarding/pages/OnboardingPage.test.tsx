import {
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_ADMIN, TEST_PERSONAL, TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { OnboardingPage } from './OnboardingPage';

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

const CATALOG = {
  status: 200,
  body: {
    success: true,
    data: {
      flowKey: 'workspace_onboarding',
      flowVersion: 1,
      questions: [
        {
          id: 'q_goals',
          key: 'goals',
          audience: 'PERSONAL',
          businessType: null,
          promptUz: 'Moliyaviy maqsadingiz nima?',
          promptRu: 'Цель',
          hintUz: null,
          hintRu: null,
          answerType: 'MULTI',
          required: true,
          isActive: true,
          isSystem: false,
          sortOrder: 10,
          options: [
            {
              id: 'og1',
              key: 'CONTROL_EXPENSES',
              labelUz: 'Xarajatlarni nazorat qilish',
              labelRu: 'Контроль',
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
          ],
        },
        {
          id: 'q_optional',
          key: 'firstSavingGoal',
          audience: 'PERSONAL',
          businessType: null,
          promptUz: 'Birinchi moliyaviy maqsadingiz nima?',
          promptRu: 'Первая цель',
          hintUz: 'Ixtiyoriy',
          hintRu: null,
          answerType: 'SINGLE',
          required: false,
          isActive: true,
          isSystem: false,
          sortOrder: 20,
          options: [
            {
              id: 'of1',
              key: 'PHONE',
              labelUz: 'Telefon',
              labelRu: 'Телефон',
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
          ],
        },
        {
          id: 'q_type',
          key: 'businessType',
          audience: 'BUSINESS',
          businessType: null,
          promptUz: 'Biznes turi',
          promptRu: 'Тип бизнеса',
          hintUz: null,
          hintRu: null,
          answerType: 'SINGLE',
          required: true,
          isActive: true,
          isSystem: true,
          sortOrder: 10,
          options: [
            {
              id: 'ob1',
              key: 'FURNITURE',
              labelUz: 'Mebel',
              labelRu: 'Мебель',
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
            {
              id: 'ob2',
              key: 'CARPET',
              labelUz: 'Gilam',
              labelRu: 'Ковры',
              allowsOther: false,
              isActive: true,
              sortOrder: 20,
            },
            {
              id: 'ob3',
              key: 'CLOTHING',
              labelUz: 'Kiyim',
              labelRu: 'Одежда',
              allowsOther: false,
              isActive: true,
              sortOrder: 30,
            },
            {
              id: 'ob4',
              key: 'ELECTRONICS',
              labelUz: 'Telefon/Elektronika',
              labelRu: 'Электроника',
              allowsOther: false,
              isActive: true,
              sortOrder: 40,
            },
            {
              id: 'ob5',
              key: 'OTHER',
              labelUz: 'Boshqa',
              labelRu: 'Другое',
              allowsOther: false,
              isActive: true,
              sortOrder: 50,
            },
          ],
        },
        {
          id: 'q_size',
          key: 'businessSize',
          audience: 'BUSINESS',
          businessType: null,
          promptUz: 'Biznes hajmi',
          promptRu: 'Масштаб',
          hintUz: null,
          hintRu: null,
          answerType: 'SINGLE',
          required: true,
          isActive: true,
          isSystem: false,
          sortOrder: 20,
          options: [
            {
              id: 'os1',
              key: 'SOLO',
              labelUz: 'Yakka tadbirkor',
              labelRu: 'ИП',
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
          ],
        },
      ],
    },
  },
};

const START = {
  status: 200,
  body: {
    success: true,
    data: {
      submission: {
        publicToken: 'tok',
        flowKey: 'personal-v1',
        flowVersion: 1,
        experimentKey: null,
        status: 'IN_PROGRESS',
        answers: {},
        hasCustomIncome: false,
        identityId: null,
        workspaceId: null,
        createdAt: '2026-09-14T00:00:00.000Z',
        completedAt: null,
      },
    },
  },
};

const SAVE = { status: 200, body: START.body };
const COMPLETE_BUSINESS = { status: 200, body: START.body };

const PERSONAL_ITEM = {
  id: 'ws_1',
  type: WorkspaceType.PERSONAL,
  name: 'Azizning shaxsiy moliyasi',
  status: WorkspaceStatus.ACTIVE,
  storeId: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  role: WorkspaceMembershipRole.OWNER,
};

function RegisterStoreProbe() {
  const [params] = useSearchParams();
  return <p>register store {params.get('businessType') ?? 'none'}</p>;
}

function renderOnboarding() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/personal/dashboard" element={<p>personal home</p>} />
        <Route path="/register-store" element={<RegisterStoreProbe />} />
        <Route path="/dashboard" element={<p>platform home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function onboardingApis(extra: Record<string, { status: number; body?: unknown }> = {}) {
  return {
    '/onboarding/catalog': CATALOG,
    '/onboarding/tok/complete-business': COMPLETE_BUSINESS,
    '/onboarding/tok': SAVE,
    '/onboarding': START,
    ...extra,
  };
}

describe('OnboardingPage', () => {
  it('starts on the purpose question for a guest', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE, ...onboardingApis() });
    renderOnboarding();

    expect(await screen.findByRole('button', { name: /Shaxsiy moliya/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Biznes/ })).toBeInTheDocument();
  });

  it('returns a personal session to the personal dashboard', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PERSONAL } } },
      '/accounts': {
        status: 200,
        body: { success: true, data: { items: [PERSONAL_ITEM] } },
      },
      ...onboardingApis(),
    });
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /Shaxsiy moliya/ }));
    expect(await screen.findByText('personal home')).toBeInTheDocument();
  });

  it('switches a store session to the existing personal workspace', async () => {
    const fetchMock = mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/accounts': {
        status: 200,
        body: { success: true, data: { items: [PERSONAL_ITEM] } },
      },
      '/accounts/switch': {
        status: 200,
        body: { success: true, data: { user: TEST_PERSONAL } },
      },
      ...onboardingApis(),
    });
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /Shaxsiy moliya/ }));
    expect(await screen.findByText('personal home')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([called]) => String(called).includes('/accounts/switch')),
    ).toBe(true);
  });

  it('asks dynamic business questions then continues to store registration', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PERSONAL } } },
      '/accounts': {
        status: 200,
        body: { success: true, data: { items: [PERSONAL_ITEM] } },
      },
      ...onboardingApis(),
    });
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /Biznes/ }));
    expect(await screen.findByText('Biznes turi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mebel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gilam' })).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('1/2');
    expect(screen.queryByRole('button', { name: /O‘tkazib yuborish/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mebel' }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('Biznes hajmi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yakka tadbirkor' }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('register store FURNITURE')).toBeInTheDocument();
  });

  it('renders personal catalog questions and allows skip only when optional', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE, ...onboardingApis() });
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /Shaxsiy moliya/ }));
    expect(await screen.findByText('Moliyaviy maqsadingiz nima?')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('1/3');
    expect(screen.queryByRole('button', { name: /O‘tkazib yuborish/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xarajatlarni nazorat qilish' }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('Birinchi moliyaviy maqsadingiz nima?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /O‘tkazib yuborish/ })).toBeInTheDocument();
  });

  it('restores an in-progress personal flow after refresh', async () => {
    sessionStorage.setItem('furniture-erp.onboardingToken', 'tok');
    mockApi({
      '/auth/me': SIGNED_OUT_RESPONSE,
      ...onboardingApis({
        '/onboarding/tok': {
          status: 200,
          body: {
            success: true,
            data: {
              submission: {
                publicToken: 'tok',
                flowKey: 'personal-v1',
                flowVersion: 1,
                experimentKey: null,
                status: 'IN_PROGRESS',
                answers: { purpose: 'PERSONAL', goals: ['CONTROL_EXPENSES'] },
                hasCustomIncome: false,
                identityId: null,
                workspaceId: null,
                createdAt: '2026-09-14T00:00:00.000Z',
                completedAt: null,
              },
            },
          },
        },
      }),
    });
    renderOnboarding();
    expect(await screen.findByText('Birinchi moliyaviy maqsadingiz nima?')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('2/3');
  });

  it('does not keep a platform admin on onboarding', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/accounts': { status: 200, body: { success: true, data: { items: [] } } },
      ...onboardingApis(),
    });
    renderOnboarding();

    expect(await screen.findByText('platform home')).toBeInTheDocument();
  });
});
