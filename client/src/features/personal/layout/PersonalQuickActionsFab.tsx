import {
  Flame,
  PiggyBank,
  Plus,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Dialog } from '@/components/ui/Dialog';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { AddMoneySheet } from '../ledger/components/AddMoneySheet';

const SUBSCRIPTION_REQUIRED = 'furniture-erp:subscription-required';

type MoneyTab = 'INCOME' | 'EXPENSE';

type QuickAction = {
  id: string;
  labelKey: string;
  icon: typeof Plus;
  tone?: 'income' | 'expense' | 'default';
  run: () => void;
};

/** Universal + FAB: only opens existing flows (money sheet or known routes). */
export function PersonalQuickActionsFab() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [moneyTab, setMoneyTab] = useState<MoneyTab | null>(null);
  const canWrite = Boolean(user?.subscription?.canWrite);

  if (pathname.startsWith(ROUTES.personalBilling) || pathname.startsWith(ROUTES.onboarding)) {
    return null;
  }

  function requireWrite(run: () => void) {
    if (!canWrite) {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED));
      return;
    }
    run();
  }

  function openMoney(tab: MoneyTab) {
    requireWrite(() => {
      setMenuOpen(false);
      setMoneyTab(tab);
      setMoneyOpen(true);
    });
  }

  function go(to: string) {
    requireWrite(() => {
      setMenuOpen(false);
      navigate(to);
    });
  }

  const actions: QuickAction[] = [
    {
      id: 'expense',
      labelKey: 'personal.tabExpense',
      icon: TrendingDown,
      tone: 'expense',
      run: () => openMoney('EXPENSE'),
    },
    {
      id: 'income',
      labelKey: 'personal.tabIncome',
      icon: TrendingUp,
      tone: 'income',
      run: () => openMoney('INCOME'),
    },
    {
      id: 'task',
      labelKey: 'personal.todoAdd',
      icon: Target,
      run: () => go(`${ROUTES.personalGrowthTodos}?compose=1`),
    },
    {
      id: 'habit',
      labelKey: 'personal.habitAdd',
      icon: Flame,
      run: () => go(`${ROUTES.personalGrowthHabits}?compose=1`),
    },
    {
      id: 'goal',
      labelKey: 'personal.goals',
      icon: PiggyBank,
      run: () => go(ROUTES.personalGoals),
    },
    {
      id: 'focus',
      labelKey: 'personal.focusStart',
      icon: Timer,
      run: () => go(ROUTES.personalGrowthFocus),
    },
  ];

  return (
    <>
      <div className="fixed z-50 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-8 md:bottom-8">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(
            'flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-raised',
            'transition-transform hover:bg-brand-600 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          )}
          aria-label={t('personal.addFab')}
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={menuOpen} title={t('personal.quickActionsTitle')} onClose={() => setMenuOpen(false)}>
        <ul className="grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={action.run}
                  className={cn(
                    'pf-sheet-choice flex w-full items-center gap-3',
                    action.tone === 'income' && 'pf-sheet-choice--income',
                    action.tone === 'expense' && 'pf-sheet-choice--expense',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl bg-surface-muted text-ink-soft',
                      action.tone === 'income' && 'bg-success-50 text-success-600',
                      action.tone === 'expense' && 'bg-danger-50 text-danger-600',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-left">{t(action.labelKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="pf-btn-ghost mt-3 w-full"
          onClick={() => setMenuOpen(false)}
        >
          <X className="size-4" aria-hidden="true" />
          {t('common.close')}
        </button>
      </Dialog>

      {canWrite ? (
        <AddMoneySheet
          open={moneyOpen}
          initialTab={moneyTab}
          onClose={() => {
            setMoneyOpen(false);
            setMoneyTab(null);
          }}
        />
      ) : null}
    </>
  );
}
