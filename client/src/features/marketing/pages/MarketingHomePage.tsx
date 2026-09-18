import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Flame,
  Focus,
  Goal,
  Sparkles,
  Users,
  Wallet,
  Trophy,
} from 'lucide-react';

import { usePageSeo } from '../hooks/use-page-seo';
import { MARKETING_SEO, SITE_URL } from '../seo';
import { ROUTES } from '@/routes/paths';

const PILLARS = [
  {
    to: ROUTES.marketingFinance,
    icon: Wallet,
    title: 'Moliya',
    text: 'Daromad, xarajat, budjet va jamg‘arma maqsadlari — shaxsiy nazorat.',
  },
  {
    to: ROUTES.marketingTodo,
    icon: CheckSquare,
    title: 'Harakat',
    text: 'To-do, kundalik vazifalar va reja — nima qilish kerakligi aniq.',
  },
  {
    to: ROUTES.marketingHabits,
    icon: Flame,
    title: 'Odatlar',
    text: 'Foydali odatlarni kuzating, streak saqlang, barqaror o‘sing.',
  },
  {
    to: ROUTES.marketingPomodoro,
    icon: Focus,
    title: 'Fokus',
    text: 'Pomodoro sessiyalari bilan vaqtni chuqurroq ishga yo‘naltiring.',
  },
  {
    to: ROUTES.marketingGoals,
    icon: Goal,
    title: 'Maqsadlar',
    text: 'Maqsad qo‘ying, progressni ko‘ring, yakuniga yetkazing.',
  },
  {
    to: ROUTES.personalGrowthFriends,
    icon: Users,
    title: 'Do‘stlar',
    text: 'Birga maqsad qo‘ying — sog‘lom raqobat va hisobdorlik (hisob ichida).',
    gated: true,
  },
] as const;

export function MarketingHomePage() {
  usePageSeo({
    ...MARKETING_SEO.home,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: MARKETING_SEO.home.title,
      description: MARKETING_SEO.home.description,
      url: `${SITE_URL}/`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  });

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-brand-700">Balancy.Space · Muvozanatli makon</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Hayotingizni bir joyda tartibga soling
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Moliya, vazifalar, odatlar, fokus va maqsadlar — alohida ilovalar o‘rniga bitta muvozanatli
          makon. Progressingizni kuzating, do‘stlaringiz bilan birga o‘sing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={ROUTES.onboarding}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            7 kun bepul sinab ko‘ring
          </Link>
          <Link
            to={ROUTES.marketingFaq}
            className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-hover"
          >
            Qanday ishlaydi?
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="what-heading">
        <h2 id="what-heading" className="font-display text-2xl font-semibold text-ink">
          Balancy.Space nima?
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Bu faqat moliya yoki faqat to-do emas. Balancy.Space — shaxsiy hayotni moliya, harakat,
          odat, fokus, maqsad va (hisob ichida) do‘stlar bilan progress orqali birlashtiradigan
          platforma.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" className="font-display text-2xl font-semibold text-ink">
          Asosiy yo‘nalishlar
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((item) => (
            <li key={item.title}>
              {'gated' in item && item.gated ? (
                <div className="h-full rounded-2xl border border-line bg-surface p-5">
                  <item.icon className="size-5 text-brand-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{item.text}</p>
                </div>
              ) : (
                <Link
                  to={item.to}
                  className="block h-full rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-200 hover:shadow-sm"
                >
                  <item.icon className="size-5 text-brand-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{item.text}</p>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="level-heading">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-10">
          <Trophy className="size-6 text-brand-600" aria-hidden />
          <h2 id="level-heading" className="mt-4 font-display text-2xl font-semibold text-ink">
            Level va XP
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Vazifa, odat, fokus va moliyaviy intizom — XP orqali o‘sish. Gamification summaga
            bog‘lanmagan: muhimi izchillik.
          </p>
          <Link
            to={ROUTES.onboarding}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <Sparkles className="size-4" aria-hidden />
            Hisob yaratish
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="cta-heading">
        <h2 id="cta-heading" className="font-display text-2xl font-semibold text-ink">
          Bugun boshlang
        </h2>
        <p className="mt-3 text-ink-soft">
          Ro‘yxatdan o‘ting, qisqa onboardingdan o‘ting va shaxsiy makoningizni oching.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={ROUTES.onboarding}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Balancy.Space’ni boshlash
          </Link>
          <Link
            to={ROUTES.marketingPricing}
            className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink"
          >
            Tariflar
          </Link>
        </div>
      </section>
    </main>
  );
}
