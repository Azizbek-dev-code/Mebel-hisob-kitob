import {
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi, type MockApiRoute, type MockApiRoutes } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { todayStoreInputDate } from '@/features/workers/utils/period-range';

import { WorkerDetailPage } from './WorkerDetailPage';
import { WorkerFinancesPage } from './WorkerFinancesPage';

function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${digits}[\\s\\u00A0]*so'm`);
}

const WORKER_ID = 'cjld2work0000qzrmn831i7rn';

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

const SUMMARY = {
  workerId: WORKER_ID,
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  totalBonuses: 500_000,
  totalCommissions: 200_000,
  totalAdvances: 100_000,
  totalDebt: 50_000,
  totalPayments: 150_000,
  totalAdjustments: 0,
  totalReversals: 0,
  netFinancialPosition: 400_000,
  transactionCount: 2,
};

const TX_BONUS = {
  id: 'cltxbonus00000000000000001',
  workerId: WORKER_ID,
  type: WorkerFinancialTransactionType.BONUS,
  amount: 500_000,
  transactionDate: '2026-08-09T12:00:00.000Z',
  description: 'Oy yakuni bonus',
  referenceType: null,
  referenceId: null,
  reversesType: null,
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
  createdAt: '2026-08-09T12:05:00.000Z',
  updatedAt: '2026-08-09T12:05:00.000Z',
};

const TX_ADVANCE = {
  id: 'cltxadvance000000000000001',
  workerId: WORKER_ID,
  type: WorkerFinancialTransactionType.ADVANCE,
  amount: 100_000,
  transactionDate: '2026-08-10T12:00:00.000Z',
  description: 'Avgust uchun avans',
  referenceType: null,
  referenceId: null,
  reversesType: null,
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
  createdAt: '2026-08-10T12:05:00.000Z',
  updatedAt: '2026-08-10T12:05:00.000Z',
};

const TX_REVERSAL = {
  id: 'cltxreversal0000000000001',
  workerId: WORKER_ID,
  type: WorkerFinancialTransactionType.REVERSAL,
  amount: 500_000,
  transactionDate: '2026-08-11T12:00:00.000Z',
  description: 'Reversal of BONUS',
  referenceType: 'REVERSAL',
  referenceId: TX_BONUS.id,
  reversesType: WorkerFinancialTransactionType.BONUS,
  worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
  createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
  createdAt: '2026-08-11T12:05:00.000Z',
  updatedAt: '2026-08-11T12:05:00.000Z',
};

const SIGNED_IN = { status: 200, body: { success: true, data: { user: TEST_ADMIN } } };
const EMPLOYEE_SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_EMPLOYEE } },
};

function workerOk(): MockApiRoute {
  return { status: 200, body: { success: true, data: { worker: WORKER } } };
}

function summaryOk(summary = SUMMARY): MockApiRoute {
  return { status: 200, body: { success: true, data: { summary } } };
}

function listOk(items: unknown[], meta?: Partial<Record<string, unknown>>): MockApiRoute {
  return {
    status: 200,
    body: {
      success: true,
      data: {
        items,
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          ...meta,
        },
      },
    },
  };
}

