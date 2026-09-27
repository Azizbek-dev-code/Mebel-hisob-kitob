import {
  addDayKey,
  isoWeekday,
  type HabitCalendarCellDto,
  type GrowthHabitDayStatus,
} from '@furniture-erp/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { WEEKDAY_KEYS } from './habit-ui';

function statusClass(status: GrowthHabitDayStatus | string, scheduled: boolean): string {
  if (!scheduled && status !== 'COMPLETED' && status !== 'PARTIAL') return 'bg-transparent text-ink-soft';
  if (status === 'COMPLETED') return 'bg-brand-500 text-white';
  if (status === 'PARTIAL') return 'bg-warning-400 text-white';
  if (status === 'FAILED') return 'bg-danger-100 text-danger-700';
  if (status === 'SKIPPED') return 'bg-slate-200 text-ink-muted';
  return 'bg-surface-muted text-ink-muted';
}

function monthLabel(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'uz-UZ', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function HabitMonthCalendar({
  cells,
  selectedDayKey,
  todayKey,
  monthKey,
  onMonthChange,
  onSelectDay,
  compact,
}: {
  cells: HabitCalendarCellDto[];
  selectedDayKey: string;
  todayKey: string;
  monthKey: string;
  onMonthChange: (next: string) => void;
  onSelectDay: (dayKey: string) => void;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const byDay = useMemo(() => new Map(cells.map((cell) => [cell.dayKey, cell])), [cells]);

  const days = useMemo(() => {
    const start = `${monthKey}-01`;
    const startWeekday = isoWeekday(start);
    const gridStart = addDayKey(start, -(startWeekday - 1));
    return Array.from({ length: 42 }, (_, index) => addDayKey(gridStart, index));
  }, [monthKey]);

  return (
    <div className={cn('min-w-0', compact ? 'space-y-2' : 'space-y-3')}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          aria-label={t('personal.habitPrevMonth')}
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-ink">{monthLabel(monthKey, i18n.language)}</p>
        <button
          type="button"
          className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          aria-label={t('personal.habitNextMonth')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_KEYS.map((day) => (
          <span key={day} className="text-[10px] font-medium uppercase text-ink-soft">
            {t(`personal.habitWeekday.${day}`)}
          </span>
        ))}
        {days.map((dayKey) => {
          const inMonth = dayKey.startsWith(monthKey);
          const cell = byDay.get(dayKey);
          const selected = dayKey === selectedDayKey;
          const isToday = dayKey === todayKey;
          const dayNum = Number(dayKey.slice(-2));
          return (
            <button
              key={dayKey}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelectDay(dayKey)}
              className={cn(
                'relative flex aspect-square min-w-0 items-center justify-center rounded-lg text-xs tabular-nums transition-colors',
                !inMonth && 'opacity-0',
                inMonth && statusClass(cell?.status ?? 'NONE', cell?.scheduled ?? false),
                selected && 'ring-2 ring-brand-600 ring-offset-1',
                isToday && !selected && 'outline outline-1 outline-brand-400',
              )}
              aria-label={dayKey}
              aria-current={selected ? 'date' : undefined}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HabitWeekStrip({
  cells,
  todayKey,
  selectedDayKey,
  onSelectDay,
}: {
  cells: HabitCalendarCellDto[];
  todayKey: string;
  selectedDayKey?: string;
  onSelectDay?: (dayKey: string) => void;
}) {
  const { t } = useTranslation();
  const weekday = isoWeekday(todayKey);
  const weekStart = addDayKey(todayKey, -(weekday - 1));
  const byDay = useMemo(() => new Map(cells.map((cell) => [cell.dayKey, cell])), [cells]);

  return (
    <div className="flex items-center justify-between gap-1">
      {WEEKDAY_KEYS.map((day, index) => {
        const dayKey = addDayKey(weekStart, index);
        const cell = byDay.get(dayKey);
        const done = cell?.status === 'COMPLETED';
        const partial = cell?.status === 'PARTIAL';
        const failed = cell?.status === 'FAILED';
        const selected = dayKey === selectedDayKey;
        const className = cn(
          'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-0.5 py-1',
          selected && 'bg-brand-50',
        );
        const inner = (
          <>
            <span className="text-[10px] text-ink-soft">{t(`personal.habitWeekday.${day}`)}</span>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-[11px] tabular-nums',
                done && 'border-brand-500 bg-brand-500 text-white',
                partial && !done && 'border-warning-500 bg-warning-50 text-warning-800',
                failed && !done && !partial && 'border-danger-300 bg-danger-50 text-danger-700',
                !done && !partial && !failed && 'border-line text-ink-muted',
                dayKey === todayKey && !done && 'border-brand-400',
              )}
            >
              {Number(dayKey.slice(-2))}
            </span>
          </>
        );
        if (onSelectDay) {
          return (
            <button key={day} type="button" onClick={() => onSelectDay(dayKey)} className={className}>
              {inner}
            </button>
          );
        }
        return (
          <div key={day} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
