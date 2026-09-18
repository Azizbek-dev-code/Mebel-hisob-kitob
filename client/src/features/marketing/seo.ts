/** Public site origin for canonical / OG / sitemap alignment. */
export const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL ?? 'https://balancy.space').replace(
  /\/$/,
  '',
);

export const BRAND_NAME = 'Balancy.Space';

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  /** Default index,follow for marketing; private layouts pass noindex. */
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const MARKETING_SEO = {
  home: {
    title: 'Balancy.Space — Hayotingizni bir joyda tartibga soling',
    description:
      'Muvozanatli makon: shaxsiy moliya, to-do, odatlar, Pomodoro fokus, maqsadlar va do‘stlar bilan progress — bitta platformada.',
    path: '/',
  },
  todo: {
    title: 'To-Do va kundalik vazifalar | Balancy.Space',
    description:
      'Vazifalarni yozing, ustuvorlik qo‘ying va kundalik progressni kuzating. Balancy.Space to-do — hayot rejangizning bir qismi.',
    path: '/to-do',
  },
  habits: {
    title: 'Habit Tracker — foydali odatlar | Balancy.Space',
    description:
      'Kundalik odatlarni kuzating, streak saqlang va barqaror progress qiling. Habit tracker Balancy.Space ichida.',
    path: '/habit-tracker',
  },
  pomodoro: {
    title: 'Pomodoro fokus taymeri | Balancy.Space',
    description:
      'Fokus sessiyalari, pauza va chuqur ish. Pomodoro taymeri vazifalar va maqsadlaringiz bilan birga ishlaydi.',
    path: '/pomodoro',
  },
  finance: {
    title: 'Shaxsiy moliya ilovasi | Balancy.Space',
    description:
      'Daromad, xarajat, budjet va jamg‘arma maqsadlari. Shaxsiy moliyangizni Bir joyda nazorat qiling.',
    path: '/personal-finance',
  },
  goals: {
    title: 'Maqsad tracker | Balancy.Space',
    description:
      'Maqsad qo‘ying, progressni kuzating va do‘stlaringiz bilan hisobdorlik yarating. Goal tracker Balancy.Space’da.',
    path: '/goal-tracker',
  },
  pricing: {
    title: 'Tariflar | Balancy.Space',
    description:
      '7 kunlik sinov bilan boshlang. Shaxsiy moliya va o‘sish vositalari — tarifingizga mos imkoniyatlar.',
    path: '/pricing',
  },
  about: {
    title: 'Balancy.Space haqida — Muvozanatli makon',
    description:
      'Balancy.Space nima? Hayotning moliya, harakat, odat, fokus va maqsad yo‘nalishlarini birlashtirgan personal platforma.',
    path: '/about',
  },
  faq: {
    title: 'Tez-tez so‘raladigan savollar | Balancy.Space',
    description:
      'Balancy.Space qanday ishlaydi, nimalar bepul, ma’lumotlar xavfsizligi va asosiy funksiyalar haqida javoblar.',
    path: '/faq',
  },
  login: {
    title: 'Kirish | Balancy.Space',
    description: 'Balancy.Space hisobingizga kiring — shaxsiy moliya va o‘sish paneliga o‘ting.',
    path: '/login',
    robots: 'noindex, follow',
  },
  notFound: {
    title: 'Sahifa topilmadi | Balancy.Space',
    description: 'Bu sahifa mavjud emas. Bosh sahifa yoki asosiy imkoniyatlarga qayting.',
    path: '/404',
    robots: 'noindex, follow',
  },
} as const satisfies Record<string, PageSeo>;