function financeMocks(overrides: MockApiRoutes = {}): MockApiRoutes {
  const summaryKey = `/worker-finances/workers/${WORKER_ID}/summary`;
  const listKey = `/worker-finances/workers/${WORKER_ID}/transactions`;
  const workerKey = `/workers/${WORKER_ID}`;
  const attributedKey = `/workers/${WORKER_ID}/attributed-fees`;

  // Keep worker-finances routes before `/workers/:id` — mockApi matches by substring.
  return {
    '/auth/me': overrides['/auth/me'] ?? SIGNED_IN,
    [summaryKey]: overrides[summaryKey] ?? summaryOk(),
    [listKey]: overrides[listKey] ?? listOk([TX_BONUS, TX_ADVANCE]),
    [attributedKey]:
      overrides[attributedKey] ??
      ({
        status: 200,
        body: {
          success: true,
          data: {
            fees: {
              sellerBonusTotal: 0,
              assemblerFeeTotal: 0,
              installerFeeTotal: 0,
              deliveryFeeTotal: 0,
              purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
              grandTotal: 0,
              items: [],
            },
          },
        },
      } satisfies MockApiRoute),
    [workerKey]: overrides[workerKey] ?? workerOk(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WorkerFinancesPage', () => {
  it('renders summary and transactions for an admin', async () => {
    const fetchMock = mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /Ali Usta — Moliyaviy hisob/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('@ali')).toBeInTheDocument();
    expect(screen.getAllByText('Faol').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bonus').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Komissiya/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Avans').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Qarz').length).toBeGreaterThan(0);
    expect(screen.getAllByText("To'lov").length).toBeGreaterThan(0);
    expect(screen.getByText('Sof hisob')).toBeInTheDocument();

    expect(screen.getAllByText(moneyMatcher(500_000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(moneyMatcher(200_000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Oy yakuni bonus/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Avgust uchun avans/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes(`/worker-finances/workers/${WORKER_ID}/summary`),
        ),
      ).toBe(true);
    });
  });

  it('changes type filter in the transactions request', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Moliyaviy hisob/i });
    await user.selectOptions(screen.getByLabelText('Turi'), 'BONUS');

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('type=BONUS') &&
            call[0].includes('/transactions'),
        ),
      ).toBe(true);
    });
  });

  it('debounces search into the transactions request', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Moliyaviy hisob/i });
    await user.type(screen.getByLabelText(/Tavsif bo'yicha qidirish/i), 'bonus');
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('search=bonus') &&
            call[0].includes('/transactions'),
        ),
      ).toBe(true);
    });

    vi.useRealTimers();
  });

  it('applies period presets to summary and list requests', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Moliyaviy hisob/i });
    const periodGroup = screen.getByRole('group', { name: 'Hisobot davri' });
    await user.click(within(periodGroup).getByRole('button', { name: /Bugun/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls
        .map((call) => call[0])
        .filter((url): url is string => typeof url === 'string');
      expect(urls.some((url) => url.includes('/summary') && url.includes('from='))).toBe(true);
      expect(urls.some((url) => url.includes('/transactions') && url.includes('from='))).toBe(
        true,
      );
    });
  });

  it('paginates with Oldingi / Keyingi', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(
      financeMocks({
        [`/worker-finances/workers/${WORKER_ID}/transactions`]: listOk([TX_BONUS], {
          page: 1,
          pageSize: 20,
          totalItems: 25,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        }),
      }),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sahifa 1 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oldingi' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Keyingi' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) => typeof call[0] === 'string' && call[0].includes('page=2'),
        ),
      ).toBe(true);
    });
  });

  it('shows empty state when there are no transactions', async () => {
    mockApi(
      financeMocks({
        [`/worker-finances/workers/${WORKER_ID}/summary`]: summaryOk({
          ...SUMMARY,
          transactionCount: 0,
          totalBonuses: 0,
          totalCommissions: 0,
          totalAdvances: 0,
          totalDebt: 0,
          totalPayments: 0,
          netFinancialPosition: 0,
        }),
        [`/worker-finances/workers/${WORKER_ID}/transactions`]: listOk([]),
      }),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Hozircha moliyaviy operatsiyalar yo'q/i),
    ).toBeInTheDocument();
  });

  it('shows error state with retry', async () => {
    mockApi(
      financeMocks({
        [`/worker-finances/workers/${WORKER_ID}/summary`]: {
          status: 500,
          body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'fail' } },
        },
        [`/worker-finances/workers/${WORKER_ID}/transactions`]: {
          status: 500,
          body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'fail' } },
        },
      }),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findAllByText(/Moliyaviy ma'lumotlarni yuklab bo'lmadi/i),
    ).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Qayta urinish' }).length).toBeGreaterThan(0);
  });

  it('keeps mobile layout without forcing a desktop-only table', async () => {
    mockApi(financeMocks());

    const { container } = renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByText(/Oy yakuni bonus/i);
    const mobileList = container.querySelector('ul.md\\:hidden');
    const desktopTable = container.querySelector('div.hidden.md\\:block');
    expect(mobileList).toBeTruthy();
    expect(desktopTable).toBeTruthy();
  });

  it('renders the Moliyaviy operatsiya action', async () => {
    mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }),
    ).toBeInTheDocument();
  });

  it('opens create dialog with BONUS default and store-timezone date', async () => {
    const user = userEvent.setup();
    mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Moliyaviy operatsiya qo'shish/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Turi$/i)).toHaveValue('BONUS');
    expect(within(dialog).getByLabelText(/^Sana$/i)).toHaveValue(todayStoreInputDate());
    expect(within(dialog).queryByRole('option', { name: 'Bekor qilish' })).not.toBeInTheDocument();
  });

  it('rejects empty and zero amount', async () => {
    const user = userEvent.setup();
    mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));
    expect(await within(dialog).findByText(/Summa 0 dan katta/i)).toBeInTheDocument();
  });

  it('rejects negative amount', async () => {
    const user = userEvent.setup();
    mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    const amountInput = within(dialog).getByLabelText(/Summa/i);
    // MoneyField parses digit-by-digit; set the signed value in one change.
    fireEvent.change(amountInput, { target: { value: '-500' } });
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));
    expect(await within(dialog).findByText(/Summa 0 dan katta/i)).toBeInTheDocument();
  });

  it('allows changing type and optional empty description on create', async () => {
    const user = userEvent.setup();
    const created = {
      ...TX_BONUS,
      id: 'cltxcreated000000000000001',
      type: WorkerFinancialTransactionType.COMMISSION,
      amount: 123_456,
      description: null,
    };

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
      if (url.includes('/worker-finances/transactions') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ success: true, data: { transaction: created } }),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/summary`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(summaryOk().body),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/transactions`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(listOk([created, TX_BONUS, TX_ADVANCE]).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/attributed-fees`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                fees: {
                  sellerBonusTotal: 0,
                  assemblerFeeTotal: 0,
              installerFeeTotal: 0,
                  deliveryFeeTotal: 0,
                  purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
                  grandTotal: 0,
                  items: [],
                },
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/^Turi$/i), 'COMMISSION');
    expect(within(dialog).getByLabelText(/^Turi$/i)).toHaveValue('COMMISSION');
    expect(within(dialog).getByText(/komissiya yoki haq/i)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Summa/i), '123456');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/worker-finances/transactions') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body).toEqual({
      workerId: WORKER_ID,
      type: 'COMMISSION',
      amount: 123_456,
      transactionDate: todayStoreInputDate(),
    });
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
    expect(body).not.toHaveProperty('description');
  });

  it('creates a transaction, closes dialog, shows success, and refreshes queries', async () => {
    const user = userEvent.setup();
    let summaryCalls = 0;
    let listCalls = 0;
    const created = {
      ...TX_BONUS,
      id: 'cltxcreated000000000000002',
      amount: 123_456,
      description: 'PHASE8_STEP3B_TEMP',
    };
    const refreshedSummary = {
      ...SUMMARY,
      totalBonuses: SUMMARY.totalBonuses + 123_456,
      netFinancialPosition: SUMMARY.netFinancialPosition + 123_456,
      transactionCount: 3,
    };

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
      if (url.includes('/worker-finances/transactions') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ success: true, data: { transaction: created } }),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/summary`)) {
        summaryCalls += 1;
        const body =
          summaryCalls === 1 ? summaryOk().body : summaryOk(refreshedSummary).body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/transactions`)) {
        listCalls += 1;
        const body =
          listCalls === 1
            ? listOk([TX_BONUS, TX_ADVANCE]).body
            : listOk([created, TX_BONUS, TX_ADVANCE]).body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/attributed-fees`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                fees: {
                  sellerBonusTotal: 0,
                  assemblerFeeTotal: 0,
              installerFeeTotal: 0,
                  deliveryFeeTotal: 0,
                  purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
                  grandTotal: 0,
                  items: [],
                },
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Summa/i), '123456');
    await user.type(within(dialog).getByLabelText(/Tavsif/i), 'PHASE8_STEP3B_TEMP');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Moliyaviy operatsiya qo'shildi/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/PHASE8_STEP3B_TEMP/i)).length).toBeGreaterThan(0);
    expect(summaryCalls).toBeGreaterThan(1);
    expect(listCalls).toBeGreaterThan(1);

    const postCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/worker-finances/transactions') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body.workerId).toBe(WORKER_ID);
    expect(body.type).toBe('BONUS');
    expect(body.amount).toBe(123_456);
    expect(body.description).toBe('PHASE8_STEP3B_TEMP');
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('createdById');
  });

  it('keeps dialog open and preserves values when create fails', async () => {
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
      if (url.includes('/worker-finances/transactions') && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'boom' },
            }),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/summary`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(summaryOk().body),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/transactions`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(listOk([TX_BONUS]).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/attributed-fees`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                fees: {
                  sellerBonusTotal: 0,
                  assemblerFeeTotal: 0,
              installerFeeTotal: 0,
                  deliveryFeeTotal: 0,
                  purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
                  grandTotal: 0,
                  items: [],
                },
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Moliyaviy operatsiya/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Summa/i), '123456');
    await user.type(within(dialog).getByLabelText(/Tavsif/i), 'Saqlanishi kerak');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(
      await within(dialog).findByText(/Operatsiyani saqlab bo'lmadi/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Tavsif/i)).toHaveValue('Saqlanishi kerak');
    expect(within(dialog).getByLabelText(/Summa/i)).toHaveValue('123\u00A0456');
  });

  it('shows Qaytarish for eligible transactions and not for REVERSAL or already reversed', async () => {
    mockApi(
      financeMocks({
        [`/worker-finances/workers/${WORKER_ID}/transactions`]: listOk([
          TX_REVERSAL,
          TX_BONUS,
          TX_ADVANCE,
        ]),
      }),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/Bonus operatsiyasi qaytarildi/i)).not.toHaveLength(0);
    // ADVANCE is still eligible; BONUS is already reversed; REVERSAL has no action.
    const reverseButtons = await screen.findAllByRole('button', { name: /^Qaytarish$/i });
    expect(reverseButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Qaytarilgan').length).toBeGreaterThan(0);
  });

  it('opens reverse confirmation dialog and cancel does not call API', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(financeMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const reverseButtons = await screen.findAllByRole('button', { name: /^Qaytarish$/i });
    await user.click(reverseButtons[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Operatsiyani bekor qilish\?/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/teskarisi yaratiladi/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/tarixda saqlanadi/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Yopish$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const reverseCalls = fetchMock.mock.calls.filter(
      (call) =>
        String(call[0]).includes('/reverse') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(reverseCalls).toHaveLength(0);
  });

  it('confirms reverse, closes dialog, shows success, and refreshes queries', async () => {
    const user = userEvent.setup();
    let summaryCalls = 0;
    let listCalls = 0;
    const reversal = { ...TX_REVERSAL, description: 'PHASE8_STEP3C_TEMP reversal' };

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
      if (url.includes(`/worker-finances/transactions/${TX_BONUS.id}/reverse`) && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              success: true,
              data: { original: TX_BONUS, reversal },
            }),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/summary`)) {
        summaryCalls += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(summaryOk().body),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/transactions`)) {
        listCalls += 1;
        const body =
          listCalls === 1 ? listOk([TX_BONUS]).body : listOk([reversal, TX_BONUS]).body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/attributed-fees`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                fees: {
                  sellerBonusTotal: 0,
                  assemblerFeeTotal: 0,
              installerFeeTotal: 0,
                  deliveryFeeTotal: 0,
                  purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
                  grandTotal: 0,
                  items: [],
                },
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const reverseButtons = await screen.findAllByRole('button', { name: /^Qaytarish$/i });
    await user.click(reverseButtons[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Operatsiyani qaytarish/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Operatsiya qaytarildi/i)).toBeInTheDocument();
    expect(summaryCalls).toBeGreaterThan(1);
    expect(listCalls).toBeGreaterThan(1);

    const reverseCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/worker-finances/transactions/${TX_BONUS.id}/reverse`) &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(reverseCall).toBeTruthy();
    const body = JSON.parse(String((reverseCall![1] as RequestInit).body));
    expect(body).not.toHaveProperty('storeId');
    expect(body).not.toHaveProperty('workerId');
    expect(body).not.toHaveProperty('createdById');
    expect(body).not.toHaveProperty('amount');
  });

  it.each([
    [409, /Bu operatsiya allaqachon qaytarilgan/i],
    [403, /Bu amalni bajarish huquqingiz yo'q/i],
    [404, /Operatsiya topilmadi/i],
    [500, /Operatsiyani qaytarishda xatolik yuz berdi/i],
  ] as const)('keeps reverse dialog open on %s', async (status, message) => {
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
      if (url.includes('/reverse') && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status,
          json: () =>
            Promise.resolve({
              success: false,
              error: { code: 'ERROR', message: 'server' },
            }),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/summary`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(summaryOk().body),
        } as Response);
      }
      if (url.includes(`/worker-finances/workers/${WORKER_ID}/transactions`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(listOk([TX_BONUS]).body),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}/attributed-fees`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                fees: {
                  sellerBonusTotal: 0,
                  assemblerFeeTotal: 0,
              installerFeeTotal: 0,
                  deliveryFeeTotal: 0,
                  purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
                  grandTotal: 0,
                  items: [],
                },
              },
            }),
        } as Response);
      }
      if (url.includes(`/workers/${WORKER_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(workerOk().body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerFinances(WORKER_ID)]}>
        <Routes>
          <Route path="/workers/:id/finances" element={<WorkerFinancesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click((await screen.findAllByRole('button', { name: /^Qaytarish$/i }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Operatsiyani qaytarish/i }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByText(/Oy yakuni bonus/i)).toBeInTheDocument();
  });
});

describe('WorkerDetailPage finance link', () => {
  it('includes Moliyaviy hisob navigation', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER_ID}/activity`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER_ID}/attributed-fees`]: {
        status: 200,
        body: {
          success: true,
          data: {
            fees: {
              sellerBonusTotal: 0,
              assemblerFeeTotal: 0,
              installerFeeTotal: 0,
              deliveryFeeTotal: 0,
              purchaseDriverFeeTotal: 0,
              manualFeeTotal: 0,
              grandTotal: 0,
              items: [],
            },
          },
        },
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
                  monthAdvances: 0,
                  monthOutstanding: 0,
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

    const link = await screen.findByRole('link', { name: 'Moliyaviy hisob' });
    expect(link).toHaveAttribute('href', ROUTES.workerFinances(WORKER_ID));
  });
});

describe('Worker finances route guard', () => {
  it('blocks EMPLOYEE from /workers/:id/finances', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
    });

    const router = createMemoryRouter(routes, {
      initialEntries: [ROUTES.workerFinances(WORKER_ID)],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.dashboard);
    });
  });
});
