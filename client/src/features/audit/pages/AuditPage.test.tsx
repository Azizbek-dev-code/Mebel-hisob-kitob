import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes';
import { ROUTES } from '@/routes/paths';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

const AUDIT_BODY = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'audit_1',
          eventType: 'LOGIN',
          entityType: 'SESSION',
          entityId: 'user_admin',
          summary: 'Signed in admin',
          metadata: null,
          actor: { id: 'user_admin', fullName: 'Store Administrator' },
          createdAt: '2026-08-20T10:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AuditPage', () => {
  it('renders audit table for admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/audit': AUDIT_BODY,
    });

    const router = createMemoryRouter(routes, { initialEntries: [ROUTES.audit] });
    renderWithProviders(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Audit' })).toBeInTheDocument();
    expect(await screen.findByText('Signed in admin')).toBeInTheDocument();
    expect(screen.getAllByText('LOGIN').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /o‘chirish|edit|delete/i })).not.toBeInTheDocument();
  });

  it('redirects non-admin away from audit', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_EMPLOYEE } } },
    });

    const router = createMemoryRouter(routes, { initialEntries: [ROUTES.audit] });
    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.dashboard);
    });
  });
});
