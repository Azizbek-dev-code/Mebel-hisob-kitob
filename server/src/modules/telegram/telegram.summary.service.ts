import {
  formatMoney,
  TelegramCtaKind,
  TELEGRAM_APP_PATHS,
  WorkspaceType,
} from '@furniture-erp/shared';
import { ExpenseStatus, PersonalEntryType, SaleStatus } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { fromDbMoney } from '../../lib/money-mapper.js';
import { formatTelegramNotification } from './telegram.notification.js';
import type { TelegramNotificationPayload } from './telegram.cta.js';
import { addZonedDays, zonedDayRange } from './telegram.timezone.js';

export type SummaryPeriod = 'day' | 'week' | 'month';

function periodTitle(period: SummaryPeriod, evening: boolean): string {
  if (period === 'week') return '📊 Haftalik natija';
  if (period === 'month') return '📊 Oylik natija';
  return evening ? '🌙 Bugungi natija' : '☀️ Bugungi natija';
}

function periodType(
  period: SummaryPeriod,
): TelegramNotificationPayload['type'] {
  if (period === 'week') return 'WEEKLY_SUMMARY';
  if (period === 'month') return 'MONTHLY_SUMMARY';
  return 'DAILY_SUMMARY';
}

export async function buildPersonalSummary(opts: {
  workspaceId: string;
  dayKey: string;
  period: SummaryPeriod;
  evening?: boolean;
}): Promise<ReturnType<typeof formatTelegramNotification> | null> {
  const days = opts.period === 'week' ? 7 : opts.period === 'month' ? 30 : 1;
  const startKey = addZonedDays(opts.dayKey, 1 - days);
  const { start } = zonedDayRange(startKey);
  const { end } = zonedDayRange(opts.dayKey);

  const [entries, dailyGoals, habits, checkIns] = await Promise.all([
    prisma.personalEntry.findMany({
      where: {
        workspaceId: opts.workspaceId,
        status: ExpenseStatus.ACTIVE,
        occurredAt: { gte: start, lt: end },
      },
      select: { type: true, amount: true },
    }),
    prisma.growthDailyGoal.findMany({
      where: {
        workspaceId: opts.workspaceId,
        dayKey: opts.period === 'day' ? opts.dayKey : { gte: startKey, lte: opts.dayKey },
      },
      select: { isDone: true },
    }),
    prisma.growthHabit.findMany({
      where: { workspaceId: opts.workspaceId, isArchived: false },
      select: { id: true },
    }),
    prisma.growthHabitCheckIn.findMany({
      where: {
        workspaceId: opts.workspaceId,
        dayKey: opts.period === 'day' ? opts.dayKey : { gte: startKey, lte: opts.dayKey },
        status: 'COMPLETED',
      },
      select: { habitId: true, dayKey: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    const amount = fromDbMoney(entry.amount);
    if (entry.type === PersonalEntryType.INCOME) income += amount;
    else if (entry.type === PersonalEntryType.EXPENSE) expense += amount;
  }
  const doneGoals = dailyGoals.filter((goal) => goal.isDone).length;
  const todayCheckIns = new Set(
    checkIns.filter((row) => row.dayKey === opts.dayKey).map((row) => row.habitId),
  );

  const lines =
    opts.period === 'day'
      ? [
          `💰 Daromad: ${formatMoney(income)}`,
          `💸 Xarajat: ${formatMoney(expense)}`,
          `💵 Farq: ${formatMoney(income - expense)}`,
          `🎯 Maqsadlar: ${doneGoals}/${dailyGoals.length}`,
          `🔥 Odatlar: ${todayCheckIns.size}/${habits.length}`,
        ]
      : [
          `Daromad: ${formatMoney(income)}`,
          `Xarajat: ${formatMoney(expense)}`,
          `Jamg‘arma: ${formatMoney(income - expense)}`,
          `Maqsadlar: ${doneGoals}/${dailyGoals.length}`,
        ];

  return formatTelegramNotification({
    type: periodType(opts.period),
    title: periodTitle(opts.period, Boolean(opts.evening)),
    message: lines.join('\n'),
    accountType: 'PERSONAL',
    accountId: opts.workspaceId,
    ctaKind: TelegramCtaKind.SUMMARY,
    ctaPath: opts.period === 'day' ? TELEGRAM_APP_PATHS.personalDashboard : TELEGRAM_APP_PATHS.personalAnalytics,
  });
}

export async function buildBusinessSummary(opts: {
  storeId: string;
  storeName: string;
  businessType?: string | null;
  dayKey: string;
  period: SummaryPeriod;
  evening?: boolean;
}): Promise<ReturnType<typeof formatTelegramNotification> | null> {
  const days = opts.period === 'week' ? 7 : opts.period === 'month' ? 30 : 1;
  const startKey = addZonedDays(opts.dayKey, 1 - days);
  const { start } = zonedDayRange(startKey);
  const { end } = zonedDayRange(opts.dayKey);

  const [sales, expenses, customers] = await Promise.all([
    prisma.sale.findMany({
      where: {
        storeId: opts.storeId,
        status: SaleStatus.ACTIVE,
        saleDate: { gte: start, lt: end },
      },
      select: { totalSalePrice: true, items: { select: { quantity: true } } },
    }),
    prisma.expense.findMany({
      where: {
        storeId: opts.storeId,
        status: ExpenseStatus.ACTIVE,
        expenseDate: { gte: start, lt: end },
      },
      select: { amount: true },
    }),
    prisma.customer.count({
      where: { storeId: opts.storeId, createdAt: { gte: start, lt: end } },
    }),
  ]);

  const count = sales.length;
  const revenue = sales.reduce((sum, sale) => sum + fromDbMoney(sale.totalSalePrice), 0);
  const units = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
    0,
  );
  const expenseTotal = expenses.reduce((sum, row) => sum + fromDbMoney(row.amount), 0);

  const lines =
    opts.period === 'day'
      ? [
          `🛒 Sotuvlar: ${count} ta`,
          `💰 Tushum: ${formatMoney(revenue)}`,
          `📦 Sotilgan mahsulotlar: ${units} ta`,
          `👥 Yangi mijozlar: ${customers} ta`,
        ]
      : [
          `Sotuvlar: ${count} ta`,
          `Tushum: ${formatMoney(revenue)}`,
          `Xarajatlar: ${formatMoney(expenseTotal)}`,
          `Foyda/Zarar: ${formatMoney(revenue - expenseTotal)}`,
        ];

  return formatTelegramNotification({
    type: periodType(opts.period),
    title: periodTitle(opts.period, Boolean(opts.evening)),
    message: lines.join('\n'),
    accountType: 'BUSINESS',
    accountId: opts.storeId,
    accountName: opts.storeName,
    businessType: opts.businessType,
    ctaKind: TelegramCtaKind.SUMMARY,
    ctaPath: opts.period === 'day' ? TELEGRAM_APP_PATHS.dashboard : TELEGRAM_APP_PATHS.reports,
  });
}

export async function personalWorkspacesForIdentity(identityId: string) {
  return prisma.workspaceMembership.findMany({
    where: { identityId, workspace: { type: WorkspaceType.PERSONAL } },
    select: { workspaceId: true, workspace: { select: { name: true } } },
  });
}

export async function businessStoresForIdentity(identityId: string) {
  const users = await prisma.user.findMany({
    where: {
      identityId,
      deletedAt: null,
      isActive: true,
      store: { isActive: true },
    },
    select: { storeId: true, store: { select: { id: true, name: true, businessType: true } } },
  });
  const unique = new Map<string, { id: string; name: string; businessType: string }>();
  for (const user of users) {
    if (user.store) unique.set(user.store.id, user.store);
  }
  return [...unique.values()];
}
