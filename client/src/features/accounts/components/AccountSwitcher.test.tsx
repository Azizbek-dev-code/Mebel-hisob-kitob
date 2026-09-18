import {
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
  type PersonalAuthUser,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { AccountSwitcher } from './AccountSwitcher';

const PERSONAL: PersonalAuthUser = {
  kind: 'PERSONAL',
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz Karimov',
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Azizning shaxsiy moliyasi',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  membershipRole: 'OWNER',
  subscription: {
    status: 'TRIAL',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-20T00:00:00.000Z',
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

const ME = { status: 200, body: { success: true, data: { user: PERSONAL } } };

const PERSONAL_ONLY = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'ws_1',
          type: WorkspaceType.PERSONAL,
          name: 'Azizning shaxsiy moliyasi',
          status: WorkspaceStatus.ACTIVE,
          storeId: null,
          createdAt: '2026-09-01T00:00:00.000Z',
          role: WorkspaceMembershipRole.OWNER,
        },
      ],
    },
  },
};

const PERSONAL_AND_STORE = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        ...PERSONAL_ONLY.body.data.items,
        {
          id: 'ws_store',
          type: WorkspaceType.BUSINESS,
          name: 'Mebel Savdo',
          status: WorkspaceStatus.ACTIVE,
          storeId: 'store_1',
          createdAt: '2026-09-02T00:00:00.000Z',
          role: WorkspaceMembershipRole.OWNER,
        },
      ],
    },
  },
};

function renderSwitcher() {
  return renderWithProviders(
    <MemoryRouter>
      <AccountSwitcher />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountSwitcher', () => {
  it('shows the avatar even when there is only one workspace', async () => {
    mockApi({ '/auth/me': ME, '/accounts': PERSONAL_ONLY });
    renderSwitcher();

    expect(await screen.findByTestId('account-switcher')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps the add-account CTA pointing at onboarding', async () => {
    mockApi({ '/auth/me': ME, '/accounts': PERSONAL_ONLY });
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(await screen.findByTestId('account-switcher'));

    const radio = await screen.findByRole('menuitemradio', { name: /Shaxsiy moliya/ });
    const menu = screen.getByRole('menu', { name: 'Hisoblar' });
    expect(menu.querySelector('select')).toBeNull();
    expect(radio).toBeInTheDocument();
    expect(screen.getByText('Hisoblaringiz')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Yangi hisob ochish/ })).toHaveAttribute(
      'href',
      '/onboarding',
    );
    expect(screen.queryByRole('menuitem', { name: /Biznes hisob ochish/ })).not.toBeInTheDocument();
  });

  it('lists personal and store workspaces together', async () => {
    mockApi({ '/auth/me': ME, '/accounts': PERSONAL_AND_STORE });
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(await screen.findByTestId('account-switcher'));

    expect(await screen.findByRole('menuitemradio', { name: /Shaxsiy moliya/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Mebel Savdo/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Yangi hisob ochish/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps profile and sign-out in the session menu', async () => {
    mockApi({ '/auth/me': ME, '/accounts': PERSONAL_ONLY });
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <AccountSwitcher includeSessionActions />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId('account-switcher'));
    expect(screen.getByRole('menuitem', { name: 'Profil' })).toHaveAttribute('href', '/personal/profile');
    expect(screen.getByRole('button', { name: 'Chiqish' })).toBeInTheDocument();
  });
});
