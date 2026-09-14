import {
  PersonalEntryType,
  formatMoney,
  formatMoneyCompact,
  periodDeltaPercent,
} from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

import { usePersonalAnalytics } from '../hooks/use-personal-analytics';

const MONTH_OPTIONS = [1, 3, 6, 12] as const;

export function PersonalAnalyticsPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useState<(typeof MONTH_OPTIONS)[number]>(1);
  const [categoryTab, setCategoryTab] = useState<typeof PersonalEntryType.EXPENSE | typeof PersonalEntryType.INCOME>(
    PersonalEntryType.EXPENSE,
  );
  const analytics = usePersonalAnalytics({ months });
  const data = analytics.data;
  const maxMonth = Math.max(
    1,
    ...(data?.monthly ?? []).flatMap((row) => [row.incomeSom, row.expenseSom]),
  );
  const categories = (data?.byCategory ?? []).filter((row) => row.type === categoryTab);
  const maxCategory = Math.max(1, ...categories.map((row) => row.amountSom));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.analytics')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.analyticsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MONTH_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMonths(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm',
              months === value
                ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-hover',
            )}
          >
            {value === 1 ? t('personal.period.THIS_MONTH') : t('personal.analyticsMonths', { count: value })}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">{t('personal.analyticsTotalsHint')}</p>

      {analytics.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : analytics.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void analytics.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label={t('personal.income')}
              value={formatMoney(data?.incomeSom ?? 0)}
              tone="income"
              delta={periodDeltaPercent(data?.incomeSom ?? 0, data?.previous.incomeSom ?? 0)}
            />
            <Kpi
              label={t('personal.expenses')}
              value={formatMoney(data?.expenseSom ?? 0)}
              tone="expense"
              invertDelta
              delta={periodDeltaPercent(data?.expenseSom ?? 0, data?.previous.expenseSom ?? 0)}
            />
            <Kpi
              label={t('personal.net')}
              value={formatMoney(data?.netSom ?? 0)}
              tone={(data?.netSom ?? 0) < 0 ? 'negative' : 'income'}
              delta={periodDeltaPercent(data?.netSom ?? 0, data?.previous.netSom ?? 0)}
            />
            <Kpi
              label={t('personal.savingsRate')}
              value={
                data?.savingsRatePercent == null
                  ? t('personal.savingsRateUnknown')
                  : `${data.savingsRatePercent}%`
              }
            />
          </div>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">{t('personal.monthlyTrend')}</h2>
            {(data?.monthly.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noAnalytics')}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data?.monthly.map((row) => (
                  <li key={row.yearMonth}>
                    <p className="mb-1 text-xs font-medium text-ink-muted">
                      {formatYearMonth(row.yearMonth, t)}
                    </p>
                    <Bar
                      label={t('personal.income')}
                      value={row.incomeSom}
                      max={maxMonth}
                      className="bg-success-600"
                    />
                    <Bar
                      label={t('personal.expenses')}
                      value={row.expenseSom}
                      max={maxMonth}
                      className="bg-danger-600"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{t('personal.byCategory')}</h2>
              <div className="flex gap-1">
                {([PersonalEntryType.EXPENSE, PersonalEntryType.INCOME] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCategoryTab(tab)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs',
                      categoryTab === tab
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-ink-muted hover:bg-surface-hover',
                    )}
                  >
                    {tab === PersonalEntryType.EXPENSE ? t('personal.tabExpense') : t('personal.tabIncome')}
                  </button>
                ))}
              </div>
            </div>
            {categories.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t('personal.noAnalytics')}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {categories.map((row) => (
                  <li key={row.categoryId}>
                    <Bar
                      label={row.name}
                      value={row.amountSom}
                      max={maxCategory}
                      className={row.type === PersonalEntryType.INCOME ? 'bg-success-600' : 'bg-danger-600'}
                    />
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

function formatYearMonth(yearMonth: string, t: (key: string) => string): string {
  const [year, month] = yearMonth.split('-');
  if (!year || !month) return yearMonth;
  return `${t(`personal.monthNames.${month}`)} ${year}`;
}

function Kpi({
  label,
  value,
  tone = 'neutral',
  delta,
  invertDelta = false,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'income' | 'expense' | 'negative';
  delta?: number | null;
  invertDelta?: boolean;
}) {
  const valueClass =
    tone === 'income'
      ? 'pf-amount-income'
      : tone === 'expense'
        ? 'pf-amount-expense'
        : tone === 'negative'
          ? 'pf-amount-negative'
          : 'text-ink';
  const deltaUp = (delta ?? 0) > 0;
  const deltaGood = invertDelta ? !deltaUp : deltaUp;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
      {delta == null || delta === 0 ? null : (
        <p className={`mt-1 text-xs ${deltaGood ? 'text-success-700' : 'text-danger-700'}`}>
          {delta > 0 ? '+' : ''}
          {delta}%
        </p>
      )}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  const width = `${Math.max(2, Math.round((Math.abs(value) / max) * 100))}%`;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[11px] text-ink-subtle">{label}</span>
      <div className="h-2 min-w-0 flex-1 rounded-full bg-surface-muted">
        <div className={`h-2 rounded-full ${className}`} style={{ width }} />
      </div>
      <span className="w-[4.5rem] shrink-0 text-right text-[11px] tabular-nums text-ink">
        {formatMoneyCompact(value)}
      </span>
    </div>
  );
}
