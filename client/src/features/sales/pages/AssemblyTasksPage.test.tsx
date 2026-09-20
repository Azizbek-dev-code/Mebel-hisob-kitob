import { AssemblyTaskStatus } from '@furniture-erp/shared';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders } from '@/test/test-utils';

import { AssemblyTasksPage } from './AssemblyTasksPage';

const myAssemblyTasksMock = vi.fn();

vi.mock('@/services/sales.service', () => ({
  salesService: {
    myAssemblyTasks: (...args: unknown[]) => myAssemblyTasksMock(...args),
    updateAssemblyTask: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockApi({
    '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
  });
  myAssemblyTasksMock.mockResolvedValue([
    {
      id: 'task_1',
      saleId: 'sale_1',
      saleNumber: 21,
      status: AssemblyTaskStatus.PENDING,
      assignedAt: '2026-09-20T10:00:00.000Z',
      deadline: null,
      startedAt: null,
      completedAt: null,
      notes: null,
      assignee: { id: 'user_ali', fullName: 'Ali', role: 'EMPLOYEE' },
      assignedBy: null,
      completedBy: null,
      customerName: 'Mijoz',
      productSummary: 'Divan yig‘ish',
    },
    {
      id: 'task_2',
      saleId: 'sale_2',
      saleNumber: 22,
      status: AssemblyTaskStatus.IN_PROGRESS,
      assignedAt: '2026-09-20T11:00:00.000Z',
      deadline: null,
      startedAt: '2026-09-20T11:05:00.000Z',
      completedAt: null,
      notes: null,
      assignee: { id: 'user_vali', fullName: 'Vali', role: 'EMPLOYEE' },
      assignedBy: null,
      completedBy: null,
      customerName: 'Mijoz 2',
      productSummary: 'Shkaf yig‘ish',
    },
  ]);
});

describe('AssemblyTasksPage', () => {
  it('shows every worker task with the assignee name', async () => {
    renderWithProviders(
      <MemoryRouter>
        <AssemblyTasksPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Ali — Divan/i)).toBeInTheDocument();
    expect(screen.getByText(/Vali — Shkaf/i)).toBeInTheDocument();
    expect(screen.getAllByText("Mas'ul").length).toBeGreaterThan(0);
  });
});
