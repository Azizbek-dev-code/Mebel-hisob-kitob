import { WorkerResponsibility } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { MySalesPage } from './MySalesPage';
import { NewWorkerPage } from './NewWorkerPage';
import { WorkerDashboardPage } from './WorkerDashboardPage';
import { WorkerDetailPage } from './WorkerDetailPage';
import { WorkersPage } from './WorkersPage';

const SIGNED_IN = { status: 200, body: { success: true, data: { user: TEST_ADMIN } } };
const EMPLOYEE_SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_EMPLOYEE } },
};

const WORKER = {
  id: 'cjld2work0000qzrmn831i7rn',
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

const PROFILE_MODULES = {
  worker: {
    id: WORKER.id,
    fullName: WORKER.fullName,
    username: WORKER.username,
    phone: WORKER.phone,
    role: WORKER.role,
    isActive: WORKER.isActive,
    responsibilities: WORKER.responsibilities,
    createdAt: WORKER.createdAt,
  },
  tabs: ['GENERAL', 'SELLER', 'ASSEMBLER'],
  general: {
    finance: {
      earned: 500_000,
      paid: 200_000,
      outstanding: 300_000,
      monthEarned: 100_000,
      monthPaid: 50_000,
      bonuses: 0,
      advances: 0,
      debt: 0,
      adjustments: 0,
      reversals: 0,
      commissions: 500_000,
    },
    breakdown: [],
  },
  seller: {
    salesToday: 0,
    salesThisMonth: 1,
    salesTotal: 2,
    salesAmountToday: 0,
    salesAmountMonth: 1_000_000,
    salesAmountTotal: 2_000_000,
    grossProfitMonth: 300_000,
    grossProfitTotal: 600_000,
    netProfitMonth: 200_000,
    netProfitTotal: 400_000,
    averageSale: 1_000_000,
    largestSaleMonth: 1_000_000,
    completedSales: 2,
    cancelledSales: 0,
    earnedTotal: 100_000,
    earnedMonth: 50_000,
    pendingTotal: 0,
    pendingMonth: 0,
    calculatedTotal: 100_000,
    calculatedMonth: 50_000,
    paidTotal: 0,
    paidMonth: 0,
    outstandingTotal: 100_000,
    outstandingMonth: 50_000,
    bonusTotal: 0,
    bonusMonth: 0,
    commissionTotal: 100_000,
    activeRules: [],
    recentSales: [],
    commissions: [],
    payments: [],
  },
  assembler: {
    pending: 1,
    inProgress: 0,
    completed: 2,
    cancelled: 0,
    completedThisMonth: 1,
    feeTotal: 400_000,
    paid: 200_000,
    outstanding: 200_000,
    tasks: [],
  },
  delivery: null,
  installer: null,
  smm: null,
  other: null,
  ledgerSummary: {
    workerId: WORKER.id,
    worker: { id: WORKER.id, fullName: WORKER.fullName, isActive: true },
    totalBonuses: 0,
    totalCommissions: 500_000,
    totalAdvances: 0,
    totalDebt: 0,
    totalPayments: 200_000,
    totalAdjustments: 0,
    totalReversals: 0,
    netFinancialPosition: 300_000,
    transactionCount: 2,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WorkersPage', () => {
  it('renders the worker list from the API', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/workers': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: WORKER.id,
                fullName: WORKER.fullName,
                username: WORKER.username,
                email: WORKER.email,
                phone: WORKER.phone,
                role: WORKER.role,
                isActive: true,
                responsibilities: WORKER.responsibilities,
                createdAt: WORKER.createdAt,
                salesCount: 2,
                assemblyTaskCount: 3,
                activeTaskCount: 1,
              },
            ],
            meta: {
              page: 1,
              pageSize: 20,
              totalItems: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <WorkersPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Ali Usta')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assembler').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seller').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ustalar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yangi ishchi/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Haqlar solishtirishi' })).toHaveAttribute(
      'href',
      ROUTES.workersReconciliation,
    );
  });
});

describe('NewWorkerPage', () => {
  it('submits worker creation with multiple responsibilities', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      '/auth/me': SIGNED_IN,
      '/workers': {
        status: 201,
        body: { success: true, data: { worker: WORKER } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <NewWorkerPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/first name/i), 'Ali');
    await user.type(screen.getByLabelText(/last name/i), 'Usta');
    await user.type(screen.getByLabelText(/^username$/i), 'ali');
    await user.type(screen.getByLabelText(/^password$/i), 'Ali12345!');

    const seller = screen.getByLabelText(/^Seller$/i);
    if (!(seller as HTMLInputElement).checked) {
      await user.click(seller);
    }

    await user.click(screen.getByRole('button', { name: /create worker/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/workers'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/workers') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body.firstName).toBe('Ali');
    expect(body.responsibilities).toEqual(
      expect.arrayContaining([WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER]),
    );
  });
});

describe('WorkerDetailPage', () => {
  it('shows profile, responsibilities and modules', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER.id}/activity`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER.id}/profile-modules`]: {
        status: 200,
        body: { success: true, data: { modules: PROFILE_MODULES } },
      },
      [`/workers/${WORKER.id}`]: {
        status: 200,
        body: { success: true, data: { worker: WORKER } },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerDetail(WORKER.id)]}>
        <Routes>
          <Route path="/workers/:id" element={<WorkerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Ali Usta' })).toBeInTheDocument();
    expect(screen.getByText('Profil modullari')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Umumiy' })).toBeInTheDocument();
  });
});

describe('WorkerDashboardPage', () => {
  it('shows real worker metrics from profile modules', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
      '/api/me/profile-modules': {
        status: 200,
        body: { success: true, data: { modules: PROFILE_MODULES } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <WorkerDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Xush kelibsiz, Ali/i)).toBeInTheDocument();
    expect(await screen.findByText('Bugun')).toBeInTheDocument();
    expect(screen.getByText('Shu oy')).toBeInTheDocument();
    expect(screen.getByText('Kutilayotgan terlash')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Moliyaviy hisob' })).toHaveAttribute(
      'href',
      ROUTES.profileFinances,
    );
  });
});

describe('MySalesPage', () => {
  it('renders isolated my-sales list', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      '/api/me/sales': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'sale_1',
                saleNumber: 42,
                saleDate: '2026-08-01T00:00:00.000Z',
                customerName: 'Anvar Aliyev',
                productSummary: 'Sofa',
                totalSalePrice: 1_000_000,
                paidAmount: 200_000,
                remainingAmount: 800_000,
                paymentStatus: 'PARTIALLY_PAID',
              },
            ],
            meta: {
              page: 1,
              pageSize: 20,
              totalItems: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <MySalesPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Anvar Aliyev')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/42/).length).toBeGreaterThan(0);
  });
});
