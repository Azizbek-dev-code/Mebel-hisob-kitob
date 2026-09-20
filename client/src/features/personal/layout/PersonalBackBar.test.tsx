import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';
import { ROUTES } from '@/routes/paths';

import { PersonalBackBar } from './PersonalBackBar';

function renderAt(path: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<PersonalBackBar />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PersonalBackBar', () => {
  it('hides on personal root tabs', () => {
    renderAt(ROUTES.personalDashboard);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('returns nested finance pages to the finance hub', () => {
    renderAt(ROUTES.personalHistory);
    const back = screen.getByRole('link', { name: /Moliya/ });
    expect(back).toHaveAttribute('href', ROUTES.personalFinance);
  });

  it('returns friends and ranking to Profil', () => {
    renderAt(ROUTES.personalGrowthFriends);
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute(
      'href',
      ROUTES.personalProfile,
    );
  });
});
