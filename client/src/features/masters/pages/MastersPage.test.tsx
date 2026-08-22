import { WorkerResponsibility } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { MastersPage } from './MastersPage';

const SIGNED_IN = { status: 200, body: { success: true, data: { user: { role: 'ADMIN' } } } };

const ASSEMBLER = {
  id: 'worker_asm_1',
  fullName: 'Rustam Usta',
  username: 'rustam',
  email: 'rustam@furniture-erp.local',
  phone: '+998901234567',
  role: 'EMPLOYEE',
  isActive: true,
  responsibilities: [WorkerResponsibility.ASSEMBLER],
  createdAt: '2026-01-01T00:00:00.000Z',
  salesCount: 0,
  assemblyTaskCount: 5,
  activeTaskCount: 2,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MastersPage', () => {
  it('queries assemblers and renders names', async () => {
    const fetchMock = mockApi({
      '/auth/me': SIGNED_IN,
      '/workers': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [ASSEMBLER],
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
        <MastersPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('masters-page')).toBeInTheDocument();
    expect(await screen.findByText('Rustam Usta')).toBeInTheDocument();
    expect(screen.getByText('+998901234567')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    const workersCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/workers'));
    expect(workersCall).toBeTruthy();
    expect(String(workersCall![0])).toContain('responsibility=ASSEMBLER');
  });
});
