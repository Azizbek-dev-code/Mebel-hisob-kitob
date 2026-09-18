import { formatMoney, type GrowthPeriodMetricsDto } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useGrowthMonthlyReport,
  useGrowthWeeklyReview,
  useSaveGrowthMonthlyReport,
  useSaveGrowthWeeklyReview,
} from '../hooks/use-growth-reviews';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

type Tab = 'weekly' | 'monthly';

export function PersonalGrowthReviewsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('weekly');

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.reviewsTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.reviewsHint')}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-input px-3 py-2 text-sm font-medium',
            tab === 'weekly' ? 'bg-brand-600 text-white' : 'border border-line text-ink',
          )}
          onClick={() => setTab('weekly')}
        >
          {t('personal.reviewsWeeklyTab')}
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-input px-3 py-2 text-sm font-medium',
            tab === 'monthly' ? 'bg-brand-600 text-white' : 'border border-line text-ink',
          )}
          onClick={() => setTab('monthly')}
        >
          {t('personal.reviewsMonthlyTab')}
        </button>
      </div>

      {tab === 'weekly' ? <WeeklyPanel /> : <MonthlyPanel />}
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: GrowthPeriodMetricsDto }) {
  const { t } = useTranslation();
  const cells = [
    { label: t('personal.reviewMetric.study'), value: `${metrics.studyMinutes} min` },
    { label: t('personal.reviewMetric.focus'), value: `${metrics.focusMinutes} min` },
    { label: t('personal.reviewMetric.tasks'), value: String(metrics.tasksCompleted) },
    { label: t('personal.reviewMetric.habits'), value: String(metrics.habitCheckIns) },
    { label: t('personal.reviewMetric.dailyGoals'), value: String(metrics.dailyGoalsDone) },
    { label: t('personal.reviewMetric.xp'), value: `+${metrics.xpEarned}` },
    {
      label: t('personal.reviewMetric.streak'),
      value: `${metrics.currentStreak} / ${metrics.bestStreak}`,
    },
    {
      label: t('personal.reviewMetric.level'),
      value:
        metrics.levelStart === metrics.levelEnd
          ? String(metrics.levelEnd)
          : `${metrics.levelStart} → ${metrics.levelEnd}`,
    },
    {
      label: t('personal.reviewMetric.financeNet'),
      value: formatMoney(metrics.finance.netSom),
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cells.map((cell) => (
        <li key={cell.label} className="rounded-2xl border border-line bg-surface p-3">
          <p className="text-xs text-ink-muted">{cell.label}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{cell.value}</p>
        </li>
      ))}
    </ul>
  );
}

function WeeklyPanel() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const review = useGrowthWeeklyReview();
  const save = useSaveGrowthWeeklyReview();
  const [wentWell, setWentWell] = useState('');
  const [wasHard, setWasHard] = useState('');
  const [nextWeekChange, setNextWeekChange] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!review.data) return;
    setWentWell(review.data.reflection.wentWell ?? '');
    setWasHard(review.data.reflection.wasHard ?? '');
    setNextWeekChange(review.data.reflection.nextWeekChange ?? '');
  }, [review.data]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        weekStartDayKey: review.data?.weekStartDayKey,
        wentWell,
        wasHard,
        nextWeekChange,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.reviewsSaveFailed'));
    }
  }

  if (review.isPending && !review.data) return <Skeleton className="h-48 w-full" />;
  if (review.isError || !review.data) {
    return (
      <ErrorState
        title={t('personal.reviewsLoadFailed')}
        message={t('common.retry')}
        onRetry={() => void review.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {review.data.weekStartDayKey} — {review.data.weekEndDayKey}
      </p>
      <MetricsGrid metrics={review.data.metrics} />
      <form className="space-y-3 rounded-2xl border border-line bg-surface p-3" onSubmit={(e) => void onSave(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewWentWell')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewWasHard')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={wasHard}
            onChange={(e) => setWasHard(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewNextWeek')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={nextWeekChange}
            onChange={(e) => setNextWeekChange(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={!canWrite || save.isPending}
          className="w-full rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {t('personal.reviewsSave')}
        </button>
      </form>
    </div>
  );
}

function MonthlyPanel() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const report = useGrowthMonthlyReport();
  const save = useSaveGrowthMonthlyReport();
  const [highlight, setHighlight] = useState('');
  const [lesson, setLesson] = useState('');
  const [nextMonthIntent, setNextMonthIntent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report.data) return;
    setHighlight(report.data.reflection.highlight ?? '');
    setLesson(report.data.reflection.lesson ?? '');
    setNextMonthIntent(report.data.reflection.nextMonthIntent ?? '');
  }, [report.data]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        yearMonth: report.data?.yearMonth,
        highlight,
        lesson,
        nextMonthIntent,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.reviewsSaveFailed'));
    }
  }

  if (report.isPending && !report.data) return <Skeleton className="h-48 w-full" />;
  if (report.isError || !report.data) {
    return (
      <ErrorState
        title={t('personal.reviewsLoadFailed')}
        message={t('common.retry')}
        onRetry={() => void report.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-ink">{report.data.yearMonth}</p>
      <MetricsGrid metrics={report.data.metrics} />
      <div className="rounded-2xl border border-line bg-surface p-3 text-sm text-ink-muted">
        <p>
          {t('personal.reviewMetric.financeIncome')}:{' '}
          <span className="font-medium text-ink">
            {formatMoney(report.data.metrics.finance.incomeSom)}
          </span>
        </p>
        <p className="mt-1">
          {t('personal.reviewMetric.financeExpense')}:{' '}
          <span className="font-medium text-ink">
            {formatMoney(report.data.metrics.finance.expenseSom)}
          </span>
        </p>
      </div>
      <form className="space-y-3 rounded-2xl border border-line bg-surface p-3" onSubmit={(e) => void onSave(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewHighlight')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewLesson')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.reviewNextMonth')}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={nextMonthIntent}
            onChange={(e) => setNextMonthIntent(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={!canWrite || save.isPending}
          className="w-full rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {t('personal.reviewsSave')}
        </button>
      </form>
    </div>
  );
}
