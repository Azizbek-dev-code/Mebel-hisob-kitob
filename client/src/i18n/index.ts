import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru.json';
import uz from './locales/uz.json';

export const SUPPORTED_LOCALES = ['uz', 'ru'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'furniture_erp_locale';

export function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'uz';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'ru' || raw === 'uz') return raw;
  return 'uz';
}

export function persistLocale(locale: AppLocale): void {
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: readStoredLocale(),
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

export default i18n;
