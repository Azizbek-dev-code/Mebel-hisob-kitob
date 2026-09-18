import { Link } from 'react-router-dom';

import { usePageSeo } from '../hooks/use-page-seo';
import { SITE_URL, type PageSeo } from '../seo';
import { ROUTES } from '@/routes/paths';

export type FeatureLandingProps = {
  seo: PageSeo;
  h1: string;
  lead: string;
  bullets: string[];
  related: Array<{ to: string; label: string }>;
};

export function FeatureLandingPage({ seo, h1, lead, bullets, related }: FeatureLandingProps) {
  usePageSeo({
    ...seo,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seo.title,
      description: seo.description,
      url: `${SITE_URL}${seo.path}`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium text-brand-700">
        <Link to={ROUTES.home} className="hover:underline">
          Balancy.Space
        </Link>
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {h1}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">{lead}</p>
      <ul className="mt-8 space-y-3 text-ink-soft">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to={ROUTES.onboarding}
          className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Boshlash
        </Link>
        <Link
          to={ROUTES.marketingPricing}
          className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink"
        >
          Tariflar
        </Link>
      </div>
      <nav className="mt-14 border-t border-line pt-8" aria-label="Bog‘liq sahifalar">
        <p className="text-sm font-semibold text-ink">Yana ko‘ring</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {related.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="inline-block rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-brand-200 hover:text-brand-800"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
