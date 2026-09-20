import { isDurationUnit, type HabitCalendarCellDto, type HabitStatsKpiDto, type HabitTrendPointDto } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

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

export function HabitTrendBars({ points }: { points: HabitTrendPointDto[] }) {
  const { t } = useTranslation();
  if (points.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitTrendEmpty')}</p>;
  }
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const useValue = maxValue > 0;
  const max = useValue ? maxValue : Math.max(...points.map((point) => point.completion), 0);
  if (max <= 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitTrendEmpty')}</p>;
  }
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{t('personal.habitTrend')}</p>
      <div className="flex h-28 items-end gap-1">
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
