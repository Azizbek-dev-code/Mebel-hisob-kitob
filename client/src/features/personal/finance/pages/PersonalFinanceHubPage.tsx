import { formatMoney } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { HubLinkList, type HubLinkItem } from '@/features/personal/components/HubLinkList';
import { usePersonalSummary } from '@/features/personal/ledger/hooks/use-personal-ledger';
import { ROUTES } from '@/routes/paths';

const FINANCE_LINKS: readonly HubLinkItem[] = [
  { to: ROUTES.personalHistory, labelKey: 'personal.history', hintKey: 'personal.historyHint' },
  { to: ROUTES.personalAccounts, labelKey: 'personal.wallets', hintKey: 'personal.walletsHint' },
  { to: ROUTES.personalBudgets, labelKey: 'personal.budgets', hintKey: 'personal.budgetsHint' },
  { to: ROUTES.personalGoals, labelKey: 'personal.goals', hintKey: 'personal.goalsHint' },
  { to: ROUTES.personalAnalytics, labelKey: 'personal.analytics', hintKey: 'personal.analyticsHint' },
];

const MORE_LINKS: readonly HubLinkItem[] = [
  { to: ROUTES.personalDebts, labelKey: 'personal.debts', hintKey: 'personal.debtsHint' },
];

export function PersonalFinanceHubPage() {
  const { t } = useTranslation();
  const summary = usePersonalSummary();

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="pf-page-title">{t('personal.financeTitle')}</h1>
        <p className="pf-page-hint">{t('personal.financeHint')}</p>
      </div>

      {summary.isPending && !summary.data ? (
        <Skeleton className="h-36 w-full rounded-2xl" />
      ) : summary.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <section className="space-y-3">
          <div className="pf-hero-balance">
            <p className="pf-hero-label">{t('personal.totalBalance')}</p>
            <p className="pf-hero-value">{formatMoney(summary.data?.totalBalanceSom ?? 0)}</p>
            <p className="mt-2 text-xs text-white/70">
              {t('personal.monthNet')}:{' '}
              <span className="font-semibold tabular-nums text-white">
                {formatMoney(summary.data?.monthNetSom ?? 0)}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={ROUTES.personalIncome}
              className="pf-card p-4 transition-colors hover:bg-surface-hover active:scale-[0.99]"
            >
              <p className="text-xs text-ink-muted">{t('personal.monthIncome')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums pf-amount-income">
                {formatMoney(summary.data?.monthIncomeSom ?? 0)}
              </p>
            </Link>
            <Link
              to={ROUTES.personalExpenses}
              className="pf-card p-4 transition-colors hover:bg-surface-hover active:scale-[0.99]"
            >
              <p className="text-xs text-ink-muted">{t('personal.monthExpense')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums pf-amount-expense">
                {formatMoney(summary.data?.monthExpenseSom ?? 0)}
              </p>
            </Link>
          </div>
        </section>
      )}

      <HubLinkList items={FINANCE_LINKS} />
      <HubLinkList items={MORE_LINKS} />

      <p className="text-xs text-ink-muted">
        {t('personal.financeXpHint')}{' '}
        <Link to={ROUTES.personalGrowthLevel} className="font-semibold text-brand-600 hover:underline">
          {t('personal.growth.level')}
        </Link>
      </p>
    </div>
  );
}
