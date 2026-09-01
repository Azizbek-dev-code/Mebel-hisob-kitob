import {
  WorkerCompensationType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { todayStoreInputDate } from '@/features/workers/utils/period-range';
import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi, type MockApiRoutes } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';

import { WorkerCompensationPage } from './WorkerCompensationPage';
import { WorkerDetailPage } from './WorkerDetailPage';

function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${digits}[\\s\\u00A0]*so'm`);
}

const WORKER_ID = 'cjld2work0000qzrmn831i7rn';
const RULE_ID = 'clcompreg00000000000000001';
const RULE_ID_2 = 'clcompreg00000000000000002';

const WORKER = {
  id: WORKER_ID,
  fullName: 'Ali Usta',
  username: 'ali',
  email: 'ali@furniture-erp.local',
  phone: '+998901111111',
  notes: null,
  role: 'EMPLOYEE',
  isActive: true,
  responsibilities: [WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  stats: {
    totalSales: 2,
    salesThisMonth: 1,
    salesToday: 0,
    totalAssemblyTasks: 3,
    completedAssemblyTasks: 2,
    pendingAssemblyTasks: 1,
    completedTasksThisMonth: 1,
  },
};

const RULE_SELLER = {
  id: RULE_ID,
  workerId: WORKER_ID,
  responsibility: WorkerResponsibility.SELLER,
  type: WorkerCompensationType.PERCENT_OF_SALE,
  value: 1000,
  isActive: true,
  effectiveFrom: '2026-01-01T12:00:00.000Z',
  effectiveTo: '2026-06-30T12:00:00.000Z',
  notes: 'PHASE8_STEP4B_TEMP',
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

const RULE_ASSEMBLER = {
  id: RULE_ID_2,
  workerId: WORKER_ID,
  responsibility: WorkerResponsibility.ASSEMBLER,
  type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
  value: 150_000,
  isActive: false,
  effectiveFrom: '2026-01-01T12:00:00.000Z',
  effectiveTo: null,
  notes: null,
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

const SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_ADMIN } },
};

const EMPLOYEE_SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_EMPLOYEE } },
};

function workerOk() {
  return { status: 200, body: { success: true, data: { worker: WORKER } } };
}

function rulesOk(items: unknown[] = [RULE_SELLER, RULE_ASSEMBLER]) {
  return { status: 200, body: { success: true, data: { items } } };
}

function pageMocks(extra: MockApiRoutes = {}): MockApiRoutes {
  return {
    '/auth/me': SIGNED_IN,
    // More specific paths first — mockApi matches by substring.
    [`/workers/${WORKER_ID}/compensation-rules`]: rulesOk(),
    [`/workers/${WORKER_ID}`]: workerOk(),
    ...extra,
  };
}

function renderPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={[ROUTES.workerCompensation(WORKER_ID)]}>
      <Routes>
        <Route path="/workers/:id/compensation" element={<WorkerCompensationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WorkerCompensationPage', () => {
  it('renders loading then worker heading', async () => {
    mockApi(pageMocks());
    renderPage();
    expect(await screen.findByRole('heading', { name: /Ali Usta — Hisoblash qoidalari/i })).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER_ID}/compensation-rules`]: rulesOk([]),
      [`/workers/${WORKER_ID}`]: workerOk(),
    });
    renderPage();
    expect(await screen.findByText(/Hisoblash qoidalari mavjud emas/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Qoida qo'shish/i }).length).toBeGreaterThan(0);
  });

  it('lists rules with percent and money formatting and badges', async () => {
    mockApi(pageMocks());
    renderPage();
    expect(await screen.findByText('10%')).toBeInTheDocument();
    expect(screen.getByText(moneyMatcher(150_000))).toBeInTheDocument();
    expect(screen.getByText('Sotuv summasidan foiz')).toBeInTheDocument();
    expect(screen.getByText('Har bir terlash uchun summa')).toBeInTheDocument();
    expect(screen.getAllByText('Faol').length).toBeGreaterThan(0);
    expect(screen.getByText('Faol emas')).toBeInTheDocument();
  });

  it('opens create dialog and filters responsibilities to worker assignments', async () => {
    const user = userEvent.setup();
    mockApi(pageMocks());
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Qoida qo'shish$/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Hisoblash qoidasi qo'shish/i)).toBeInTheDocument();

    const responsibility = within(dialog).getByLabelText(/Mas/i);
    expect(responsibility).toHaveDisplayValue(/Sotuvchi|Teruvchi/);
    expect(within(dialog).queryByRole('option', { name: /Yetkazib beruvchi/i })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Boshlanish sanasi/i)).toHaveValue(todayStoreInputDate());
  });

  it('does not offer assembly type for seller responsibility', async () => {
    const user = userEvent.setup();
    mockApi(pageMocks());
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Qoida qo'shish$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Mas/i), WorkerResponsibility.SELLER);

    const typeSelect = within(dialog).getByLabelText(/Hisoblash turi/i);
    expect(within(typeSelect).getByRole('option', { name: /Sotuv summasidan foiz/i })).toBeInTheDocument();
    expect(
      within(typeSelect).queryByRole('option', { name: /Har bir terlash/i }),
    ).not.toBeInTheDocument();
  });

  it('validates percent and fixed amount on create', async () => {
    const user = userEvent.setup();
    mockApi(pageMocks());
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Qoida qo'shish$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Mas/i), WorkerResponsibility.SELLER);
    await user.selectOptions(
      within(dialog).getByLabelText(/Hisoblash turi/i),
      WorkerCompensationType.PERCENT_OF_SALE,
    );
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));
    expect(await within(dialog).findByText(/Foizni kiriting|Foiz 0 dan katta/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Foiz$/i), '0');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));
    expect(await within(dialog).findByText(/Foiz 0 dan katta/i)).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/Mas/i), WorkerResponsibility.ASSEMBLER);
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));
    expect(await within(dialog).findByText(/Summa 0 dan katta/i)).toBeInTheDocument();
  });

  it('creates a rule successfully and converts percent to basis points', async () => {
    const user = userEvent.setup();
    const created = {
      ...RULE_SELLER,
      id: 'clcompreg00000000000000099',
      value: 1200,
      notes: 'PHASE8_STEP4B_TEMP',
    };
    let listItems = [RULE_SELLER, RULE_ASSEMBLER];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`) && method === 'POST') {
        listItems = [created, ...listItems];
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ success: true, data: { rule: created } }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { items: listItems } }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`) && !url.includes('compensation')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    await user.click(await screen.findByRole('button', { name: /^Qoida qo'shish$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/Mas/i), WorkerResponsibility.SELLER);
    await user.selectOptions(
      within(dialog).getByLabelText(/Hisoblash turi/i),
      WorkerCompensationType.PERCENT_OF_SALE,
    );
    await user.clear(within(dialog).getByLabelText(/^Foiz$/i));
    await user.type(within(dialog).getByLabelText(/^Foiz$/i), '12');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(await screen.findByText(/Hisoblash qoidasi qo'shildi/i)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/workers/${WORKER_ID}/compensation-rules`) &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body).toMatchObject({
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1200,
    });
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
    expect(body).not.toHaveProperty('workerId');

    // Must not touch worker-finances endpoints when creating a rule.
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/worker-finances/')),
    ).toBe(false);
  });

  it('keeps dialog open and shows overlap error on 409', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`) && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              success: false,
              error: {
                code: 'CONFLICT',
                message: 'overlap',
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rulesOk().body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    await user.click(await screen.findByRole('button', { name: /^Qoida qo'shish$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Foiz$/i), '10');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(
      await within(dialog).findByText(/Bu davr uchun shu turdagi faol qoida allaqachon mavjud/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Foiz$/i)).toHaveValue('10');
  });

  it('prefills edit dialog and submits updated percent as basis points', async () => {
    const user = userEvent.setup();
    const updated = { ...RULE_SELLER, value: 1500 };
    let listItems = [RULE_SELLER, RULE_ASSEMBLER];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (
        url.includes(`/workers/${WORKER_ID}/compensation-rules/${RULE_ID}`) &&
        method === 'PATCH'
      ) {
        listItems = [updated, RULE_ASSEMBLER];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { rule: updated } }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rulesOk(listItems).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    const card = await screen.findByTestId(`compensation-rule-${RULE_ID}`);
    await user.click(within(card).getByRole('button', { name: /Tahrirlash/i }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByLabelText(/^Foiz$/i)).toHaveValue('10');
    });
    expect(within(dialog).getByText(/Sotuvchi/i)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/^Foiz$/i));
    await user.type(within(dialog).getByLabelText(/^Foiz$/i), '15');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(await screen.findByText(/Hisoblash qoidasi yangilandi/i)).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/compensation-rules/${RULE_ID}`) &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    expect(JSON.parse(String((patchCall![1] as RequestInit).body))).toMatchObject({ value: 1500 });
  });

  it('requires confirmation before deactivating', async () => {
    const user = userEvent.setup();
    let listItems = [RULE_SELLER, RULE_ASSEMBLER];
    const deactivated = { ...RULE_SELLER, isActive: false };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (
        url.includes(`/workers/${WORKER_ID}/compensation-rules/${RULE_ID}`) &&
        method === 'PATCH'
      ) {
        listItems = [deactivated, RULE_ASSEMBLER];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { rule: deactivated } }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rulesOk(listItems).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    const card = await screen.findByTestId(`compensation-rule-${RULE_ID}`);
    await user.click(within(card).getByRole('button', { name: /Faolsizlantirish/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Qoidani faolsizlantirish\?/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/yangi hisob-kitoblarda ishlatilmaydi/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Faolsizlantirish$/i }));
    expect(await screen.findByText(/Hisoblash qoidasi faolsizlantirildi/i)).toBeInTheDocument();

    const patchBody = JSON.parse(
      String(
        (
          fetchMock.mock.calls.find(
            (call) =>
              String(call[0]).includes(`/compensation-rules/${RULE_ID}`) &&
              (call[1] as RequestInit | undefined)?.method === 'PATCH',
          )![1] as RequestInit
        ).body,
      ),
    );
    expect(patchBody).toEqual({ isActive: false });
  });

  it('activates an inactive rule without delete', async () => {
    const user = userEvent.setup();
    let listItems = [RULE_SELLER, RULE_ASSEMBLER];
    const activated = { ...RULE_ASSEMBLER, isActive: true };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (
        url.includes(`/workers/${WORKER_ID}/compensation-rules/${RULE_ID_2}`) &&
        method === 'PATCH'
      ) {
        listItems = [RULE_SELLER, activated];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { rule: activated } }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/compensation-rules`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rulesOk(listItems).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    const card = await screen.findByTestId(`compensation-rule-${RULE_ID_2}`);
    await user.click(within(card).getByRole('button', { name: /Faollashtirish/i }));
    expect(await screen.findByText(/Hisoblash qoidasi faollashtirildi/i)).toBeInTheDocument();
  });
});

describe('WorkerDetailPage compensation link', () => {
  it('includes Hisoblash qoidalari navigation', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER_ID}/sales`]: {
        status: 200,
        body: {
          success: true,
          data: {
            items: [],
            meta: {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      },
      [`/workers/${WORKER_ID}/tasks`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER_ID}/activity`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER_ID}/profile-modules`]: {
        status: 200,
        body: {
          success: true,
          data: {
            modules: {
              worker: {
                id: WORKER_ID,
                fullName: 'Ali Usta',
                username: 'ali',
                phone: null,
                role: 'EMPLOYEE',
                isActive: true,
                responsibilities: [],
                createdAt: '2026-01-01T00:00:00.000Z',
              },
              tabs: ['GENERAL'],
              general: {
                finance: {
                  earned: 0,
                  paid: 0,
                  outstanding: 0,
                  monthEarned: 0,
                  monthPaid: 0,
                  bonuses: 0,
                  advances: 0,
                  debt: 0,
                  adjustments: 0,
                  reversals: 0,
                  commissions: 0,
                },
                breakdown: [],
              },
              seller: null,
              assembler: null,
              delivery: null,
              installer: null,
              smm: null,
              other: null,
              ledgerSummary: {
                workerId: WORKER_ID,
                worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
                totalBonuses: 0,
                totalCommissions: 0,
                totalAdvances: 0,
                totalDebt: 0,
                totalPayments: 0,
                totalAdjustments: 0,
                totalReversals: 0,
                netFinancialPosition: 0,
                transactionCount: 0,
              },
            },
          },
        },
      },
      [`/workers/${WORKER_ID}`]: workerOk(),
    });

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerDetail(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id" element={<WorkerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: 'Hisoblash qoidalari' });
    expect(link).toHaveAttribute('href', ROUTES.workerCompensation(WORKER_ID));
  });
});

describe('Worker compensation route guard', () => {
  it('blocks EMPLOYEE from /workers/:id/compensation', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
    });

    const router = createMemoryRouter(routes, {
      initialEntries: [ROUTES.workerCompensation(WORKER_ID)],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.dashboard);
    });
  });
});
