import { AssemblyTaskStatus, WorkerResponsibility } from '@furniture-erp/shared';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { MasterDetailPage } from './MasterDetailPage';

const SIGNED_IN = { status: 200, body: { success: true, data: { user: TEST_ADMIN } } };

const WORKER = {
  id: 'cjld2work0000qzrmn831i7rn',
  fullName: 'Ali Usta',
  username: 'ali',
  email: 'ali@furniture-erp.local',
  phone: '+998901111111',
  notes: null,
  role: 'EMPLOYEE',
  isActive: true,
  responsibilities: [WorkerResponsibility.ASSEMBLER],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  stats: {
    totalSales: 0,
    salesThisMonth: 0,
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

describe('MasterDetailPage', () => {
  it('shows worker stats and compensation links', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER.id}/tasks`]: {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'task_1',
                saleId: 'sale_1',
                saleNumber: 42,
                status: AssemblyTaskStatus.PENDING,
                assignedAt: '2026-08-01T00:00:00.000Z',
                deadline: null,
                startedAt: null,
                completedAt: null,
                notes: null,
                customerName: 'Anvar Aliyev',
                productSummary: 'Divan',
              },
            ],
          },
        },
      },
      [`/workers/${WORKER.id}`]: {
        status: 200,
        body: { success: true, data: { worker: WORKER } },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.masterDetail(WORKER.id)]}>
        <Routes>
          <Route path="/masters/:id" element={<MasterDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Ali Usta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jami ishlar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#S-000042' })).toHaveAttribute(
      'href',
      ROUTES.saleDetail('sale_1'),
    );
    expect(screen.getByText(/Anvar Aliyev/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kompensatsiya qoidalari' })).toHaveAttribute(
      'href',
      ROUTES.workerCompensation(WORKER.id),
    );
    expect(screen.getByRole('link', { name: 'Oldindan ko‘rish' })).toHaveAttribute(
      'href',
      ROUTES.workerCompensationPreview(WORKER.id),
    );
    expect(screen.getByRole('link', { name: 'To‘liq profil' })).toHaveAttribute(
      'href',
      ROUTES.workerDetail(WORKER.id),
    );
  });

  it('shows error when worker is not an assembler', async () => {
    mockApi({
      '/auth/me': SIGNED_IN,
      [`/workers/${WORKER.id}/tasks`]: {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      [`/workers/${WORKER.id}`]: {
        status: 200,
        body: {
          success: true,
          data: {
            worker: {
              ...WORKER,
              responsibilities: [WorkerResponsibility.SELLER],
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.masterDetail(WORKER.id)]}>
        <Routes>
          <Route path="/masters/:id" element={<MasterDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bu ishchi usta emas')).toBeInTheDocument();
  });
});
