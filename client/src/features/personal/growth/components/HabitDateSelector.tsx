import { addDayKey, type HabitCalendarCellDto } from '@furniture-erp/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';

import { HabitMonthCalendar } from './HabitMonthCalendar';
import { monthKeyOf } from './habit-ui';

function labelForDay(dayKey: string, todayKey: string, t: (key: string) => string): string {
  if (dayKey === todayKey) return t('personal.habitDateToday');
  if (dayKey === addDayKey(todayKey, -1)) return t('personal.habitDateYesterday');
  if (dayKey === addDayKey(todayKey, 1)) return t('personal.habitDateTomorrow');
  return dayKey;
}

export function HabitDateSelector({
  todayKey,
  selectedDayKey,
  onSelect,
  cells,
}: {
  todayKey: string;
  selectedDayKey: string;
  onSelect: (dayKey: string) => void;
  cells: HabitCalendarCellDto[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(selectedDayKey || todayKey));

  const label = todayKey ? labelForDay(selectedDayKey || todayKey, todayKey, t) : t('personal.habitDateToday');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMonthKey(monthKeyOf(selectedDayKey || todayKey));
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-input border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-hover"
      >
        <span>{label}</span>
        <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
      </button>

      {open ? (
        <Dialog open title={t('personal.habitPickDate')} onClose={() => setOpen(false)} className="sm:max-w-sm">
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: addDayKey(todayKey, -1), label: t('personal.habitDateYesterday') },
                  { key: todayKey, label: t('personal.habitDateToday') },
                  { key: addDayKey(todayKey, 1), label: t('personal.habitDateTomorrow') },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium',
                    (selectedDayKey || todayKey) === item.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-muted text-ink-muted',
                  )}
                  onClick={() => {
                    onSelect(item.key);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <HabitMonthCalendar
              cells={cells}
              selectedDayKey={selectedDayKey || todayKey}
              todayKey={todayKey}
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              onSelectDay={(day) => {
                onSelect(day);
                setOpen(false);
              }}
              compact
            />
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
