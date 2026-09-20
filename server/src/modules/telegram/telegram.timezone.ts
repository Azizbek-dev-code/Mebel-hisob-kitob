import { DEFAULT_TELEGRAM_TIMEZONE } from '@furniture-erp/shared';

export { DEFAULT_TELEGRAM_TIMEZONE };

function formatParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

export function minuteInTimeZone(date: Date, timeZone: string = DEFAULT_TELEGRAM_TIMEZONE): number {
  return formatParts(date, timeZone).minute;
}

export function zonedDayKey(date: Date, timeZone: string = DEFAULT_TELEGRAM_TIMEZONE): string {
  const parts = formatParts(date, timeZone);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date.
 * Asia/Tashkent has no DST; one offset pass is enough for other zones too
 * except the DST overlap hour.
 */
export function localWallTimeToUtc(
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string = DEFAULT_TELEGRAM_TIMEZONE,
): Date {
  const utcGuess = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
  const asLocal = formatParts(new Date(utcGuess), timeZone);
  const asLocalUtc = Date.UTC(asLocal.year, asLocal.month - 1, asLocal.day, asLocal.hour, asLocal.minute, 0);
  return new Date(utcGuess - (asLocalUtc - utcGuess));
}

export function zonedDayRange(
  dayKey: string,
  timeZone: string = DEFAULT_TELEGRAM_TIMEZONE,
): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) {
    const start = new Date(0);
    return { start, end: start };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = localWallTimeToUtc({ year, month, day, hour: 0, minute: 0 }, timeZone);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = localWallTimeToUtc(
    {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
      hour: 0,
      minute: 0,
    },
    timeZone,
  );
  return { start, end };
}

export function addZonedDays(dayKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta));
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export function isoWeekdayFromDayKey(dayKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return 1;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const utcDay = d.getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function displayInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_TELEGRAM_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function parseScheduledAt(
  isoOrLocal: string,
  timezone: string = DEFAULT_TELEGRAM_TIMEZONE,
): Date | null {
  const trimmed = isoOrLocal.trim();
  if (!trimmed) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return localWallTimeToUtc(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
    },
    timezone,
  );
}
