import type { BadgeTone } from '@/components/ui/Badge';
import {
  SmmContentStatus,
  SmmProjectStatus,
  type SmmContentStatus as SmmContentStatusType,
  type SmmProjectStatus as SmmProjectStatusType,
} from '@furniture-erp/shared';

export const FIELD_CLASS =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60';

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-input border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60';

export function projectStatusTone(status: SmmProjectStatusType | string): BadgeTone {
  if (status === SmmProjectStatus.ACTIVE) return 'success';
  if (status === SmmProjectStatus.ON_HOLD) return 'warning';
  if (status === SmmProjectStatus.COMPLETED) return 'neutral';
  return 'neutral';
}

export function contentStatusTone(status: SmmContentStatusType | string): BadgeTone {
  switch (status) {
    case SmmContentStatus.PUBLISHED:
    case SmmContentStatus.ANALYZED:
    case SmmContentStatus.APPROVED:
      return 'success';
    case SmmContentStatus.INTERNAL_REVIEW:
    case SmmContentStatus.CLIENT_REVIEW:
    case SmmContentStatus.REVISION:
    case SmmContentStatus.SCHEDULED:
      return 'warning';
    case SmmContentStatus.ARCHIVED:
      return 'neutral';
    case SmmContentStatus.PRODUCTION:
    case SmmContentStatus.SCRIPT_COPY:
      return 'brand';
    default:
      return 'neutral';
  }
}

export function dayKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthBounds(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(last).padStart(2, '0')}`,
  };
}

export function weekBounds(dayKey: string): { from: string; to: string } {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: dayKeyFromDate(monday), to: dayKeyFromDate(sunday) };
}

export const SMM_PROJECT_TABS = [
  { key: 'overview', label: 'Umumiy' },
  { key: 'audience', label: 'Auditoriya' },
  { key: 'competitors', label: 'Raqobatchilar' },
  { key: 'similar', label: 'O‘xshash' },
  { key: 'calendar', label: 'Kalendar' },
  { key: 'plan', label: 'Reja' },
  { key: 'content', label: 'Kontent' },
  { key: 'tasks', label: 'Vazifalar' },
  { key: 'team', label: 'Jamoa' },
  { key: 'budget', label: 'Byudjet' },
  { key: 'analytics', label: 'Analitika' },
  { key: 'reports', label: 'Hisobot' },
  { key: 'files', label: 'Fayllar' },
  { key: 'activity', label: 'Faoliyat' },
] as const;

export type SmmProjectTabKey = (typeof SMM_PROJECT_TABS)[number]['key'];
