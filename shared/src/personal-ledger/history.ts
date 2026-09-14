import type { PersonalActivityItem } from '../types/personal-ledger.js';

export const PersonalHistoryPeriod = {
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  ALL: 'ALL',
  CUSTOM: 'CUSTOM',
} as const;
export type PersonalHistoryPeriod = (typeof PersonalHistoryPeriod)[keyof typeof PersonalHistoryPeriod];

export const PersonalHistoryGroup = {
  DAY: 'DAY',
  CATEGORY: 'CATEGORY',
} as const;
export type PersonalHistoryGroup = (typeof PersonalHistoryGroup)[keyof typeof PersonalHistoryGroup];

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** UTC calendar bounds so History totals match dashboard month KPIs. */
export function personalHistoryRange(
  period: PersonalHistoryPeriod,
  now = new Date(),
): { from?: string; to?: string } {
  if (period === PersonalHistoryPeriod.ALL || period === PersonalHistoryPeriod.CUSTOM) {
    return {};
  }
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (period === PersonalHistoryPeriod.THIS_WEEK) {
    const weekday = now.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    const monday = new Date(Date.UTC(year, month, day - daysFromMonday));
    const sunday = new Date(Date.UTC(year, month, day - daysFromMonday + 6));
    return { from: utcDate(monday), to: utcDate(sunday) };
  }
  if (period === PersonalHistoryPeriod.THIS_MONTH) {
    return {
      from: utcDate(new Date(Date.UTC(year, month, 1))),
      to: utcDate(new Date(Date.UTC(year, month + 1, 0))),
    };
  }
  if (period === PersonalHistoryPeriod.LAST_MONTH) {
    return {
      from: utcDate(new Date(Date.UTC(year, month - 1, 1))),
      to: utcDate(new Date(Date.UTC(year, month, 0))),
    };
  }
  return {
    from: utcDate(new Date(Date.UTC(year, 0, 1))),
    to: utcDate(new Date(Date.UTC(year, 11, 31))),
  };
}

export function comparePersonalActivity(a: PersonalActivityItem, b: PersonalActivityItem): number {
  const occurred = b.occurredAt.localeCompare(a.occurredAt);
  if (occurred !== 0) return occurred;
  return b.createdAt.localeCompare(a.createdAt);
}

export function groupPersonalHistoryByDay(
  items: readonly PersonalActivityItem[],
): { date: string; items: PersonalActivityItem[] }[] {
  const groups: { date: string; items: PersonalActivityItem[] }[] = [];
  for (const item of items) {
    const date = item.occurredAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(item);
    else groups.push({ date, items: [item] });
  }
  return groups;
}

export function groupPersonalHistoryByCategory(
  items: readonly PersonalActivityItem[],
): { key: string; name: string; amountSom: number; items: PersonalActivityItem[] }[] {
  const map = new Map<string, { key: string; name: string; amountSom: number; items: PersonalActivityItem[] }>();
  for (const item of items) {
    const key = item.kind === 'TRANSFER' ? 'TRANSFER' : item.entry.category.id;
    const name = item.kind === 'TRANSFER' ? 'TRANSFER' : item.entry.category.name;
    const amount = item.kind === 'TRANSFER' ? item.transfer.amount : item.entry.amount;
    const current = map.get(key) ?? { key, name, amountSom: 0, items: [] };
    current.items.push(item);
    current.amountSom += amount;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.amountSom - a.amountSom);
}
