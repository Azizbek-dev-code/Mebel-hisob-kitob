import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export type HubLinkItem = {
  to: string;
  labelKey: string;
  hintKey: string;
  /** When true, shows a subtle “soon” badge — module not built yet. */
  comingSoon?: boolean;
};

export function HubLinkList({ items }: { items: readonly HubLinkItem[] }) {
  const { t } = useTranslation();

  return (
    <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <li key={item.to} className="border-b border-line last:border-b-0">
          {item.comingSoon ? (
            <div className="flex items-center gap-3 px-4 py-3.5 opacity-80">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink">{t(item.labelKey)}</span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    {t('personal.comingSoon')}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hintKey)}</span>
              </span>
            </div>
          ) : (
            <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{t(item.labelKey)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hintKey)}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
