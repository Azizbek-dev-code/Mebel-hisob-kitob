import {
  Flame,
  PiggyBank,
  Search,
  Target,
  Timer,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

type SearchItem = {
  id: string;
  labelKey: string;
  groupKey: string;
  to: string;
  icon: typeof Search;
  keywords: string[];
};

const ITEMS: readonly SearchItem[] = [
  {
    id: 'home',
    labelKey: 'personal.home',
    groupKey: 'personal.searchGroup.growth',
    to: ROUTES.personalDashboard,
    icon: Target,
    keywords: ['bugun', 'home', 'today', 'dashboard'],
  },
  {
    id: 'plan',
    labelKey: 'personal.navPlan',
    groupKey: 'personal.searchGroup.tasks',
    to: ROUTES.personalPlan,
    icon: Target,
    keywords: ['reja', 'plan', 'calendar'],
  },
  {
    id: 'todos',
    labelKey: 'personal.todoTitle',
    groupKey: 'personal.searchGroup.tasks',
    to: ROUTES.personalGrowthTodos,
    icon: Target,
    keywords: ['vazifa', 'task', 'todo'],
  },
  {
    id: 'habits',
    labelKey: 'personal.habitTitle',
    groupKey: 'personal.searchGroup.habits',
    to: ROUTES.personalGrowthHabits,
    icon: Flame,
    keywords: ['odat', 'habit', 'streak'],
  },
  {
    id: 'focus',
    labelKey: 'personal.focusTitle',
    groupKey: 'personal.searchGroup.growth',
    to: ROUTES.personalGrowthFocus,
    icon: Timer,
    keywords: ['fokus', 'focus', 'pomodoro'],
  },
  {
    id: 'goals',
    labelKey: 'personal.goals',
    groupKey: 'personal.searchGroup.goals',
    to: ROUTES.personalGoals,
    icon: PiggyBank,
    keywords: ['maqsad', 'goal', 'saving'],
  },
  {
    id: 'finance',
    labelKey: 'personal.navFinance',
    groupKey: 'personal.searchGroup.finance',
    to: ROUTES.personalFinance,
    icon: Wallet,
    keywords: ['moliya', 'finance', 'pul'],
  },
  {
    id: 'income',
    labelKey: 'personal.income',
    groupKey: 'personal.searchGroup.finance',
    to: ROUTES.personalIncome,
    icon: Wallet,
    keywords: ['kirim', 'income'],
  },
  {
    id: 'expense',
    labelKey: 'personal.expenses',
    groupKey: 'personal.searchGroup.finance',
    to: ROUTES.personalExpenses,
    icon: Wallet,
    keywords: ['xarajat', 'expense', 'chiqim'],
  },
  {
    id: 'level',
    labelKey: 'personal.levelTitle',
    groupKey: 'personal.searchGroup.growth',
    to: ROUTES.personalGrowthLevel,
    icon: Flame,
    keywords: ['level', 'xp', 'daraja'],
  },
];

export function PersonalCommandSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter((item) => {
      const label = t(item.labelKey).toLowerCase();
      return label.includes(q) || item.keywords.some((kw) => kw.includes(q) || q.includes(kw));
    });
  }, [query, t]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of filtered) {
      const list = map.get(item.groupKey) ?? [];
      list.push(item);
      map.set(item.groupKey, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <Dialog open={open} title={t('personal.searchTitle')} onClose={onClose}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('personal.searchPlaceholder')}
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          aria-label={t('personal.searchTitle')}
        />
      </label>

      <div className="mt-4 max-h-[50vh] space-y-4 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-ink-muted">{t('personal.searchEmpty')}</p>
        ) : (
          groups.map(([groupKey, items]) => (
            <section key={groupKey}>
              <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {t(groupKey)}
              </h3>
              <ul className="mt-1.5 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                          'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        )}
                        onClick={() => {
                          navigate(item.to);
                          onClose();
                        }}
                      >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="font-medium text-ink">{t(item.labelKey)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </Dialog>
  );
}

export function usePersonalCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      onOpen();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
