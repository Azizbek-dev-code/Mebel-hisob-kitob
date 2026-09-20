import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { HABIT_ICON_CATEGORIES, habitIcon, type HabitIconCategoryId } from './habit-ui';

export function HabitIconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (icon: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<HabitIconCategoryId>('goals');
  const [query, setQuery] = useState('');
  const Selected = habitIcon(value);

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? HABIT_ICON_CATEGORIES.flatMap((group) => group.icons)
      : (HABIT_ICON_CATEGORIES.find((group) => group.id === category)?.icons ?? []);
    if (!q) return pool;
    return pool.filter((item) => item.id.includes(q));
  }, [category, query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-input border border-line bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
      >
        <span
          className="flex size-8 items-center justify-center rounded-full text-white"
          style={{ background: color || '#4f46e5' }}
        >
          <Selected className="size-4" />
        </span>
        <span className="text-ink">{t('personal.habitPickIcon')}</span>
      </button>
      {open ? (
        <div className="absolute z-40 mt-2 w-full rounded-2xl border border-line bg-surface p-3 shadow-card">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('personal.habitIconSearch')}
            className="mb-2 w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
            {HABIT_ICON_CATEGORIES.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setCategory(group.id);
                  setQuery('');
                }}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px]',
                  category === group.id && !query
                    ? 'bg-brand-50 font-medium text-brand-800'
                    : 'bg-surface-muted text-ink-muted',
                )}
              >
                {group.emoji} {t(`personal.habitIconCat.${group.id}`)}
              </button>
            ))}
          </div>
          <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
            {icons.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={id}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg border',
                  value === id ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-surface-hover',
                )}
              >
                <Icon className="size-4" style={{ color }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
