import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { TelegramConnectionPanel } from './TelegramConnectionPanel';

afterEach(() => {
  vi.unstubAllGlobals();
});

const AUTHED = {
  status: 200,
  body: {
    success: true,
    data: {
      user: {
        id: 'user_1',
        email: 'a@b.c',
        fullName: 'Admin',
        role: 'ADMIN',
        storeId: 's1',
        storeName: 'Store',
        responsibilities: ['SELLER'],
        username: 'admin',
        phone: null,
      },
    },
  },
};

const DISCONNECTED = {
  status: 200,
  body: {
    success: true,
    data: {
      connected: false,
      username: null,
      firstName: null,
      connectedAt: null,
      notifyBusiness: true,
      notifyPersonal: true,
      bizNotifySales: true,
      bizNotifyInventory: true,
      bizNotifyDelivery: true,
      bizNotifyAssembly: true,
      bizNotifyWorkers: true,
      bizNotifyBilling: true,
      bizNotifyImportant: true,
      personalNotifyBudget: true,
      personalNotifyGoals: true,
      personalNotifyRecurring: true,
      personalNotifyDebts: true,
      notifyDailySummaryBusiness: true,
      notifyDailySummaryPersonal: true,
    },
  },
};

describe('TelegramConnectionPanel', () => {
  it('shows link CTA when disconnected and never exposes bot token fields', async () => {
    mockApi({
      '/telegram/status': DISCONNECTED,
      '/auth/me': AUTHED,
    });

    renderWithProviders(<TelegramConnectionPanel surface="business" />);

    expect(await screen.findByText(/Telegram ulanmagan|Telegram не подключён/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Telegramni ulash|Подключить Telegram/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/TELEGRAM_BOT_TOKEN/);
  });

  it('opens deep-link after startLink and shows fallback when popup blocked', async () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal('open', open);

    mockApi({
      '/telegram/status': DISCONNECTED,
      '/auth/me': AUTHED,
      '/telegram/link/start': {
        status: 200,
        body: {
          success: true,
          data: {
            deepLink: 'https://t.me/balancyspace_bot?start=abc',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      },
    });

    renderWithProviders(<TelegramConnectionPanel surface="business" />);
    const button = await screen.findByRole('button', { name: /Telegramni ulash|Подключить Telegram/i });
    button.click();

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(
        'https://t.me/balancyspace_bot?start=abc',
        '_blank',
        'noopener,noreferrer',
      );
    });
    expect(await screen.findByRole('link', { name: /Telegramda ochish|Открыть в Telegram/i })).toHaveAttribute(
      'href',
      'https://t.me/balancyspace_bot?start=abc',
    );
  });
});
