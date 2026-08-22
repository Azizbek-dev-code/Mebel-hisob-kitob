import { format, isValid, parseISO } from 'date-fns';

const UZ_MONTHS = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyun',
  'Iyul',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
] as const;

/** `08 Avg` — compact Uzbek day/month for expense rows. */
export function formatExpenseDay(value: Date | string): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  const day = format(date, 'dd');
  return `${day} ${UZ_MONTHS[date.getMonth()]}`;
}

/** Today's calendar date as `YYYY-MM-DD` for date inputs. */
export function todayInputDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Convert an API ISO timestamp to a `YYYY-MM-DD` date input value. */
export function toInputDate(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return todayInputDate();
  return format(date, 'yyyy-MM-dd');
}
