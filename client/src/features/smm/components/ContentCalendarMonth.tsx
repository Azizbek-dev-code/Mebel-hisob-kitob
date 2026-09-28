import {
  SMM_CONTENT_TYPE_LABELS,
  type SmmContentItemListItem,
} from '@furniture-erp/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { ContentStatusBadge } from './ContentStatusBadge';
import { dayKeyFromDate, shiftMonthKey } from '../utils/ui';

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, 1);
  return new Intl.DateTimeFormat('uz-UZ', { month: 'long', year: 'numeric' }).format(date);
}

function buildGrid(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const first = new Date(y!, (m ?? 1) - 1, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKeyFromDate(d);
  });
}

interface ContentCalendarMonthProps {
  projectId: string;
  monthKey: string;
  items: SmmContentItemListItem[];
  selectedDay: string | null;
  todayKey: string;
  onMonthChange: (monthKey: string) => void;
  onSelectDay: (dayKey: string) => void;
}

export function ContentCalendarMonth({
  projectId,
  monthKey,
  items,
  selectedDay,
  todayKey,
  onMonthChange,
  onSelectDay,
}: ContentCalendarMonthProps) {
  const byDay = useMemo(() => {
    const map = new Map<string, SmmContentItemListItem[]>();
    for (const item of items) {
      if (!item.publishAt) continue;
      const key = item.publishAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const days = useMemo(() => buildGrid(monthKey), [monthKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
          aria-label="Oldingi oy"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-ink">{monthLabel(monthKey)}</p>
        <button
          type="button"
          className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
          aria-label="Keyingi oy"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[10px] font-medium uppercase text-ink-soft">
            {d}
          </span>
        ))}
        {days.map((dayKey) => {
          const inMonth = dayKey.startsWith(monthKey);
          const dayItems = byDay.get(dayKey) ?? [];
          const selected = selectedDay === dayKey;
          const isToday = todayKey === dayKey;
          return (
            <button
              key={dayKey}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelectDay(dayKey)}
              className={cn(
                'flex min-h-[4.5rem] flex-col gap-0.5 rounded-lg border p-1 text-left transition-colors sm:min-h-[5.5rem]',
                !inMonth && 'opacity-0',
                inMonth && 'border-line bg-surface hover:border-brand-300',
                selected && 'border-brand-500 ring-2 ring-brand-200',
                isToday && !selected && 'outline outline-1 outline-brand-400',
              )}
            >
              <span className="text-xs font-medium tabular-nums text-ink">{Number(dayKey.slice(-2))}</span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayItems.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    to={ROUTES.smmContentDetail(projectId, item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate rounded bg-brand-50 px-1 text-[10px] font-medium text-brand-800"
                    title={item.title}
                  >
                    {SMM_CONTENT_TYPE_LABELS[item.contentType]} · {item.title}
                  </Link>
                ))}
                {dayItems.length > 2 ? (
                  <span className="text-[10px] text-ink-muted">+{dayItems.length - 2}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="space-y-2 rounded-input border border-line bg-surface-muted p-3">
          <p className="text-sm font-medium text-ink">{selectedDay}</p>
          {(byDay.get(selectedDay) ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Bu kunda kontent yo‘q</p>
          ) : (
            <ul className="space-y-2">
              {(byDay.get(selectedDay) ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-input border border-line bg-surface px-3 py-2">
                  <Link
                    to={ROUTES.smmContentDetail(projectId, item.id)}
                    className="min-w-0 truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <ContentStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
