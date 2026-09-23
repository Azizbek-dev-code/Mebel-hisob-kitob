import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformTelegramPage } from './PlatformTelegramPages';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformTelegramPage', () => {
  it('shows bot status without exposing a token', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/telegram/admin/status': {
        status: 200,
        body: {
          success: true,
          data: {
            connected: true,
            botUsername: '@balancyspace_bot',
            botFirstName: 'Balancy',
            tokenConfigured: true,
            tokenSource: 'env',
            hasDatabaseToken: false,
            webhookSecretConfigured: true,
            publicAppUrl: 'https://www.mebelboshqaruv.uz',
            webhook: {
              url: 'https://example.ngrok.app/api/telegram/webhook',
              configuredUrl: 'https://example.ngrok.app/api/telegram/webhook',
              active: true,
              pendingUpdateCount: 0,
              lastErrorMessage: null,
              lastCheckedAt: '2026-09-21T00:00:00.000Z',
            },
            connectedUsers: 12,
            lastValidatedAt: null,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformTelegramPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('@balancyspace_bot')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText(/123456:/)).not.toBeInTheDocument();
  });
});
