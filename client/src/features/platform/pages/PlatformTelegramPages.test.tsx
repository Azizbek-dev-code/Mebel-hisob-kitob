import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformTelegramBotPage, PlatformTelegramPage } from './PlatformTelegramPages';

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
            publicAppUrl: 'https://balancy.space',
            webhook: {
              url: 'https://example.ngrok.app/api/telegram/webhook',
              configuredUrl: 'https://example.ngrok.app/api/telegram/webhook',
              active: true,
              pendingUpdateCount: 0,
              lastErrorMessage: null,
              lastErrorDate: null,
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

describe('PlatformTelegramBotPage webhook status', () => {
  it('shows historical last_error as Previous error while Active', async () => {
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
            publicAppUrl: 'https://balancy.space',
            webhook: {
              url: 'https://balancy.space/api/telegram/webhook',
              configuredUrl: 'https://balancy.space/api/telegram/webhook',
              active: true,
              pendingUpdateCount: 0,
              lastErrorMessage: 'Wrong response from the webhook: 308 Permanent Redirect',
              lastErrorDate: 1_700_000_000,
              lastCheckedAt: '2026-09-25T00:00:00.000Z',
            },
            connectedUsers: 3,
            lastValidatedAt: null,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformTelegramBotPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/🟢 Active/)).toBeInTheDocument();
    expect(screen.getByText('Previous error')).toBeInTheDocument();
    expect(screen.getByText(/308 Permanent Redirect/)).toBeInTheDocument();
    expect(screen.queryByText(/Webhook o‘chiq yoki Expected bilan mos emas/)).not.toBeInTheDocument();
  });

  it('shows last_error as an active danger when webhook is inactive', async () => {
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
            publicAppUrl: 'https://balancy.space',
            webhook: {
              url: 'https://wrong.example/api/telegram/webhook',
              configuredUrl: 'https://balancy.space/api/telegram/webhook',
              active: false,
              pendingUpdateCount: 2,
              lastErrorMessage: 'Wrong response from the webhook: 308 Permanent Redirect',
              lastErrorDate: 1_700_000_000,
              lastCheckedAt: '2026-09-25T00:00:00.000Z',
            },
            connectedUsers: 3,
            lastValidatedAt: null,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformTelegramBotPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/O‘chiq/)).toBeInTheDocument();
    expect(screen.getByText(/Webhook o‘chiq yoki Expected bilan mos emas/)).toBeInTheDocument();
    expect(screen.queryByText('Previous error')).not.toBeInTheDocument();
    expect(screen.getByText(/308 Permanent Redirect/)).toBeInTheDocument();
  });
});
