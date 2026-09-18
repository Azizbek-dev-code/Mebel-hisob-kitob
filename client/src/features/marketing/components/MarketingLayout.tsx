import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { Link, Outlet } from 'react-router-dom';

const NAV = [
  { to: ROUTES.marketingTodo, label: 'To-Do' },
  { to: ROUTES.marketingHabits, label: 'Odatlar' },
  { to: ROUTES.marketingPomodoro, label: 'Fokus' },
  { to: ROUTES.marketingFinance, label: 'Moliya' },
  { to: ROUTES.marketingGoals, label: 'Maqsadlar' },
  { to: ROUTES.marketingPricing, label: 'Tariflar' },
] as const;

export function MarketingLayout() {
  return (
    <div className="marketing-surface min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={ROUTES.home} className="font-display text-lg font-semibold tracking-tight text-ink">
            Balancy<span className="text-brand-600">.Space</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Asosiy">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-2.5 py-1.5 text-sm text-ink-soft transition hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to={ROUTES.login}
              className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:inline"
            >
              Kirish
            </Link>
            <Link
              to={ROUTES.onboarding}
              className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Boshlash
            </Link>
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-line/60 px-4 py-2 md:hidden"
          aria-label="Mobil bo‘limlar"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <Outlet />

      <footer className="mt-16 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-display text-base font-semibold">Balancy.Space</p>
            <p className="mt-2 text-sm text-ink-muted">Muvozanatli makon — hayotingizni bir joyda tartibga soling.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Mahsulot</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingFinance}>
                  Shaxsiy moliya
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingTodo}>
                  To-Do
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingHabits}>
                  Habit tracker
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingPomodoro}>
                  Pomodoro
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingGoals}>
                  Maqsadlar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Kompaniya</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingAbout}>
                  Haqida
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingFaq}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.marketingPricing}>
                  Tariflar
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" to={ROUTES.onboarding}>
                  Hisob yaratish
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className={cn('border-t border-line py-4 text-center text-xs text-ink-subtle')}>
          © {new Date().getFullYear()} Balancy.Space
        </p>
      </footer>
    </div>
  );
}
