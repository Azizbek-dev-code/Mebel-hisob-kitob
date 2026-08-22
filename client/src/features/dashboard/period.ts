import { DateRangePreset } from '@furniture-erp/shared';

export interface DashboardPeriod {
  preset: DateRangePreset;
  /** `YYYY-MM-DD`, inclusive. Only meaningful for a custom period. */
  from?: string;
  to?: string;
}

export interface PeriodOption {
  value: DateRangePreset;
  label: string;
  /** Shortened for the segmented control once it has to wrap on a phone. */
  shortLabel: string;
}

export const PERIOD_OPTIONS: readonly PeriodOption[] = [
  { value: DateRangePreset.TODAY, label: 'Bugun', shortLabel: 'Bugun' },
  { value: DateRangePreset.YESTERDAY, label: 'Kecha', shortLabel: 'Kecha' },
  { value: DateRangePreset.THIS_WEEK, label: 'Shu hafta', shortLabel: 'Hafta' },
  { value: DateRangePreset.THIS_MONTH, label: 'Shu oy', shortLabel: 'Oy' },
  { value: DateRangePreset.LAST_MONTH, label: "O'tgan oy", shortLabel: "O'tgan" },
  { value: DateRangePreset.THIS_YEAR, label: 'Shu yil', shortLabel: 'Yil' },
  { value: DateRangePreset.CUSTOM, label: 'Custom', shortLabel: 'Custom' },
];

/** The month is the period a store checks by default. */
export const DEFAULT_PERIOD: DashboardPeriod = { preset: DateRangePreset.THIS_MONTH };

/**
 * A custom period is only worth sending once both ends are set and in order.
 * Until then the previous period stays on screen rather than the API being asked
 * a question it will only answer with a validation error.
 */
export function isPeriodRequestable(period: DashboardPeriod): boolean {
  if (period.preset !== DateRangePreset.CUSTOM) return true;
  return Boolean(period.from && period.to && period.from <= period.to);
}

/** `YYYY-MM-DD` for today, as a `<input type="date">` expects it. */
export function todayAsInputValue(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
