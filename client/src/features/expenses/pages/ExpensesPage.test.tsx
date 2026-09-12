import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_SUMMARY } from '@/features/dashboard/test/fixtures';
import { routes } from '@/routes/index';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';

import { ExpensesPage } from './ExpensesPage';

function moneyMatcher(amount: number): RegExp {
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00A0]');
  return new RegExp(`${digits}[\\s\\u00A0]*so'm`);
}

const CATEGORY_ELEKTR = {
  id: 'clcatlektr000000000000001',
  name: 'Elektr',
  color: 'amber',
  sortOrder: 0,
  isActive: true,
};

const CATEGORY_TRANSPORT = {
  id: 'clcattransp00000000000001',
  name: 'Transport',
  color: 'cyan',
  sortOrder: 1,
  isActive: true,
};

const EXPENSE = {
  id: 'clexpense0000000000000001',
  amount: 850_000,
  expenseDate: '2026-08-09T12:00:00.000Z',
  description: "Do'kon elektr to'lovi",
  status: 'ACTIVE',
  cancellationReason: null,
  cancelledAt: null,
  category: {
    id: CATEGORY_ELEKTR.id,
    name: CATEGORY_ELEKTR.name,
    color: CATEGORY_ELEKTR.color,
    isActive: true,
  },
  createdBy: { id: 'user_admin', fullName: 'Store Administrator' },
  createdAt: '2026-08-09T12:05:00.000Z',
  updatedAt: '2026-08-09T12:05:00.000Z',
};

const EMPTY_LIST = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [],
      meta: {
        page: 1,
        pageSize: 100,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  },
};

const LIST_WITH_EXPENSE = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [EXPENSE],
      meta: {
        page: 1,
        pageSize: 100,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  },
};

const CATEGORIES = {
  status: 200,
  body: {
    success: true,
    data: { items: [CATEGORY_ELEKTR, CATEGORY_TRANSPORT] },
  },
};

const SIGNED_IN = { status: 200, body: { success: true, data: { user: TEST_ADMIN } } };
const EMPLOYEE_SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_EMPLOYEE } },
};

