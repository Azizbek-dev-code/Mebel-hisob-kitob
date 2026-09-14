import { PersonalEntryType, formatMoney, type PersonalActivityItem } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

import { WalletKindIcon } from '../../ledger/components/WalletKindIcon';
import { usePersonalSummary } from '../../ledger/hooks/use-personal-ledger';
import { usePersonalNotifications, usePersonalRecurring } from '../../lifecycle/hooks/use-personal-lifecycle';
import { usePersonalBudgets, usePersonalSavingGoals } from '../../planning/hooks/use-personal-planning';
import { BudgetWarningText } from '../../planning/components/BudgetWarningText';
import { GoalEtaText } from '../../planning/components/GoalEtaText';
import { ProgressBar } from '../../planning/components/ProgressBar';

export function PersonalDashboardPage() {
  const { t } = useTranslation();
  const summary = usePersonalSummary();
  const budgets = usePersonalBudgets();
  const goals = usePersonalSavingGoals();
  const recurring = usePersonalRecurring();
  const notifications = usePersonalNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.dashboardTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.dashboardHint')}</p>
      </div>

      {summary.isPending && !summary.data ? (
        <Skeleton className="h-28 w-full" />
      ) : summary.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              className="col-span-2 sm:col-span-1"
              label={t('personal.totalBalance')}
              value={formatMoney(summary.data?.totalBalanceSom ?? 0)}
              tone={(summary.data?.totalBalanceSom ?? 0) < 0 ? 'negative' : 'neutral'}
            />
            <Kpi
              label={t('personal.monthIncome')}
              value={formatMoney(summary.data?.monthIncomeSom ?? 0)}
              tone="income"
            />
            <Kpi
              label={t('personal.monthExpense')}
              value={formatMoney(summary.data?.monthExpenseSom ?? 0)}
              tone="expense"
            />
            <Kpi
              className="col-span-2 sm:col-span-1"
              label={t('personal.monthNet')}
              value={formatMoney(summary.data?.monthNetSom ?? 0)}
              tone={
                (summary.data?.monthNetSom ?? 0) < 0
                  ? 'negative'
                  : (summary.data?.monthNetSom ?? 0) > 0
                    ? 'income'
                    : 'neutral'
              }
            />
          </div>
          {(summary.data?.monthIncomeSom ?? 0) > 0 || (summary.data?.monthExpenseSom ?? 0) > 0 ? (
            <p className="text-sm text-ink-muted">
              {(summary.data?.monthNetSom ?? 0) < 0
                ? t('personal.insightOverspend')
                : t('personal.insightPositive')}
              {(summary.data?.monthIncomeSom ?? 0) > 0
                ? ` ${t('personal.savingsRate')}: ${Math.round(
                    ((summary.data?.monthNetSom ?? 0) / (summary.data?.monthIncomeSom ?? 1)) * 100,
                  )}%`
                : ''}
            </p>
          ) : null}

          <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('personal.wallets')}</h2>
              <Link to={ROUTES.personalAccounts} className="text-sm text-brand-700 hover:underline">
                {t('common.edit')}
              </Link>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{t('personal.walletsHint')}</p>
            <ul className="mt-3 space-y-2">
              {(summary.data?.wallets ?? []).filter((wallet) => !wallet.isArchived).map((wallet) => (
                <li key={wallet.id} className="flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    <WalletKindIcon kind={wallet.kind} className="size-4 shrink-0 text-brand-700" />
                    <span className="truncate">{wallet.name}</span>
                  </span>
                  <span
                    className={
                      wallet.balanceSom < 0
                        ? 'font-medium tabular-nums pf-amount-negative'
                        : 'font-medium tabular-nums text-ink'
                    }
                  >
                    {formatMoney(wallet.balanceSom)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('personal.recent')}</h2>
              <Link to={ROUTES.personalHistory} className="text-sm text-brand-700 hover:underline">
                {t('personal.history')}
              </Link>
            </div>
            {(summary.data?.recentActivity.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noEntries')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {summary.data?.recentActivity.map((item) => (
                  <ActivityRow key={`${item.kind}-${item.kind === 'ENTRY' ? item.entry.id : item.transfer.id}`} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('personal.budgets')}</h2>
              <Link to={ROUTES.personalBudgets} className="text-sm text-brand-700 hover:underline">
                {t('common.edit')}
              </Link>
            </div>
            {(budgets.data?.items ?? []).filter((item) => item.isActive).length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noBudgets')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(budgets.data?.items ?? [])
                  .filter((item) => item.isActive)
                  .slice(0, 4)
                  .map((budget) => (
                    <li key={budget.id} className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="truncate text-ink">{budget.name}</span>
                        <span className="text-ink-muted">
                          {formatMoney(budget.spentSom)} / {formatMoney(budget.limitSom)}
                        </span>
                      </div>
                      <ProgressBar percent={budget.percent} warningLevel={budget.warningLevel} />
                      <BudgetWarningText budget={budget} />
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('personal.goals')}</h2>
              <Link to={ROUTES.personalGoals} className="text-sm text-brand-700 hover:underline">
                {t('common.edit')}
              </Link>
            </div>
            {(goals.data?.items.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noGoals')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {goals.data?.items.slice(0, 4).map((goal) => (
                  <li key={goal.id} className="space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="truncate text-ink">{goal.name}</span>
                      <span className="text-ink-muted">
                        {formatMoney(goal.savedSom)} / {formatMoney(goal.targetSom)}
                      </span>
                    </div>
                    <ProgressBar percent={goal.percent} over={false} />
                    <GoalEtaText goal={goal} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(notifications.data?.items.length ?? 0) > 0 ? (
            <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">{t('personal.notifications')}</h2>
                <Link to={ROUTES.personalNotifications} className="text-sm text-brand-700 hover:underline">
                  {t('common.edit')}
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {notifications.data?.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="text-sm text-ink">
                    <Link to={item.href} className="hover:underline">
                      {t(`personal.notifyKind.${item.kind}`, { name: item.title })}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('personal.upcomingPayments')}</h2>
              <Link to={ROUTES.personalRecurring} className="text-sm text-brand-700 hover:underline">
                {t('common.edit')}
              </Link>
            </div>
            {(recurring.data?.upcoming.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noUpcoming')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recurring.data?.upcoming.slice(0, 4).map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {rule.name} · {formatDate(rule.nextDueAt)}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">{formatMoney(rule.amountSom)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'income' | 'expense' | 'negative';
  className?: string;
}) {
  const valueClass =
    tone === 'income'
      ? 'pf-amount-income'
      : tone === 'expense'
        ? 'pf-amount-expense'
        : tone === 'negative'
          ? 'pf-amount-negative'
          : 'text-ink';
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4', className)}>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

export function ActivityRow({ item }: { item: PersonalActivityItem }) {
  const { t } = useTranslation();
  if (item.kind === 'TRANSFER') {
    return (
      <li className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink">
          {t('personal.transfer')} · {item.transfer.fromWallet.name} → {item.transfer.toWallet.name} ·{' '}
          {formatDate(item.occurredAt)}
        </span>
        <span className="shrink-0 tabular-nums text-ink">{formatMoney(item.transfer.amount)}</span>
      </li>
    );
  }
  const income = item.entry.type === PersonalEntryType.INCOME;
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-ink">
        {item.entry.category.name} · {formatDate(item.occurredAt)}
      </span>
      <span className={income ? 'shrink-0 tabular-nums pf-amount-income' : 'shrink-0 tabular-nums pf-amount-expense'}>
        {income ? '+' : '−'}
        {formatMoney(item.entry.amount)}
      </span>
    </li>
  );
}
