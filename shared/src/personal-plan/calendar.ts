import type { GrowthCalendarEventDto } from '../types/personal-plan.js';

/** ISO date (YYYY-MM-DD) in UTC for grouping calendar days. */
export function calendarDayKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function computeRemindAt(
  startsAt: Date,
  remindMinutesBefore: number | null | undefined,
): Date | null {
  if (remindMinutesBefore == null || remindMinutesBefore < 0) return null;
  return new Date(startsAt.getTime() - remindMinutesBefore * 60_000);
}

export function attachRemindAt<
  T extends {
    startsAt: string;
    remindMinutesBefore: number | null;
  },
>(event: T): T & { remindAt: string | null } {
  const starts = new Date(event.startsAt);
  const remind = computeRemindAt(starts, event.remindMinutesBefore);
  return { ...event, remindAt: remind ? remind.toISOString() : null };
}

/** Quick filters for Home / Plan chips. */
export type PlanDayPreset = 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH';

export function planRangeForPreset(
  preset: PlanDayPreset,
  now = new Date(),
): { from: Date; to: Date; date?: string } {
  const startOfDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

  if (preset === 'TODAY') {
    const day = startOfDay(now);
    return { from: day, to: endOfDay(now), date: calendarDayKey(day) };
  }
  if (preset === 'TOMORROW') {
    const t = new Date(now);
    t.setUTCDate(t.getUTCDate() + 1);
    return { from: startOfDay(t), to: endOfDay(t), date: calendarDayKey(t) };
  }
  if (preset === 'THIS_WEEK') {
    const day = startOfDay(now);
    const dow = day.getUTCDay(); // 0 Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(day);
    monday.setUTCDate(day.getUTCDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }
  // THIS_MONTH
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: first, to: last };
}

export function sortEventsByStart(items: GrowthCalendarEventDto[]): GrowthCalendarEventDto[] {
  return [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
