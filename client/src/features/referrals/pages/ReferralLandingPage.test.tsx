import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { ReferralLandingPage } from './ReferralLandingPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReferralLandingPage', () => {
  it('records a click then leaves the public landing copy', async () => {
    mockApi({
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

  it('shows an invalid-link message for a made-up code', async () => {
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
