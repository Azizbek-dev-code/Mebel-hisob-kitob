import {
  isDurationUnit,
  type HabitCalendarCellDto,
  type HabitStatsKpiDto,
  type HabitTrendPointDto,
} from '@furniture-erp/shared';
import { Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { HabitWeekStrip } from './HabitMonthCalendar';
import { formatNum, formatPct } from './habit-ui';

function statusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-brand-500';
  if (status === 'PARTIAL') return 'bg-warning-500';
  if (status === 'FAILED') return 'bg-danger-400';
  if (status === 'SKIPPED') return 'bg-slate-300';
  return 'bg-line';
}

export function HabitKpiGrid({ kpi, unit }: { kpi: HabitStatsKpiDto; unit?: string }) {
  const { t } = useTranslation();
  const unitLabel = unit ? t(`personal.habitUnit.${unit}`, { defaultValue: unit }) : '';
  const duration = isDurationUnit(unit);
  const items = [
    { label: t('personal.habitKpiCompletion'), value: formatPct(kpi.completion) },
    { label: t('personal.habitKpiStreak'), value: t('personal.habitKpiStreakValue', { count: kpi.currentStreak }) },
    { label: t('personal.habitKpiBestStreak'), value: t('personal.habitKpiStreakValue', { count: kpi.longestStreak }) },
    { label: t('personal.habitKpiConsistency'), value: formatPct(kpi.consistency) },
    {
      label: duration ? t('personal.habitKpiTotalDuration') : t('personal.habitKpiTotal'),
      value: unitLabel ? `${formatNum(kpi.totalValue)} ${unitLabel}` : formatNum(kpi.totalValue),
    },
    {
      label: duration ? t('personal.habitKpiAverageDuration') : t('personal.habitKpiAverage'),
      value: unitLabel ? `${formatNum(kpi.average)} ${unitLabel}` : formatNum(kpi.average),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-line bg-surface px-3 py-3">
          <p className="text-[11px] text-ink-muted">{item.label}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function HabitSummaryStrip({
  kpi,
  unit,
}: {
  kpi: HabitStatsKpiDto;
  unit?: string;
}) {
  const { t } = useTranslation();
  const unitLabel = unit ? t(`personal.habitUnit.${unit}`, { defaultValue: unit }) : '';
  const items = [
    { label: t('personal.habitStatCompleted'), value: `${kpi.completed}d` },
    { label: t('personal.habitStatSkipped'), value: `${kpi.skipped}d` },
    { label: t('personal.habitStatMissed'), value: `${kpi.failed}d` },
    {
      label: t('personal.habitStatTotal'),
      value: unitLabel ? `${formatNum(kpi.totalValue)} ${unitLabel}` : formatNum(kpi.totalValue),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{item.label}</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-ink">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function HabitStreakHero({
  currentStreak,
  cells,
  todayKey,
}: {
  currentStreak: number;
  cells: HabitCalendarCellDto[];
  todayKey: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="pf-card flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Flame className="size-8" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center pt-1 text-lg font-bold tabular-nums text-brand-800">
            {currentStreak}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t('personal.habitDayStreak')}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {currentStreak > 0 ? t('personal.habitStreakKeep') : t('personal.habitStreakStart')}
          </p>
        </div>
      </div>
      <HabitWeekStrip cells={cells} todayKey={todayKey} />
    </div>
  );
}

export function HabitHeatmap({ cells }: { cells: HabitCalendarCellDto[] }) {
  const { t } = useTranslation();
  if (cells.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitNoData')}</p>;
  }
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{t('personal.habitCalendar')}</p>
      <div className="min-w-0 overflow-hidden">
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <div
              key={cell.dayKey}
              title={`${cell.dayKey}: ${cell.status}`}
              className={cn('aspect-square min-w-0 rounded-sm', statusClass(cell.status))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HabitTrendBars({
  points,
  targetValue,
}: {
  points: HabitTrendPointDto[];
  targetValue?: number;
}) {
  const { t } = useTranslation();
  if (points.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitTrendEmpty')}</p>;
  }
  const maxValue = Math.max(...points.map((point) => point.value), targetValue ?? 0, 0);
  const useValue = maxValue > 0;
  const max = useValue ? maxValue : Math.max(...points.map((point) => point.completion), 0);
  if (max <= 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitTrendEmpty')}</p>;
  }
  const targetPct =
    useValue && targetValue && targetValue > 0 ? Math.min(100, (targetValue / max) * 100) : null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{t('personal.habitTrend')}</p>
      <div className="relative flex h-32 items-end gap-1">
        {targetPct != null ? (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-danger-400"
            style={{ bottom: `${targetPct}%` }}
            title={t('personal.habitTargetLine')}
          />
        ) : null}
        {points.map((point) => {
          const metric = useValue ? point.value : point.completion;
          return (
            <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${Math.max(8, (metric / max) * 100)}%` }}
                title={useValue ? formatNum(point.value) : formatPct(point.completion)}
              />
              <span className="truncate text-[9px] text-ink-muted">{point.label.slice(-2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Daily bars from calendar cells — useful for Day/Week views. */
export function HabitDailyProgressChart({
  cells,
  targetValue,
  unit,
}: {
  cells: HabitCalendarCellDto[];
  targetValue?: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  const visible = cells.filter((cell) => cell.scheduled || cell.value > 0 || cell.status !== 'UNSCHEDULED');
  if (visible.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitTrendEmpty')}</p>;
  }
  const maxValue = Math.max(...visible.map((cell) => cell.value), targetValue ?? 0, 1);
  const targetPct = targetValue && targetValue > 0 ? Math.min(100, (targetValue / maxValue) * 100) : null;
  const unitLabel = unit ? t(`personal.habitUnit.${unit}`, { defaultValue: unit }) : '';

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">
        {t('personal.habitDailyProgress')}
        {unitLabel ? ` · ${unitLabel}` : ''}
      </p>
      <div className="relative flex h-36 items-end gap-0.5 overflow-x-auto">
        {targetPct != null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-danger-400"
            style={{ bottom: `${targetPct}%` }}
            title={t('personal.habitTargetLine')}
          />
        ) : null}
        {visible.map((cell) => {
          const height = Math.max(4, (cell.value / maxValue) * 100);
          const done = cell.status === 'COMPLETED';
          const failed = cell.status === 'FAILED';
          return (
            <div key={cell.dayKey} className="flex min-w-[10px] flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full max-w-6 rounded-t',
                  done ? 'bg-brand-500' : failed ? 'bg-danger-300' : 'bg-brand-300',
                )}
                style={{ height: `${height}%` }}
                title={`${cell.dayKey}: ${formatNum(cell.value)}`}
              />
              <span className="truncate text-[8px] text-ink-soft">{cell.dayKey.slice(-2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
