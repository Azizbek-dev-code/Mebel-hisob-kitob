import { addMonthsClamped } from '../accounting/installments.js';

/** Calendar date YYYY-MM-DD in the given IANA zone. */
export function calendarDateInTimeZone(date: Date, timeZone = 'Asia/Tashkent'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function calendarDaysBetween(from: Date, to: Date, timeZone = 'Asia/Tashkent'): number {
  const start = calendarDateInTimeZone(from, timeZone);
  const end = calendarDateInTimeZone(to, timeZone);
  const startUtc = Date.parse(`${start}T00:00:00Z`);
  const endUtc = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

export function isDueDateOverdue(dueDate: Date, now = new Date(), timeZone = 'Asia/Tashkent'): boolean {
  return calendarDateInTimeZone(dueDate, timeZone) < calendarDateInTimeZone(now, timeZone);
}

/**
 * Block after grace calendar days past the due date.
 * Due 22.09 + grace 3 => 23–25 overdue, 26 blocked.
 */
export function isPastGracePeriod(
  dueDate: Date,
  gracePeriodDays: number,
  now = new Date(),
  timeZone = 'Asia/Tashkent',
): boolean {
  return calendarDaysBetween(dueDate, now, timeZone) > gracePeriodDays;
}

export function nextMonthlyPeriod(from: Date): { start: Date; end: Date; due: Date } {
  const start = from;
  const end = addMonthsClamped(from, 1);
  return { start, end, due: end };
}

export function computePlatformNetProfit(revenue: number, expenses: number): number {
  return revenue - expenses;
}

export function monthKey(date: Date, timeZone = 'Asia/Tashkent'): string {
  const iso = calendarDateInTimeZone(date, timeZone);
  return iso.slice(0, 7);
}
