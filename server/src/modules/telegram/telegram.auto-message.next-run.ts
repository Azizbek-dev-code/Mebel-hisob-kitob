import {
  DEFAULT_TELEGRAM_TIMEZONE,
  TelegramAutoMessageRecurrence,
} from '@furniture-erp/shared';

import {
  addZonedDays,
  isoWeekdayFromDayKey,
  lastDayOfMonth,
  localWallTimeToUtc,
  zonedDayKey,
} from './telegram.timezone.js';

function startDateKey(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const am = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const bm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!am || !bm) return Number.NaN;
  const aUtc = Date.UTC(Number(am[1]), Number(am[2]) - 1, Number(am[3]));
  const bUtc = Date.UTC(Number(bm[1]), Number(bm[2]) - 1, Number(bm[3]));
  return Math.round((bUtc - aUtc) / 86_400_000);
}

function wallTimeOnDay(
  dayKey: string,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  return localWallTimeToUtc(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour,
      minute,
    },
    timeZone,
  );
}

function dayMatches(
  recurrence: TelegramAutoMessageRecurrence | string,
  dayKey: string,
  weekday: number | null,
  monthDay: number | null,
  startKey: string | null,
): boolean {
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_DAY) return true;

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_WEEK) {
    const wanted = weekday && weekday >= 1 && weekday <= 7 ? weekday : 1;
    return isoWeekdayFromDayKey(dayKey) === wanted;
  }

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_MONTH) {
    const parts = dayKey.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const wanted = Math.min(
      monthDay && monthDay >= 1 && monthDay <= 31 ? monthDay : 1,
      lastDayOfMonth(year, month),
    );
    return day === wanted;
  }

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_15_DAYS) {
    if (!startKey) return false;
    const delta = daysBetween(startKey, dayKey);
    return Number.isFinite(delta) && delta >= 0 && delta % 15 === 0;
  }

  if (recurrence === TelegramAutoMessageRecurrence.ONE_TIME) {
    return Boolean(startKey && startKey === dayKey);
  }

  return false;
}

/**
 * Next scheduled fire instant in UTC ISO, or null when disabled / one-time already past.
 */
export function computeNextRunAt(
  row: {
    enabled?: boolean;
    recurrence: TelegramAutoMessageRecurrence | string;
    hour: number;
    minute: number;
    timezone: string;
    weekday: number | null;
    monthDay: number | null;
    startDate: Date | null;
  },
  now = new Date(),
): string | null {
  if (row.enabled === false) return null;

  const timeZone = row.timezone || DEFAULT_TELEGRAM_TIMEZONE;
  const startKey = startDateKey(row.startDate);
  const recurrence = row.recurrence as TelegramAutoMessageRecurrence;

  if (recurrence === TelegramAutoMessageRecurrence.ONE_TIME) {
    if (!startKey) return null;
    const at = wallTimeOnDay(startKey, row.hour, row.minute, timeZone);
    if (!at || at.getTime() <= now.getTime()) return null;
    return at.toISOString();
  }

  let dayKey = zonedDayKey(now, timeZone);
  // Scan up to ~14 months of calendar days — enough for monthly / 15-day / weekly.
  for (let i = 0; i < 450; i += 1) {
    if (dayMatches(recurrence, dayKey, row.weekday, row.monthDay, startKey)) {
      const at = wallTimeOnDay(dayKey, row.hour, row.minute, timeZone);
      if (at && at.getTime() > now.getTime()) {
        return at.toISOString();
      }
    }
    dayKey = addZonedDays(dayKey, 1);
  }

  return null;
}

/** Human-friendly next-run label in the message timezone (Uzbek). */
export function formatNextRunLabel(
  nextRunAt: string | null,
  timeZone: string,
  now = new Date(),
): string | null {
  if (!nextRunAt) return null;
  const at = new Date(nextRunAt);
  if (Number.isNaN(at.getTime())) return null;

  const tz = timeZone || DEFAULT_TELEGRAM_TIMEZONE;
  const todayKey = zonedDayKey(now, tz);
  const runKey = zonedDayKey(at, tz);
  const time = new Intl.DateTimeFormat('uz-UZ', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);

  if (runKey === todayKey) return `Bugun ${time}`;
  if (runKey === addZonedDays(todayKey, 1)) return `Ertaga ${time}`;

  const date = new Intl.DateTimeFormat('uz-UZ', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(at);
  return `${date} ${time}`;
}
