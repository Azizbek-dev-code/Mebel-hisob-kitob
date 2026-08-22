import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

/** Re-exported so feature code has a single import for display formatting. */
export {
  formatMoney,
  formatMoneyCompact,
  formatMoneyNumber,
  parseMoneyInput,
} from '@furniture-erp/shared';

function toDate(value: Date | string): Date | null {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

/** `08.09.2026` — the day-first form used on receipts and schedules. */
export function formatDate(value: Date | string): string {
  const date = toDate(value);
  return date ? format(date, 'dd.MM.yyyy') : '—';
}

/** `08.09.2026 14:30` */
export function formatDateTime(value: Date | string): string {
  const date = toDate(value);
  return date ? format(date, 'dd.MM.yyyy HH:mm') : '—';
}

/** `8 Sep` — compact axis and list label. */
export function formatDayMonth(value: Date | string): string {
  const date = toDate(value);
  return date ? format(date, 'd MMM') : '—';
}

/** `2 hours ago` — used in the activity feed. */
export function formatRelativeTime(value: Date | string): string {
  const date = toDate(value);
  return date ? `${formatDistanceToNowStrict(date)} ago` : '—';
}

/** `+18.6%` / `-2.1%` — the delta badge on stat cards. */
export function formatPercentDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

/**
 * Percentage change between two periods.
 * Returns `null` when the previous period was zero, because "infinite growth"
 * is not a number worth showing on a dashboard.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** `Anvar Aliyev` -> `AA`, for avatar fallbacks. */
export function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
