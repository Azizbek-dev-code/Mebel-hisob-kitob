import { useTranslation } from 'react-i18next';

import { persistLocale, type AppLocale } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language === 'ru' ? 'ru' : 'uz') as AppLocale;

  function setLocale(locale: AppLocale) {
    void i18n.changeLanguage(locale);
    persistLocale(locale);
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="sr-only">{t('lang.switch')}</span>
      <select
        className="rounded-input border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-400"
        value={current}
        onChange={(event) => setLocale(event.target.value as AppLocale)}
        aria-label={t('lang.switch')}
        data-testid="language-switcher"
      >
        <option value="uz">{t('lang.uz')}</option>
        <option value="ru">{t('lang.ru')}</option>
      </select>
    </label>
  );
}
