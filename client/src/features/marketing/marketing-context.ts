import { createContext, useContext } from 'react';

import type { MarketingLocale, MarketingText, ProductId } from './marketing-copy';

export type MarketingContextValue = {
  locale: MarketingLocale;
  setLocale: (locale: MarketingLocale) => void;
  copy: MarketingText;
  product: ProductId;
  setProduct: (product: ProductId) => void;
};

export const MarketingContext = createContext<MarketingContextValue | null>(null);

export function useMarketing() {
  const value = useContext(MarketingContext);
  if (!value) throw new Error('useMarketing must be used inside MarketingProvider');
  return value;
}
