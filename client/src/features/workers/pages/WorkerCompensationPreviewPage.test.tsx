import {
  WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
  WorkerCompensationType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi, type MockApiRoutes } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { WorkerCompensationPreviewPage } from './WorkerCompensationPreviewPage';

const WORKER_ID = 'cjld2work0000qzrmn831i7rn';

const WORKER = {
  id: WORKER_ID,
  fullName: 'Ali Karimov',
  username: 'ali',
  email: 'ali@furniture-erp.local',
  phone: null,
  notes: null,
  role: 'EMPLOYEE',
  isActive: true,
  responsibilities: [WorkerResponsibility.SELLER],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  stats: {
    salesCount: 2,
    monthSalesCount: 2,
    todaySalesCount: 0,
    completedAssemblies: 0,
    pendingAssemblies: 0,
  },
};

const PREVIEW = {
  worker: { id: WORKER_ID, fullName: 'Ali Karimov', isActive: true },
  period: { from: '2026-08-01', to: '2026-08-31' },
  summary: {
    saleEventCount: 2,
    assemblyEventCount: 0,
    deliveryEventCount: 0,
    installationEventCount: 0,
    applicableRuleCount: 1,
    totalCompensation: 860_000,
    breakdownItemCount: 2,
  },
  breakdown: [
    {
      id: 'sale_1:PERCENT_OF_SALE',
      eventDate: '2026-08-01T09:00:00.000Z',
      eventKind: 'SALE',
      description: 'Sotuv #1 · Divan',
      eventAmount: 5_000_000,
      ruleId: 'rule_1',
      ruleType: WorkerCompensationType.PERCENT_OF_SALE,
      responsibility: WorkerResponsibility.SELLER,
      ruleValue: 1000,
      compensationAmount: 500_000,
      referenceType: 'SALE',
      referenceId: 'sale_1',
    },
    {
      id: 'sale_2:PERCENT_OF_SALE',
      eventDate: '2026-08-03T09:00:00.000Z',
      eventKind: 'SALE',
      description: 'Sotuv #2 · Stol',
      eventAmount: 3_000_000,
      ruleId: 'rule_1',
      ruleType: WorkerCompensationType.PERCENT_OF_SALE,
      responsibility: WorkerResponsibility.SELLER,
      ruleValue: 1200,
      compensationAmount: 360_000,
      referenceType: 'SALE',
      referenceId: 'sale_2',
    },
  ],
  readOnly: true as const,
  disclaimer: WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
};

const SIGNED_IN = {
  status: 200,
  body: { success: true, data: { user: TEST_ADMIN } },
};

function pageMocks(extra: MockApiRoutes = {}): MockApiRoutes {
  return {
    '/auth/me': SIGNED_IN,
    [`/workers/${WORKER_ID}/compensation-preview`]: {
      status: 200,
      body: { success: true, data: { preview: PREVIEW } },
    },
    [`/workers/${WORKER_ID}`]: {
      status: 200,
      body: { success: true, data: { worker: WORKER } },
    },
    ...extra,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WorkerCompensationPreviewPage', () => {
  it('shows disclaimer, summary, and breakdown without pay actions', async () => {
    mockApi(pageMocks());
    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerCompensationPreview(WORKER_ID)]}>
        <Routes>
          <Route
            path="/workers/:id/compensation/preview"
            element={<WorkerCompensationPreviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('compensation-preview-disclaimer')).toHaveTextContent(
      WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
    );
    expect(await screen.findByTestId('compensation-preview-summary')).toHaveTextContent(
      'Ali Karimov',
    );
    expect(screen.getByText(/Jami hisoblangan/)).toBeInTheDocument();
    expect(screen.getByTestId('compensation-preview-table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pay|Post|payroll|To'lash/i })).toBeNull();
  });

  it('requests preview for the selected period', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(pageMocks());

    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.workerCompensationPreview(WORKER_ID)]}>
        <Routes>
          <Route
            path="/workers/:id/compensation/preview"
            element={<WorkerCompensationPreviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('compensation-preview-summary');
    await user.click(screen.getByTestId('compensation-preview-apply'));

    await waitFor(() => {
      const previewCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes('/compensation-preview'),
      );
      expect(previewCalls.length).toBeGreaterThan(0);
      expect(String(previewCalls[0]?.[0])).toMatch(/from=/);
      expect(String(previewCalls[0]?.[0])).toMatch(/to=/);
    });
  });
});
