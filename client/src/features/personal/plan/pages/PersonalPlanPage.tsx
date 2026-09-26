import {
  GrowthEventPriority,
  GrowthEventRecurrence,
  calendarDayKey,
  planRangeForPreset,
  type CreateGrowthCalendarEventRequest,
  type GrowthCalendarEventDto,
  type GrowthEventPriority as Priority,
  type GrowthEventRecurrence as Recurrence,
} from '@furniture-erp/shared';
import { Bell, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

import {
  useCreatePersonalPlanEvent,
  usePersonalPlanDay,
  usePersonalPlanEvents,
  usePersonalPlanReminders,
  useUpdatePersonalPlanEvent,
} from '../hooks/use-personal-plan';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function utcTodayKey(now = new Date()): string {
  return calendarDayKey(now);
}

function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Monday-first weekday index 0..6 for UTC date. */
function mondayFirstIndex(year: number, monthIndex: number, day: number): number {
  const dow = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return dow === 0 ? 6 : dow - 1;
}

function toIsoFromLocalInputs(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0)).toISOString();
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function PersonalPlanPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);

  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState(() => utcTodayKey(now));
  const [composerOpen, setComposerOpen] = useState(false);

  const monthFrom = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`;
  const lastDay = daysInMonth(cursor.year, cursor.month);
  const monthTo = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const monthEvents = usePersonalPlanEvents(monthFrom, monthTo);
  const dayPlan = usePersonalPlanDay(selectedDate);
  const reminders = usePersonalPlanReminders(24 * 60);

  const daysWithEvents = useMemo(
    () => new Set(monthEvents.data?.daysWithEvents ?? []),
    [monthEvents.data?.daysWithEvents],
  );

  const presets = [
    { key: 'TODAY' as const, label: t('personal.plan.presetToday') },
    { key: 'TOMORROW' as const, label: t('personal.plan.presetTomorrow') },
    { key: 'THIS_WEEK' as const, label: t('personal.plan.presetWeek') },
    { key: 'THIS_MONTH' as const, label: t('personal.plan.presetMonth') },
  ];

  function applyPreset(key: (typeof presets)[number]['key']) {
    const range = planRangeForPreset(key, new Date());
    if (range.date) {
      setSelectedDate(range.date);
      const [y, m] = range.date.split('-').map(Number);
      setCursor({ year: y!, month: (m ?? 1) - 1 });
      return;
    }
    setSelectedDate(calendarDayKey(range.from));
    setCursor({ year: range.from.getUTCFullYear(), month: range.from.getUTCMonth() });
  }

  const leading = mondayFirstIndex(cursor.year, cursor.month, 1);
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: Array<{ key: string; day: number | null }> = [];
  for (let i = 0; i < leading; i += 1) cells.push({ key: `pad-${i}`, day: null });
  for (let d = 1; d <= totalDays; d += 1) {
    const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ key, day: d });
  }

  const monthLabel = t('personal.plan.monthLabel', {
    month: t(`personal.plan.months.${cursor.month}`),
    year: cursor.year,
  });

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="pf-page-title">{t('personal.planTitle')}</h1>
          <p className="pf-page-hint">{t('personal.planHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          disabled={!canWrite}
          className="pf-btn-primary shrink-0 !min-h-10 px-3"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('personal.plan.add')}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyPreset(preset.key)}
            className="min-h-10 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-soft hover:bg-surface-hover"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {(reminders.data?.items.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium text-brand-800">
            <Bell className="size-3.5" aria-hidden="true" />
            {t('personal.plan.upcomingReminders')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {reminders.data?.items.slice(0, 3).map((item) => (
              <li key={item.id} className="text-sm text-ink">
                {item.title}
                {item.remindAt ? (
                  <span className="text-ink-muted"> · {formatClock(item.remindAt)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={t('personal.plan.prevMonth')}
            className="pf-touch-target flex items-center justify-center rounded-xl text-ink-muted hover:bg-surface-hover"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-0 truncate text-center text-sm font-semibold text-ink">{monthLabel}</p>
          <button
            type="button"
            aria-label={t('personal.plan.nextMonth')}
            className="pf-touch-target flex items-center justify-center rounded-xl text-ink-muted hover:bg-surface-hover"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink-muted">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => (
            <span key={d}>{t(`personal.plan.weekdays.${d}`)}</span>
          ))}
        </div>

        {monthEvents.isPending && !monthEvents.data ? (
          <Skeleton className="mt-2 h-48 w-full" />
        ) : monthEvents.isError ? (
          <ErrorState
            title={t('personal.planLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void monthEvents.refetch()}
          />
        ) : (
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (cell.day == null) {
                return <div key={cell.key} className="aspect-square" />;
              }
              const active = cell.key === selectedDate;
              const has = daysWithEvents.has(cell.key);
              const isToday = cell.key === utcTodayKey();
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDate(cell.key)}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm',
                    active
                      ? 'bg-brand-600 font-semibold text-white'
                      : isToday
                        ? 'bg-brand-50 font-medium text-brand-800'
                        : 'text-ink hover:bg-surface-hover',
                  )}
                >
                  {cell.day}
                  {has ? (
                    <span
                      className={cn(
                        'absolute bottom-1 size-1 rounded-full',
                        active ? 'bg-white' : 'bg-brand-500',
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="pf-card p-4">
        <h2 className="text-sm font-semibold text-ink">
          {t('personal.plan.dayTitle', { date: selectedDate })}
        </h2>
        {dayPlan.isPending && !dayPlan.data ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : dayPlan.isError ? (
          <ErrorState
            title={t('personal.planLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void dayPlan.refetch()}
          />
        ) : (dayPlan.data?.items.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('personal.plan.dayEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dayPlan.data?.items.map((item) => (
              <EventRow key={item.id} event={item} canWrite={canWrite} />
            ))}
          </ul>
        )}
      </section>

      {composerOpen ? (
        <EventComposer
          defaultDate={selectedDate}
          onClose={() => setComposerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EventRow({
  event,
  canWrite,
}: {
  event: GrowthCalendarEventDto;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const update = useUpdatePersonalPlanEvent();
  const timeLabel = event.allDay
    ? t('personal.plan.allDay')
    : `${formatClock(event.startsAt)}${event.endsAt ? ` – ${formatClock(event.endsAt)}` : ''}`;

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{event.title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {timeLabel}
          {event.category ? ` · ${event.category}` : ''}
          {event.remindMinutesBefore != null
            ? ` · ${t('personal.plan.remindShort', { minutes: event.remindMinutesBefore })}`
            : ''}
        </p>
        {event.note ? <p className="mt-1 text-xs text-ink-soft">{event.note}</p> : null}
      </div>
      {canWrite ? (
        <button
          type="button"
          className="shrink-0 text-xs text-ink-muted hover:text-danger-700"
          disabled={update.isPending}
          onClick={() => void update.mutateAsync({ id: event.id, body: { isCancelled: true } })}
        >
          {t('common.delete')}
        </button>
      ) : null}
    </li>
  );
}

function EventComposer({
  defaultDate,
  onClose,
}: {
  defaultDate: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePersonalPlanEvent();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>(GrowthEventPriority.MEDIUM);
  const [recurrence, setRecurrence] = useState<Recurrence>(GrowthEventRecurrence.NONE);
  const [intervalDays, setIntervalDays] = useState('7');
  const [remindMinutes, setRemindMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body: CreateGrowthCalendarEventRequest = {
      title: title.trim(),
      category: category.trim() || null,
      priority,
      startsAt: toIsoFromLocalInputs(date, startTime),
      endsAt: endTime ? toIsoFromLocalInputs(date, endTime) : null,
      recurrence,
      intervalDays:
        recurrence === GrowthEventRecurrence.CUSTOM ? Number(intervalDays) || null : null,
      remindMinutesBefore: remindMinutes === '' ? null : Number(remindMinutes),
      note: note.trim() || null,
    };
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : t('personal.plan.saveFailed'),
      );
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.plan.add')} className="sm:max-w-md">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.plan.fieldTitle')}</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldDate')}</span>
            <input
              type="date"
              className={fieldClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldCategory')}</span>
            <input
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('personal.plan.categoryPlaceholder')}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldStart')}</span>
            <input
              type="time"
              className={fieldClass}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldEnd')}</span>
            <input
              type="time"
              className={fieldClass}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldPriority')}</span>
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {Object.values(GrowthEventPriority).map((value) => (
                <option key={String(value)} value={String(value)}>
                  {t(`personal.plan.priority.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldRemind')}</span>
            <select
              className={fieldClass}
              value={remindMinutes}
              onChange={(e) => setRemindMinutes(e.target.value)}
            >
              <option value="">{t('personal.plan.remindNone')}</option>
              <option value="10">10 {t('personal.plan.minutes')}</option>
              <option value="30">30 {t('personal.plan.minutes')}</option>
              <option value="60">60 {t('personal.plan.minutes')}</option>
              <option value="120">120 {t('personal.plan.minutes')}</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.plan.fieldRecurrence')}</span>
          <select
            className={fieldClass}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          >
            {Object.values(GrowthEventRecurrence).map((value) => (
              <option key={String(value)} value={String(value)}>
                {t(`personal.plan.recurrence.${value}`)}
              </option>
            ))}
          </select>
        </label>
        {recurrence === GrowthEventRecurrence.CUSTOM ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldInterval')}</span>
            <input
              type="number"
              min={1}
              max={365}
              className={fieldClass}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.plan.fieldNote')}</span>
          <textarea
            className={cn(fieldClass, 'min-h-20 resize-y')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </label>
        {error ? (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={create.isPending || !title.trim()}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {create.isPending ? t('app.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
