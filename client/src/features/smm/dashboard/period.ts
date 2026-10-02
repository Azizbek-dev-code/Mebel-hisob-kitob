import {
  SmmDashboardPeriodPreset,
  type SmmDashboardPeriodPreset as SmmDashboardPeriodPresetType,
} from '@furniture-erp/shared';

export type SmmDashPeriod = {
  preset: SmmDashboardPeriodPresetType;
  /** `YYYY-MM-DD`, inclusive. Only meaningful for a custom period. */
  from?: string;
  to?: string;
};

export interface SmmPeriodOption {
  value: SmmDashboardPeriodPresetType;
  label: string;
  /** Shortened for the segmented control once it has to wrap on a phone. */
  shortLabel: string;
}

export const SMM_PERIOD_OPTIONS: readonly SmmPeriodOption[] = [
  { value: SmmDashboardPeriodPreset.TODAY, label: 'Bugun', shortLabel: 'Bugun' },
  { value: SmmDashboardPeriodPreset.THIS_WEEK, label: 'Bu hafta', shortLabel: 'Hafta' },
  { value: SmmDashboardPeriodPreset.THIS_MONTH, label: 'Bu oy', shortLabel: 'Oy' },
  { value: SmmDashboardPeriodPreset.LAST_7_DAYS, label: 'Oxirgi 7 kun', shortLabel: '7 kun' },
  { value: SmmDashboardPeriodPreset.LAST_30_DAYS, label: 'Oxirgi 30 kun', shortLabel: '30 kun' },
  { value: SmmDashboardPeriodPreset.CUSTOM, label: 'Custom', shortLabel: 'Custom' },
];

/** The month is the period an agency checks by default. */
export const DEFAULT_SMM_PERIOD: SmmDashPeriod = {
  preset: SmmDashboardPeriodPreset.THIS_MONTH,
};

/**
 * A custom period is only worth sending once both ends are set and in order.
 * Until then the previous period stays on screen rather than the API being asked
 * a question it will only answer with a validation error.
 */
export function isSmmPeriodRequestable(period: SmmDashPeriod): boolean {
  if (period.preset !== SmmDashboardPeriodPreset.CUSTOM) return true;
  return Boolean(period.from && period.to && period.from <= period.to);
}
