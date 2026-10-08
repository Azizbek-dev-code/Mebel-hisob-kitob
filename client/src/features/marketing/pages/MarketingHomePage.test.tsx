import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { fireEvent, renderWithProviders, screen, within } from '@/test/test-utils';

import { MarketingLayout } from '../components/MarketingLayout';
import { MarketingHomePage } from './MarketingHomePage';

describe('MarketingHomePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('balanc_marketing_locale', 'en');
  });

  it('supports product exploration, marketing languages and account routes', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<MarketingHomePage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getAllByRole('heading', { name: /Your life\..*One space\./ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Get started/i })[0]).toHaveAttribute(
      'href',
      '/onboarding',
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Log in' })
        .some((link) => link.getAttribute('href') === '/login'),
    ).toBe(true);

    fireEvent.click(screen.getAllByRole('button', { name: 'RU' })[0]!);
    expect(
      screen.getAllByRole('heading', { name: /Ваша жизнь\..*Одно пространство\./ }).length,
    ).toBeGreaterThan(0);
    expect(window.localStorage.getItem('balanc_marketing_locale')).toBe('ru');
    fireEvent.click(screen.getAllByRole('button', { name: 'UZ' })[0]!);
    expect(
      screen.getAllByRole('heading', { name: /Hayotingiz\..*Bitta makon\./ }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Mahsulotlar/ }));
    expect(screen.getByRole('region', { name: 'Mahsulotlar' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Mahsulotlar' })).getByRole('button', {
        name: /Mebel do‘koni/,
      }),
    );
    expect(
      screen.getAllByRole('heading', { name: /Balancy Space for Furniture Stores/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Ombor/ })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: /Ish maydoniga kirish/ })
        .some((link) => link.getAttribute('href') === '/login'),
    ).toBe(true);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'MAKONINGIZNI TANLANG' })).getByRole('button', {
        name: /Shaxsiy/,
      }),
    );
    expect(
      screen
        .getAllByRole('link', { name: /Shaxsiy makonni ochish/ })
        .some((link) => link.getAttribute('href') === '/personal/dashboard'),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Menyuni ochish/ }));
    expect(screen.getByRole('navigation', { name: 'Mobil navigatsiya' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Menyuni yopish/ }));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Mahsulotlar' })).getByRole('button', {
        name: 'Biznes',
      }),
    );
    const businessMenu = screen.getByRole('region', { name: 'Biznes' });
    for (const label of [
      /Restoran/,
      /SMM agentligi/,
      /Go‘zallik saloni/,
      /Ta’lim markazi/,
      /Qurilish/,
      /Xizmat ko‘rsatish/,
    ]) {
      expect(within(businessMenu).getByRole('button', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(within(businessMenu).getByRole('button', { name: /Restoran/ }));
    expect(
      screen.getAllByRole('heading', { name: /Balancy Space for Restaurants/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('TEZ KUNDA').length).toBeGreaterThan(0);
  });
});
