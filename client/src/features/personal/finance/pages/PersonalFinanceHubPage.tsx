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
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.financeTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.financeHint')}</p>
      </div>

      {summary.isPending && !summary.data ? (
        <Skeleton className="h-24 w-full" />
      ) : summary.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-muted">{t('personal.totalBalance')}</p>
            <p
              className={
                (summary.data?.totalBalanceSom ?? 0) < 0
                  ? 'mt-1 text-lg font-semibold tabular-nums pf-amount-negative'
                  : 'mt-1 text-lg font-semibold tabular-nums text-ink'
              }
            >
              {formatMoney(summary.data?.totalBalanceSom ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-muted">{t('personal.monthNet')}</p>
            <p
              className={
                (summary.data?.monthNetSom ?? 0) < 0
                  ? 'mt-1 text-lg font-semibold tabular-nums pf-amount-negative'
                  : (summary.data?.monthNetSom ?? 0) > 0
                    ? 'mt-1 text-lg font-semibold tabular-nums pf-amount-income'
                    : 'mt-1 text-lg font-semibold tabular-nums text-ink'
              }
            >
              {formatMoney(summary.data?.monthNetSom ?? 0)}
            </p>
          </div>
          <Link
            to={ROUTES.personalIncome}
            className="rounded-2xl border border-line bg-surface p-4 hover:bg-surface-hover"
          >
            <p className="text-xs text-ink-muted">{t('personal.monthIncome')}</p>
            <p className="mt-1 text-base font-semibold tabular-nums pf-amount-income">
              {formatMoney(summary.data?.monthIncomeSom ?? 0)}
            </p>
          </Link>
          <Link
            to={ROUTES.personalExpenses}
            className="rounded-2xl border border-line bg-surface p-4 hover:bg-surface-hover"
          >
            <p className="text-xs text-ink-muted">{t('personal.monthExpense')}</p>
            <p className="mt-1 text-base font-semibold tabular-nums pf-amount-expense">
              {formatMoney(summary.data?.monthExpenseSom ?? 0)}
            </p>
          </Link>
        </section>
      )}

      <HubLinkList items={FINANCE_LINKS} />
      <HubLinkList items={MORE_LINKS} />

      <p className="text-xs text-ink-muted">
        {t('personal.financeXpHint')}{' '}
        <Link to={ROUTES.personalGrowthLevel} className="font-medium text-brand-700 hover:underline">
          {t('personal.growth.level')}
        </Link>
      </p>
    </div>
  );
}
