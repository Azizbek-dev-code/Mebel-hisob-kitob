import { CATEGORY_ICON_COLOR_SWATCHES, LUCIDE_CATEGORY_ICON_NAMES } from '@furniture-erp/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';

import { LUCIDE_CATEGORY_ICON_MAP } from './lucide-category-icons';

export function CategoryIconPicker({
  iconName,
  iconColor,
  onChange,
}: {
  iconName: string | null;
  iconColor: string | null;
  onChange: (next: { iconName: string | null; iconColor: string | null }) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const Selected = iconName ? LUCIDE_CATEGORY_ICON_MAP[iconName] : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LUCIDE_CATEGORY_ICON_NAMES;
    return LUCIDE_CATEGORY_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-ink">{t('personal.categoryIcon')}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-input border border-line bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
      >
        {Selected ? (
          <Selected className="size-5" style={{ color: iconColor ?? '#0F766E' }} aria-hidden="true" />
        ) : (
          <span className="text-base" aria-hidden="true">
            🏷️
          </span>
        )}
        <span className="text-ink-muted">{t('personal.pickIcon')}</span>
      </button>
      <div className="flex flex-wrap gap-1.5" role="listbox" aria-label={t('personal.categoryColor')}>
        {CATEGORY_ICON_COLOR_SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-pressed={iconColor === hex}
            onClick={() => onChange({ iconName, iconColor: hex })}
            className={cn(
              'size-7 rounded-full border',
              iconColor === hex ? 'ring-2 ring-brand-500 ring-offset-2' : 'border-line',
            )}
            style={{ backgroundColor: hex }}
            aria-label={hex}
          />
        ))}
      </div>
      {open ? (
        <Dialog open onClose={() => setOpen(false)} title={t('personal.pickIcon')} className="sm:max-w-lg">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('personal.historySearch')}
            className="mb-3 w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="grid max-h-72 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
            {filtered.map((name) => {
              const Icon = LUCIDE_CATEGORY_ICON_MAP[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange({ iconName: name, iconColor: iconColor ?? '#0F766E' });
                    setOpen(false);
                  }}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg border',
                    iconName === name ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-surface-hover',
                  )}
                  aria-label={name}
                >
                  <Icon className="size-5" style={{ color: iconColor ?? '#0F766E' }} />
                </button>
              );
            })}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
