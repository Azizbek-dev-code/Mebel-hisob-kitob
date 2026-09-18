import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { ReferralLandingPage } from './ReferralLandingPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReferralLandingPage', () => {
  it('records a click then leaves the public landing copy', async () => {
    mockApi({
      '/auth/me': SIGNED_OUT_RESPONSE,
      '/referrals/click': { status: 200, body: { success: true, data: { code: 'ABX7K29Q' } } },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/ref/ABX7K29Q']}>
        <Routes>
          <Route path="/ref/:code" element={<ReferralLandingPage />} />
          <Route path="/onboarding" element={<p>Onboarding</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Onboarding')).toBeInTheDocument();
  });

  it('sends an already-signed-in user home instead of onboarding', async () => {
    mockApi({
      '/auth/me': {
        status: 200,
        body: {
          success: true,
          data: { user: TEST_ADMIN },
        },
      },
      '/referrals/click': { status: 200, body: { success: true, data: { code: 'ABX7K29Q' } } },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/ref/ABX7K29Q']}>
        <Routes>
          <Route path="/ref/:code" element={<ReferralLandingPage />} />
          <Route path="/onboarding" element={<p>Onboarding</p>} />
          <Route path="/dashboard" element={<p>Dashboard home</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
    expect(screen.queryByText('Onboarding')).not.toBeInTheDocument();
  });

  it('shows an invalid-link message for a made-up code', async () => {
    mockApi({
      '/auth/me': SIGNED_OUT_RESPONSE,
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/ref/not-a-code']}>
        <Routes>
          <Route path="/ref/:code" element={<ReferralLandingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Bu referral havola noto‘g‘ri yoki o‘chirilgan.'),
    ).toBeInTheDocument();
  });
});
