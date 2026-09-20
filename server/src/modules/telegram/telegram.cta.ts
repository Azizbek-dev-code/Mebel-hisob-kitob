import {
  TELEGRAM_APP_PATHS,
  TELEGRAM_CTA_LABEL,
  TelegramCtaKind,
} from '@furniture-erp/shared';

import { getPublicAppUrl } from './telegram.config.js';

export type TelegramNotificationType =
  | 'SALE'
  | 'PURCHASE'
  | 'DEBT'
  | 'EXPENSE'
  | 'DELIVERY'
  | 'INVENTORY'
  | 'ASSEMBLY'
  | 'WORKERS'
  | 'BILLING'
  | 'PERSONAL_INCOME'
  | 'PERSONAL_EXPENSE'
  | 'BUDGET'
  | 'GOAL'
  | 'HABIT'
  | 'GROWTH'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'MONTHLY_SUMMARY'
  | 'SYSTEM';

export type TelegramEntityType =
  | 'SALE'
  | 'PURCHASE'
  | 'EXPENSE'
  | 'DEBT'
  | 'DELIVERY'
  | 'INVENTORY'
  | 'PERSONAL_ENTRY'
  | 'BUDGET'
  | 'GOAL'
  | 'HABIT'
  | 'GROWTH'
  | 'STORE'
  | 'WORKSPACE';

export type TelegramNotificationPayload = {
  type: TelegramNotificationType;
  title: string;
  message: string;
  accountType: 'BUSINESS' | 'PERSONAL';
  accountId?: string;
  accountName?: string;
  businessType?: string | null;
  entityType?: TelegramEntityType;
  entityId?: string;
  ctaKind?: TelegramCtaKind;
  ctaLabel?: string;
  ctaPath?: string;
};

const DETAIL_BUILDERS: Partial<
  Record<TelegramNotificationType, (entityId?: string) => string>
> = {
  SALE: (id) => (id ? TELEGRAM_APP_PATHS.saleDetail(id) : TELEGRAM_APP_PATHS.sales),
  PURCHASE: (id) => (id ? TELEGRAM_APP_PATHS.purchaseDetail(id) : TELEGRAM_APP_PATHS.purchases),
  DEBT: () => TELEGRAM_APP_PATHS.debts,
  EXPENSE: () => TELEGRAM_APP_PATHS.expenses,
  DELIVERY: () => TELEGRAM_APP_PATHS.delivery,
  INVENTORY: () => TELEGRAM_APP_PATHS.inventory,
  ASSEMBLY: () => TELEGRAM_APP_PATHS.assemblyTasks,
  WORKERS: () => TELEGRAM_APP_PATHS.workers,
  BILLING: () => TELEGRAM_APP_PATHS.billing,
  PERSONAL_INCOME: () => TELEGRAM_APP_PATHS.personalIncome,
  PERSONAL_EXPENSE: () => TELEGRAM_APP_PATHS.personalExpenses,
  BUDGET: () => TELEGRAM_APP_PATHS.personalBudgets,
  GOAL: () => TELEGRAM_APP_PATHS.personalGoals,
  HABIT: (id) => (id ? TELEGRAM_APP_PATHS.personalHabitDetail(id) : TELEGRAM_APP_PATHS.personalHabits),
  GROWTH: () => TELEGRAM_APP_PATHS.personalHabits,
  DAILY_SUMMARY: () => TELEGRAM_APP_PATHS.dashboard,
  WEEKLY_SUMMARY: () => TELEGRAM_APP_PATHS.reports,
  MONTHLY_SUMMARY: () => TELEGRAM_APP_PATHS.reports,
  SYSTEM: () => TELEGRAM_APP_PATHS.home,
};

function defaultCtaKind(type: TelegramNotificationType): TelegramCtaKind {
  if (type === 'DAILY_SUMMARY' || type === 'WEEKLY_SUMMARY' || type === 'MONTHLY_SUMMARY') {
    return TelegramCtaKind.SUMMARY;
  }
  if (type === 'SYSTEM') return TelegramCtaKind.SYSTEM;
  return TelegramCtaKind.DETAIL;
}

function defaultPath(payload: TelegramNotificationPayload): string {
  if (payload.ctaPath) return payload.ctaPath;
  const builder = DETAIL_BUILDERS[payload.type];
  if (builder) {
    const path = builder(payload.entityId);
    if (payload.accountType === 'PERSONAL') {
      if (payload.type === 'DAILY_SUMMARY') return TELEGRAM_APP_PATHS.personalDashboard;
      if (payload.type === 'WEEKLY_SUMMARY' || payload.type === 'MONTHLY_SUMMARY') {
        return TELEGRAM_APP_PATHS.personalAnalytics;
      }
    }
    return path;
  }
  return payload.accountType === 'PERSONAL'
    ? TELEGRAM_APP_PATHS.personalDashboard
    : TELEGRAM_APP_PATHS.dashboard;
}

export function isSafeAppPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export function absoluteAppUrl(path: string): string {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const safe = isSafeAppPath(path) ? path : '/';
  return `${base}${safe}`;
}

export function ctaForNotification(payload: TelegramNotificationPayload): {
  label: string;
  url: string;
  kind: TelegramCtaKind;
} {
  const kind = payload.ctaKind ?? defaultCtaKind(payload.type);
  const label = payload.ctaLabel?.trim() || TELEGRAM_CTA_LABEL[kind];
  return { label, url: absoluteAppUrl(defaultPath(payload)), kind };
}
