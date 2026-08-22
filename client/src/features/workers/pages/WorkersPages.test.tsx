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

    expect(await screen.findByText('Ali Usta')).toBeInTheDocument();
    expect(screen.getByText('+998901111111')).toBeInTheDocument();
    expect(screen.getAllByText('Assembler').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Seller').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ustalar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yangi ishchi/i })).toBeInTheDocument();
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
  it('shows profile, responsibilities and stats', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER.id}/sales`]: {
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
      [`/workers/${WORKER.id}/tasks`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER.id}/activity`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
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
    expect(screen.getByText('Activity summary')).toBeInTheDocument();
    expect(screen.getByText('Sales total')).toBeInTheDocument();
  });
});

describe('WorkerDashboardPage', () => {
  it('shows real worker metrics', async () => {
    mockApi({
      '/auth/me': EMPLOYEE_SIGNED_IN,
      '/api/me/stats': {
        status: 200,
        body: { success: true, data: { stats: WORKER.stats } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <WorkerDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Welcome, Ali/i)).toBeInTheDocument();
    expect(await screen.findByText("Today's sales")).toBeInTheDocument();
    expect(screen.getByText('Pending tasks')).toBeInTheDocument();
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

    expect(await screen.findByText('Anvar Aliyev')).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
