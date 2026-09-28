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
              descriptionUz: null,
              descriptionRu: null,
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
              descriptionUz: null,
              descriptionRu: null,
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
              descriptionUz: 'Sotuv, ombor, mijozlar va hisob-kitob.',
              descriptionRu: 'Продажи, склад, клиенты и учёт.',
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
            {
              id: 'ob5',
              key: 'SMM',
              labelUz: 'SMM Agentlik',
              labelRu: 'SMM Агентство',
              descriptionUz: 'Clientlar, projectlar, content rejalari.',
              descriptionRu: 'Клиенты, проекты, контент-планы.',
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
          businessType: 'FURNITURE',
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
              descriptionUz: null,
              descriptionRu: null,
              allowsOther: false,
              isActive: true,
              sortOrder: 10,
            },
          ],
        },
        {
          id: 'q_smm_name',
          key: 'smmAgencyName',
          audience: 'BUSINESS',
          businessType: 'SMM',
          promptUz: 'Agentligingiz nomi nima?',
          promptRu: 'Как называется ваше агентство?',
          hintUz: null,
          hintRu: null,
          answerType: 'TEXT',
          required: true,
          isActive: true,
          isSystem: false,
          sortOrder: 20,
          options: [],
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

    expect(await screen.findByRole('button', { name: /Personal Finance/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Business/ })).toBeInTheDocument();
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

    await user.click(await screen.findByRole('button', { name: /Personal Finance/ }));
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

    await user.click(await screen.findByRole('button', { name: /Personal Finance/ }));
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

    await user.click(await screen.findByRole('button', { name: /Business/ }));
    expect(await screen.findByText('Biznes turi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mebel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gilam/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SMM Agentlik/ })).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('1/1');
    expect(screen.queryByRole('button', { name: /O‘tkazib yuborish/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mebel/ }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('Biznes hajmi')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('2/2');
    await user.click(screen.getByRole('button', { name: 'Yakka tadbirkor' }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('register store FURNITURE')).toBeInTheDocument();
  });

  it('sends SMM businessType and shows SMM prompts instead of furniture size', async () => {
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

    await user.click(await screen.findByRole('button', { name: /Business/ }));
    await user.click(screen.getByRole('button', { name: /SMM Agentlik/ }));
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('Agentligingiz nomi nima?')).toBeInTheDocument();
    expect(screen.queryByText('Biznes hajmi')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'Nova Agency');
    await user.click(screen.getByRole('button', { name: /Davom etish/ }));
    expect(await screen.findByText('register store SMM')).toBeInTheDocument();
  });

  it('recovers from a transient onboarding boot/catalog failure via retry', async () => {
    let catalogCalls = 0;
    let startCalls = 0;
    const okCatalog = CATALOG;
    const okStart = START;
    const fail = {
      status: 500,
      body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'down' } },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      let route = SIGNED_OUT_RESPONSE;
      if (url.includes('/onboarding/catalog')) {
        catalogCalls += 1;
        route = catalogCalls === 1 ? fail : okCatalog;
      } else if (url.match(/\/onboarding\/[a-f0-9]+/i)) {
        route = { status: 200, body: { success: true, data: { submission: okStart.body.data.submission } } };
      } else if (url.includes('/onboarding') && !url.includes('complete')) {
        startCalls += 1;
        // boot tries start, then catch retries start again before surfacing bootError
        route = startCalls <= 2 ? fail : okStart;
      } else if (url.includes('/auth/me')) {
        route = SIGNED_OUT_RESPONSE;
      } else if (url.includes('/notifications') && !url.includes('/personal/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { items: [], prefs: {}, unreadCount: 0 },
          }),
        } as Response;
      } else {
        throw new Error(`Unhandled request in test: ${url}`);
      }
      return {
        ok: route.status >= 200 && route.status < 300,
        status: route.status,
        json: async () => route.body,
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByText(/Onboarding yuklanmadi/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Qayta urinib ko‘ring/ }));
    expect(await screen.findByRole('button', { name: /Personal Finance/ })).toBeInTheDocument();
  });

  it('opens Personal registration wizard with name step', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE, ...onboardingApis() });
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /Personal Finance/ }));
    expect(await screen.findByText('Avval tanishib olaylik')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toBeInTheDocument();
  });

  it('restores an in-progress personal flow after refresh to a safe step', async () => {
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
                answers: {
                  purpose: 'PERSONAL',
                  firstName: 'Aziz',
                  lastName: 'Karimov',
                  age: '25',
                },
                registerEmail: 'aziz@example.com',
                emailVerifiedAt: null,
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
    expect(await screen.findByText('Emailingizni tasdiqlang')).toBeInTheDocument();
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
