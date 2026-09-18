import { Link } from 'react-router-dom';

import { usePageSeo } from '../hooks/use-page-seo';
import { MARKETING_SEO, SITE_URL } from '../seo';
import { ROUTES } from '@/routes/paths';

export function MarketingPricingPage() {
  usePageSeo({
    ...MARKETING_SEO.pricing,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: MARKETING_SEO.pricing.title,
      description: MARKETING_SEO.pricing.description,
      url: `${SITE_URL}/pricing`,
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Tariflar
      </h1>
      <p className="mt-4 text-ink-soft">
        Yangi hisoblar uchun 7 kunlik sinov mavjud. Sinovdan keyin shaxsiy moliya va o‘sish
        imkoniyatlari tarifingizga qarab ochiladi — aniq narx va cheklovlar hisob ichidagi Tariflar
        sahifasida ko‘rinadi.
      </p>
      <ul className="mt-8 space-y-4 text-ink-soft">
        <li className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Sinov</h2>
          <p className="mt-2 text-sm">
            Ro‘yxatdan o‘tgach asosiy funksiyalarni sinab ko‘ring. Hech qanday soxta chegirma yoki
            yashirin majburiyat va’da qilmaymiz.
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Pullik tariflar</h2>
          <p className="mt-2 text-sm">
            Kengaytirilgan limitlar va premium o‘sish vositalari — faol tarif orqali. Joriy
            katalogni hisobingizdagi billing sahifasidan ko‘ring.
          </p>
        </li>
      </ul>
      <Link
        to={ROUTES.onboarding}
        className="mt-10 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        7 kun bepul sinab ko‘ring
      </Link>
    </main>
  );
}

export function MarketingAboutPage() {
  usePageSeo({ ...MARKETING_SEO.about });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Balancy.Space haqida
      </h1>
      <p className="mt-4 text-ink-soft leading-relaxed">
        <strong className="font-semibold text-ink">Balancy</strong> — muvozanat;{' '}
        <strong className="font-semibold text-ink">Space</strong> — makon. Mahsulot g‘oyasi: hayotning
        muhim qismlarini (moliya, harakat, odat, fokus, maqsad) bir joyda, tushunarli va tinch
        interfeysda boshqarish.
      </p>
      <p className="mt-4 text-ink-soft leading-relaxed">
        Biz faqat bitta niche (faqat moliya yoki faqat to-do) sifatida o‘zimizni taqdim etmaymiz.
        Maqsad — real foydalanuvchi uchun foydali, tez va ishonchli personal productivity platforma.
      </p>
      <Link to={ROUTES.onboarding} className="mt-8 inline-block text-sm font-semibold text-brand-700">
        Hisob yaratish →
      </Link>
    </main>
  );
}

const FAQS = [
  {
    q: 'Balancy.Space nima?',
    a: 'Shaxsiy moliya, vazifalar, odatlar, fokus (Pomodoro), maqsadlar va o‘sish (XP/level) ni birlashtirgan web platforma. Brand ma’nosi — muvozanatli makon.',
  },
  {
    q: 'Faqat moliya uchunmi?',
    a: 'Yo‘q. Moliya muhim yo‘nalish, lekin to-do, habit tracker, fokus va maqsadlar ham asosiy qism.',
  },
  {
    q: 'To-Do va Pomodoro ishlatish mumkinmi?',
    a: 'Ha. Hisob ochilgach O‘sish bo‘limida vazifalar va fokus sessiyalari mavjud.',
  },
  {
    q: 'Do‘stlar bilan maqsad qo‘yish mumkinmi?',
    a: 'Ha, shaxsiy hisob ichida do‘stlar, challenge va ijtimoiy progress vositalari bor.',
  },
  {
    q: 'Level va XP qanday ishlaydi?',
    a: 'Vazifa, odat, fokus va moliyaviy intizom kabi harakatlar XP beradi. XP pul summasiga bog‘lanmagan.',
  },
  {
    q: 'Balancy.Space bepulmi?',
    a: 'Yangi hisoblar uchun sinov muddati bor. Keyingi imkoniyatlar tanlangan tarifga bog‘liq — batafsil Tariflar sahifasida.',
  },
  {
    q: 'Ma’lumotlar xavfsizmi?',
    a: 'Hisob autentifikatsiya bilan himoyalangan; shaxsiy moliya va vazifalar boshqa foydalanuvchilar bilan aralashmaydi. Maxfiy kalitlar brauzerga chiqarilmaydi.',
  },
] as const;

export function MarketingFaqPage() {
  usePageSeo({
    ...MARKETING_SEO.faq,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Tez-tez so‘raladigan savollar
      </h1>
      <div className="mt-10 space-y-6">
        {FAQS.map((item) => (
          <section key={item.q} className="border-b border-line pb-6">
            <h2 className="text-base font-semibold text-ink">{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</p>
          </section>
        ))}
      </div>
      <Link
        to={ROUTES.onboarding}
        className="mt-10 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white"
      >
        Boshlash
      </Link>
    </main>
  );
}

export function NotFoundPage() {
  usePageSeo(MARKETING_SEO.notFound);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Sahifa topilmadi</h1>
      <p className="mt-3 text-ink-soft">Havola eskirgan yoki noto‘g‘ri bo‘lishi mumkin.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={ROUTES.home} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
          Bosh sahifa
        </Link>
        <Link to={ROUTES.marketingPricing} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold">
          Tariflar
        </Link>
        <Link to={ROUTES.marketingFaq} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold">
          FAQ
        </Link>
      </div>
    </main>
  );
}
