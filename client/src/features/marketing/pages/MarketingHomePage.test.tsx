import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';
import { ROUTES } from '@/routes/paths';

import { MarketingHomePage } from './MarketingHomePage';

describe('MarketingHomePage', () => {
  it('renders brand H1 and primary CTA', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={[ROUTES.home]}>
        <Routes>
          <Route path={ROUTES.home} element={<MarketingHomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Hayotingizni bir joyda tartibga soling' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /7 kun bepul/i })).toHaveAttribute(
      'href',
      ROUTES.onboarding,
    );
  });
});
