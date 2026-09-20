import { GrowthHabitProgressPeriod, MIN_WEEKDAY_SAMPLE } from '@furniture-erp/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { HabitHeatmap, HabitKpiGrid, HabitTrendBars } from '../components/HabitCharts';
import { formatPct } from '../components/habit-ui';
import { useGrowthHabitsProgress } from '../hooks/use-growth-habits';

const PERIODS: GrowthHabitProgressPeriod[] = [
  GrowthHabitProgressPeriod.WEEK,
  GrowthHabitProgressPeriod.MONTH,
  GrowthHabitProgressPeriod.QUARTER,
  GrowthHabitProgressPeriod.HALF,
  GrowthHabitProgressPeriod.YEAR,
];

export function PersonalGrowthHabitsProgressPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<GrowthHabitProgressPeriod>(GrowthHabitProgressPeriod.MONTH);
  const query = useMemo(() => ({ period, includeArchived: true }), [period]);
  const progress = useGrowthHabitsProgress(query);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <PageHeader title={t('personal.habitProgressTitle')} backTo={ROUTES.personalGrowthHabits} backLabel={t('personal.habitTitle')} />
      <h1 className="-mt-3 text-lg font-semibold tracking-tight text-ink">{t('personal.habitProgressTitle')}</h1>
      <p className="text-sm text-ink-muted">{t('personal.habitProgressHint')}</p>

      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium',
              period === value ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted',
            )}
            onClick={() => setPeriod(value)}
          >
            {t(`personal.habitPeriod.${value}`)}
          </button>
        ))}
      </div>

      {progress.isPending && !progress.data ? (
        <Skeleton className="h-48 w-full" />
      ) : progress.isError ? (
        <ErrorState
          title={t('personal.habitLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void progress.refetch()}
        />
      ) : !progress.data || progress.data.habits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.habitEmpty')}
        </p>
      ) : (
        <>
          <HabitKpiGrid kpi={progress.data.overall} />
          <section className="rounded-2xl border border-line bg-surface p-4">
            <HabitHeatmap cells={progress.data.calendar} />
          </section>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <HabitTrendBars points={progress.data.trend} />
          </section>

          <AnalyticsBlock data={progress.data.analytics} />

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">{t('personal.habitPerHabit')}</h2>
            {progress.data.habits.map((row) => (
              <Link
                key={row.habitId}
                to={ROUTES.personalGrowthHabitDetail(row.habitId)}
                className="block rounded-2xl border border-line bg-surface px-3 py-3 hover:bg-surface-hover"
              >
                <p className="text-sm font-medium text-ink">{row.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatPct(row.kpi.completion)} · {t('personal.habitKpiStreak')} {row.kpi.currentStreak} ·{' '}
                  {t('personal.habitKpiConsistency')} {formatPct(row.kpi.consistency)} · {t('personal.habitKpiTotal')}{' '}
                  {row.kpi.totalValue}
                </p>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function AnalyticsBlock({
  data,
}: {
  data: NonNullable<ReturnType<typeof useGrowthHabitsProgress>['data']>['analytics'];
}) {
  const { t } = useTranslation();
  const mom = data.monthOverMonth;
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{t('personal.habitAnalytics')}</h2>
      {mom.currentScheduled >= MIN_WEEKDAY_SAMPLE && mom.previousScheduled >= MIN_WEEKDAY_SAMPLE ? (
        <p className="text-sm text-ink">
          {t('personal.habitMom', {
            current: formatPct(mom.currentCompletion),
            previous: formatPct(mom.previousCompletion),
            delta: `${mom.delta >= 0 ? '+' : ''}${formatPct(mom.delta)}`,
          })}
        </p>
      ) : null}
      {data.insights.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.habitNoInsights')}</p>
      ) : (
        <ul className="space-y-1 text-sm text-ink">
          {data.insights.map((insight, index) => (
            <li key={`${insight.code}-${index}`}>{t(`personal.habitInsight.${insight.code}`)}</li>
          ))}
        </ul>
      )}
      {data.mostBroken ? (
        <p className="text-sm text-ink">
          {t('personal.habitMostBroken', {
            title: data.mostBroken.title,
            rate: formatPct(data.mostBroken.failRate),
          })}
        </p>
      ) : null}
      {data.bestWeekday ? (
        <p className="text-sm text-ink">
          {t('personal.habitBestWeekday', {
            day: t(`personal.habitWeekday.${data.bestWeekday.weekday}`),
            rate: formatPct(data.bestWeekday.completion),
          })}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">{t('personal.habitNoWeekday')}</p>
      )}
      {data.bestTime ? (
        <p className="text-sm text-ink">
          {t('personal.habitBestTime', {
            bucket: t(`personal.habitTimeOfDay.${data.bestTime.bucket}`),
          })}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">{t('personal.habitNoTime')}</p>
      )}
      {data.correlations.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-ink">{t('personal.habitCorrelation')}</p>
          <p className="text-xs text-ink-muted">{t('personal.habitCorrelationHint')}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {data.correlations.slice(0, 4).map((row) => (
              <li key={`${row.habitIdA}-${row.habitIdB}`}>
                {row.titleA} + {row.titleB}: {formatPct(row.rate)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.recommendations.length > 0 ? (
        <ul className="space-y-1 text-sm text-ink">
          {data.recommendations.map((row, index) => (
            <li key={`${row.code}-${index}`}>{t(`personal.habitReco.${row.code}`)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
