import { DateRangePreset } from '@furniture-erp/shared';

import type { DashboardPeriod } from '@/features/dashboard/period';

/** Default store zone — matches Prisma Store.timezone default. */
export const WORKER_FINANCE_TIME_ZONE = 'Asia/Tashkent';

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function zonedYmd(instant: Date, timeZone: string): Ymd {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return { year: read('year'), month: read('month'), day: read('day') };
}

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function toIsoDate({ year, month, day }: Ymd): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addCalendarDays(ymd: Ymd, days: number): Ymd {
  const utc = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Maps a dashboard period control to inclusive `from`/`to` calendar dates for
 * the worker-finances API (half-open range resolved server-side).
 */
export function periodToInclusiveRange(
  period: DashboardPeriod,
  now: Date = new Date(),
  timeZone: string = WORKER_FINANCE_TIME_ZONE,
): { from: string; to: string } | null {
  if (period.preset === DateRangePreset.CUSTOM) {
    if (!period.from || !period.to || period.from > period.to) return null;
    return { from: period.from, to: period.to };
  }

  const today = zonedYmd(now, timeZone);

  switch (period.preset) {
    case DateRangePreset.TODAY:
      return { from: toIsoDate(today), to: toIsoDate(today) };

    case DateRangePreset.YESTERDAY: {
      const yesterday = addCalendarDays(today, -1);
      return { from: toIsoDate(yesterday), to: toIsoDate(yesterday) };
    }

    case DateRangePreset.THIS_WEEK: {
      // Monday-start week (same convention as server date-range).
      const utcWeekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
      const daysSinceMonday = (utcWeekday + 6) % 7;
      const from = addCalendarDays(today, -daysSinceMonday);
      const to = addCalendarDays(from, 6);
      return { from: toIsoDate(from), to: toIsoDate(to) };
    }

    case DateRangePreset.THIS_MONTH: {
      const from = { year: today.year, month: today.month, day: 1 };
      const to = {
        year: today.year,
        month: today.month,
        day: daysInMonth(today.year, today.month),
      };
      return { from: toIsoDate(from), to: toIsoDate(to) };
    }

    case DateRangePreset.LAST_MONTH: {
      const month = today.month === 1 ? 12 : today.month - 1;
      const year = today.month === 1 ? today.year - 1 : today.year;
      return {
        from: toIsoDate({ year, month, day: 1 }),
        to: toIsoDate({ year, month, day: daysInMonth(year, month) }),
      };
    }

    case DateRangePreset.THIS_YEAR:
      return {
        from: toIsoDate({ year: today.year, month: 1, day: 1 }),
        to: toIsoDate({ year: today.year, month: 12, day: 31 }),
      };

    default:
      return null;
  }
}

/** Today's calendar date in the store timezone as `YYYY-MM-DD` for `<input type="date">`. */
export function todayStoreInputDate(
  now: Date = new Date(),
  timeZone: string = WORKER_FINANCE_TIME_ZONE,
): string {
  return toIsoDate(zonedYmd(now, timeZone));
}

/**
 * Default `effectiveFrom` for new compensation rules: Jan 1 of the current
 * store-local year. Using "today" made historical backdated sales miss the
 * only open rate and show seller commission as 0.
 */
export function defaultCompensationEffectiveFrom(
  now: Date = new Date(),
  timeZone: string = WORKER_FINANCE_TIME_ZONE,
): string {
  const today = zonedYmd(now, timeZone);
  return toIsoDate({ year: today.year, month: 1, day: 1 });
}

export function periodContextLabel(period: DashboardPeriod): string {
  switch (period.preset) {
    case DateRangePreset.TODAY:
      return 'Bugun';
    case DateRangePreset.YESTERDAY:
      return 'Kecha';
    case DateRangePreset.THIS_WEEK:
      return 'Shu hafta';
    case DateRangePreset.THIS_MONTH:
      return 'Shu oy';
    case DateRangePreset.LAST_MONTH:
      return "O'tgan oy";
    case DateRangePreset.THIS_YEAR:
      return 'Shu yil';
    case DateRangePreset.CUSTOM:
      if (period.from && period.to) return `${period.from} — ${period.to}`;
      return 'Custom';
    default:
      return 'Tanlangan davr';
  }
}