function renderExpensesPage() {
  return renderWithProviders(
    <MemoryRouter>
      <ExpensesPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExpensesPage', () => {
  it('renders the page title and add button', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': EMPTY_LIST,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();

    expect(await screen.findByRole('heading', { level: 2, name: 'Xarajatlar' })).toBeInTheDocument();
    expect(screen.getByText(/Do.kon xarajatlarini tez va oson boshqaring/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xarajat qo.shish/i })).toBeInTheDocument();
  });

  it('renders expense list rows', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': LIST_WITH_EXPENSE,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();

    expect(await screen.findAllByText('Elektr')).not.toHaveLength(0);
    expect(screen.getAllByText("Do'kon elektr to'lovi").length).toBeGreaterThan(0);
    expect(screen.getAllByText(moneyMatcher(850_000)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Store Administrator').length).toBeGreaterThan(0);
  });

  it('shows empty state when there are no expenses', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': EMPTY_LIST,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();

    expect(await screen.findByText(/Xarajatlar yo.q/i)).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        },
      },
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();

    expect(await screen.findByText(/Xarajatlarni yuklab bo.lmadi/i)).toBeInTheDocument();
  });

  it('opens the add expense form and loads categories', async () => {
    const user = userEvent.setup();
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': EMPTY_LIST,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    await screen.findByRole('heading', { level: 2, name: 'Xarajatlar' });

    await user.click(screen.getByRole('button', { name: /Xarajat qo.shish/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(/Kategoriya/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Summa/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Sana$/i)).toBeInTheDocument();

    await user.click(within(dialog).getByPlaceholderText(/Kategoriya/i));
    expect(await screen.findByRole('button', { name: 'Elektr' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transport' })).toBeInTheDocument();
  });

  it('validates required category and positive amount', async () => {
    const user = userEvent.setup();
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': EMPTY_LIST,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    await user.click(await screen.findByRole('button', { name: /Xarajat qo.shish/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(await within(dialog).findByText(/Kategoriyani tanlang/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Summa 0 dan katta/i)).toBeInTheDocument();
  });

  it('rejects zero amount after category is chosen', async () => {
    const user = userEvent.setup();
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': EMPTY_LIST,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    await user.click(await screen.findByRole('button', { name: /Xarajat qo.shish/i }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText(/Kategoriya/i));
    await user.click(await screen.findByRole('button', { name: 'Elektr' }));
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(await within(dialog).findByText(/Summa 0 dan katta/i)).toBeInTheDocument();
  });

  it('creates an expense successfully and shows feedback', async () => {
    const user = userEvent.setup();
    let listCalls = 0;

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }

      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }

      if (url.includes('/expenses') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ success: true, data: { expense: EXPENSE } }),
        } as Response);
      }

      if (url.includes('/expenses')) {
        listCalls += 1;
        const body = listCalls === 1 ? EMPTY_LIST.body : LIST_WITH_EXPENSE.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click(await screen.findByRole('button', { name: /Xarajat qo.shish/i }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByLabelText(/Kategoriya/i));
    await user.click(await screen.findByRole('button', { name: 'Elektr' }));
    await user.type(within(dialog).getByLabelText(/Summa/i), '850000');
    await user.type(within(dialog).getByLabelText(/Izoh/i), 'Test elektr xarajati');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/Xarajat saqlandi/i)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/expenses') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body).toEqual(
      expect.objectContaining({
        categoryId: CATEGORY_ELEKTR.id,
        amount: 850_000,
        description: 'Test elektr xarajati',
      }),
    );
    expect(body).not.toHaveProperty('storeId');
    expect(Number.isInteger(body.amount)).toBe(true);
  });

  it('shows a friendly error when create fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(SIGNED_IN.body),
        } as Response);
      }
      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }
      if (url.includes('/expenses') && init?.method === 'POST') {
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
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(EMPTY_LIST.body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click(await screen.findByRole('button', { name: /Xarajat qo.shish/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/Kategoriya/i));
    await user.click(await screen.findByRole('button', { name: 'Elektr' }));
    await user.type(within(dialog).getByLabelText(/Summa/i), '100000');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(
      await within(dialog).findByText(/Something went wrong on the server/i),
    ).toBeInTheDocument();
  });

  it('renders Edit and Cancel actions for each expense', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': LIST_WITH_EXPENSE,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    expect(await screen.findAllByRole('button', { name: /Tahrirlash Elektr/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Bekor Elektr/i }).length).toBeGreaterThan(0);
  });

  it('opens the edit dialog with existing values prefilled', async () => {
    const user = userEvent.setup();
    mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': LIST_WITH_EXPENSE,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Tahrirlash Elektr/i }))[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Xarajatni tahrirlash')).toBeInTheDocument();
    expect(within(dialog).getByText('Elektr')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Summa/i)).toHaveValue('850\u00A0000');
    expect(within(dialog).getByLabelText(/^Sana$/i)).toHaveValue('2026-08-09');
    expect(within(dialog).getByLabelText(/Izoh/i)).toHaveValue("Do'kon elektr to'lovi");
  });

  it('updates an expense successfully and shows feedback', async () => {
    const user = userEvent.setup();
    const updated = {
      ...EXPENSE,
      amount: 900_000,
      description: 'Yangilangan izoh',
      updatedAt: '2026-08-09T13:00:00.000Z',
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
      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }
      if (url.includes(`/expenses/${EXPENSE.id}`) && method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { expense: updated } }),
        } as Response);
      }
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                items: [updated],
                meta: LIST_WITH_EXPENSE.body.data.meta,
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url} ${method}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Tahrirlash Elektr/i }))[0]!);
    const dialog = await screen.findByRole('dialog');

    const amountInput = within(dialog).getByLabelText(/Summa/i);
    await user.clear(amountInput);
    await user.type(amountInput, '900000');
    const descriptionInput = within(dialog).getByLabelText(/Izoh/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Yangilangan izoh');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Xarajat yangilandi/i)).toBeInTheDocument();

    const patchCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/expenses/${EXPENSE.id}`) &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    expect(patchCall).toBeTruthy();
    const body = JSON.parse(String((patchCall![1] as RequestInit).body));
    expect(body).toEqual(
      expect.objectContaining({
        amount: 900_000,
        description: 'Yangilangan izoh',
        categoryId: CATEGORY_ELEKTR.id,
      }),
    );
    expect(body).not.toHaveProperty('storeId');
  });

  it('keeps the edit dialog open when update fails', async () => {
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
      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }
      if (url.includes(`/expenses/${EXPENSE.id}`) && method === 'PATCH') {
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
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(LIST_WITH_EXPENSE.body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Tahrirlash Elektr/i }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Saqlash$/i }));

    expect(
      await within(dialog).findByText(/Something went wrong on the server/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens cancel confirmation and closing does not cancel', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      '/auth/me': SIGNED_IN,
      '/expenses': LIST_WITH_EXPENSE,
      '/expense-categories': CATEGORIES,
    });

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Bekor Elektr/i }))[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Xarajatni bekor qilish\?/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/hisobotlardan chiqariladi/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Yopish/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const cancelCalls = fetchMock.mock.calls.filter(
      (call) =>
        (call[1] as RequestInit | undefined)?.method === 'POST' &&
        String(call[0]).includes('/cancel'),
    );
    expect(cancelCalls).toHaveLength(0);
    expect(screen.getAllByText(moneyMatcher(850_000)).length).toBeGreaterThan(0);
  });

  it('cancels an expense after confirmation', async () => {
    const user = userEvent.setup();
    let deleted = false;
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
      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }
      if (url.includes(`/expenses/${EXPENSE.id}/cancel`) && method === 'POST') {
        deleted = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                expense: {
                  ...EXPENSE,
                  status: 'CANCELLED',
                  cancellationReason: 'Duplicate entry',
                  cancelledAt: '2026-08-18T10:00:00.000Z',
                },
              },
            }),
        } as Response);
      }
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(deleted ? EMPTY_LIST.body : LIST_WITH_EXPENSE.body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url} ${method}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Bekor Elektr/i }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Duplicate entry');
    await user.click(within(dialog).getByRole('button', { name: /^Bekor qilish$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Xarajat bekor qilindi/i)).toBeInTheDocument();

    const deleteCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/expenses/${EXPENSE.id}`) &&
        (call[1] as RequestInit | undefined)?.method === 'POST' && String(call[0]).includes('/cancel'),
    );
    expect(deleteCall).toBeTruthy();
  });

  it('keeps the cancel dialog open when cancel fails', async () => {
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
      if (url.includes('/expense-categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(CATEGORIES.body),
        } as Response);
      }
      if (url.includes(`/expenses/${EXPENSE.id}/cancel`) && method === 'POST') {
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
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(LIST_WITH_EXPENSE.body),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExpensesPage();
    await user.click((await screen.findAllByRole('button', { name: /Bekor Elektr/i }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Duplicate entry');
    await user.click(within(dialog).getByRole('button', { name: /^Bekor qilish$/i }));

    expect(
      await within(dialog).findByText(/Something went wrong on the server/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('expense route authorization', () => {
  it('redirects EMPLOYEE away from /expenses', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
      '/dashboard/summary': {
        status: 200,
        body: { success: true, data: { summary: EMPTY_SUMMARY } },
      },
      '/sales/assembly-tasks/mine': {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      '/me/stats': {
        status: 200,
        body: {
          success: true,
          data: {
            stats: {
              totalSales: 0,
              salesThisMonth: 0,
              salesToday: 0,
              totalAssemblyTasks: 0,
              completedAssemblyTasks: 0,
              pendingAssemblyTasks: 0,
              completedTasksThisMonth: 0,
            },
          },
        },
      },
      '/me/profile-modules': {
        status: 200,
        body: {
          success: true,
          data: {
            modules: {
              worker: {
                id: TEST_EMPLOYEE.id,
                fullName: TEST_EMPLOYEE.fullName,
                username: TEST_EMPLOYEE.username,
                phone: TEST_EMPLOYEE.phone,
                role: TEST_EMPLOYEE.role,
                isActive: true,
                responsibilities: TEST_EMPLOYEE.responsibilities,
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
            },
          },
        },
      },
      '/me/profile': {
        status: 200,
        body: {
          success: true,
          data: {
            worker: {
              ...TEST_EMPLOYEE,
              notes: null,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              lastLoginAt: null,
              stats: {
                totalSales: 0,
                salesThisMonth: 0,
                salesToday: 0,
                totalAssemblyTasks: 0,
                completedAssemblyTasks: 0,
                pendingAssemblyTasks: 0,
                completedTasksThisMonth: 0,
              },
            },
          },
        },
      },
      '/me/sales': EMPTY_LIST,
      '/me/activity': { status: 200, body: { success: true, data: { items: [] } } },
    });

    renderWithProviders(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [ROUTES.expenses] })}
      />,
    );

    // EMPLOYEE lands on the worker dashboard after being redirected from expenses.
    expect(await screen.findByText(/Xush kelibsiz,\s*Ali/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Xarajatlar' })).not.toBeInTheDocument();
  });
});
