import { parseDayKey, toDayKey } from './habits.js';
import { shiftDayKey } from './social.js';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

/** Monday UTC day key for the week containing `dayKey`. */
export function weekStartDayKey(dayKey: string): string {
  const d = parseDayKey(dayKey);
  const day = d.getUTCDay() || 7; // Sun=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return toDayKey(d);
}

export function weekEndDayKey(weekStart: string): string {
  return shiftDayKey(weekStart, 6);
}

export function isValidDayKey(value: string): boolean {
  return DAY_KEY_RE.test(value);
}

export function isValidYearMonth(value: string): boolean {
  if (!YEAR_MONTH_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function yearMonthFromDayKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function monthStartDayKey(yearMonth: string): string {
  return `${yearMonth}-01`;
}

export function monthEndDayKey(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)); // day 0 of next month
  return toDayKey(last);
}

export function currentWeekStart(now = new Date()): string {
  return weekStartDayKey(toDayKey(now));
}

export function currentYearMonth(now = new Date()): string {
  return yearMonthFromDayKey(toDayKey(now));
}

export function dayKeyRangeInclusive(startDayKey: string, endDayKey: string): string[] {
  const keys: string[] = [];
  let cursor = startDayKey;
  while (cursor <= endDayKey) {
    keys.push(cursor);
    cursor = shiftDayKey(cursor, 1);
    if (keys.length > 62) break;
  }
  return keys;
}
