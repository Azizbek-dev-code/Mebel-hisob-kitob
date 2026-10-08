import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MARKETING_COPY, type MarketingLocale, type ProductId } from './marketing-copy';
import { MarketingContext } from './marketing-context';

const STORAGE_KEY = 'balanc_marketing_locale';

function detectLocale(): MarketingLocale {
  if (typeof window === 'undefined') return 'uz';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'uz' || stored === 'ru' || stored === 'en') return stored;
  } catch {
    // Storage can be unavailable in private browsing; browser language still works.
  }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const code = language.toLowerCase().split('-')[0];
    if (code === 'uz' || code === 'ru' || code === 'en') return code;
  }
  return 'uz';
}

export function MarketingProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<MarketingLocale>(detectLocale);
  const [product, setProduct] = useState<ProductId>('overview');
  const copy = useMemo(() => MARKETING_COPY[locale], [locale]);
  const setLocale = useCallback((next: MarketingLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the selection for this session when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = originalLang;
    };
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, copy, product, setProduct }),
    [locale, setLocale, copy, product],
  );
  return <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>;
}
