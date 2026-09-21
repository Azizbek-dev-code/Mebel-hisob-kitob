import { formatMoney, TelegramAutoMessageAccountType } from '@furniture-erp/shared';
import { ExpenseStatus, GrowthTodoStatus, PersonalEntryType, SaleStatus } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { fromDbMoney } from '../../lib/money-mapper.js';
import { getPersonalSummary } from '../personal-finance/ledger/personal-ledger.service.js';
import {
  listPersonalBudgets,
  listPersonalSavingGoals,
} from '../personal-finance/planning/personal-planning.service.js';
import { getFocusStats } from '../personal-finance/growth/personal-growth-focus.service.js';
import { getStoreDebtSummary } from '../../services/customer-catalogue.service.js';
import { summarizeInventory } from '../../repositories/inventory.repository.js';
import { assertAutoMessageResultKeys } from './telegram.auto-message.catalog.js';
import { addZonedDays, zonedDayRange } from './telegram.timezone.js';

export type AutoMessagePeriod = 'day' | 'week' | 'month' | 'custom';

export type ResolvedAutoMessageResult = {
  key: string;
  label: string;
  rawValue: number | null;
  formatted: string;
};

function periodDays(period: AutoMessagePeriod): number {
  if (period === 'week') return 7;
  if (period === 'month') return 30;
  return 1;
}

function money(value: number): string {
  return formatMoney(value);
}

/**
 * Resolve selected result keys with real Personal/Business providers.
 * Cross-context keys are rejected — Personal never queries Business stores and vice versa.
 */
export async function resolveAutoMessageResults(opts: {
  accountType: TelegramAutoMessageAccountType | string;
  resultKeys: string[];
  dayKey: string;
  period?: AutoMessagePeriod;
  /** PERSONAL workspace id */
  workspaceId?: string;
  identityId?: string;
  /** BUSINESS store id */
  storeId?: string;
}): Promise<ResolvedAutoMessageResult[]> {
  const validation = assertAutoMessageResultKeys(opts.accountType, opts.resultKeys);
  if (!validation.ok) {
    throw new Error(`Invalid result keys for ${opts.accountType}: ${validation.invalid.join(', ')}`);
  }

  if (opts.accountType === TelegramAutoMessageAccountType.PERSONAL) {
    if (!opts.workspaceId) throw new Error('Personal Auto Message requires workspaceId');
    return resolvePersonalResults(opts.workspaceId, opts.identityId, opts.resultKeys, opts.dayKey, opts.period ?? 'day');
  }

  if (!opts.storeId) throw new Error('Business Auto Message requires storeId');
  return resolveBusinessResults(opts.storeId, opts.resultKeys, opts.dayKey, opts.period ?? 'day');
}

async function resolvePersonalResults(
  workspaceId: string,
  identityId: string | undefined,
  keys: string[],
  dayKey: string,
  period: AutoMessagePeriod,
): Promise<ResolvedAutoMessageResult[]> {
  const days = periodDays(period);
  const startKey = addZonedDays(dayKey, 1 - days);
  const { start } = zonedDayRange(startKey);
  const { end } = zonedDayRange(dayKey);

  const [summary, entries, budgets, goals, habits, checkIns, todos, focus] = await Promise.all([
    keys.some((k) => ['balance'].includes(k)) ? getPersonalSummary(workspaceId) : null,
    keys.some((k) => ['income', 'expense', 'remaining'].includes(k))
      ? prisma.personalEntry.findMany({
          where: {
            workspaceId,
            status: ExpenseStatus.ACTIVE,
            occurredAt: { gte: start, lt: end },
          },
          select: { type: true, amount: true },
        })
      : [],
    keys.some((k) => ['budget', 'budget_usage'].includes(k))
      ? listPersonalBudgets(workspaceId)
      : [],
    keys.some((k) => ['goals', 'goal_progress'].includes(k))
      ? listPersonalSavingGoals(workspaceId)
      : [],
    keys.some((k) => ['habits', 'habit_completion'].includes(k))
      ? prisma.growthHabit.findMany({
          where: { workspaceId, isArchived: false },
          select: { id: true },
        })
      : [],
    keys.some((k) => ['habit_completion'].includes(k))
      ? prisma.growthHabitCheckIn.findMany({
          where: { workspaceId, dayKey, status: 'COMPLETED' },
          select: { habitId: true },
        })
      : [],
    keys.some((k) => ['tasks', 'completed_tasks'].includes(k))
      ? prisma.growthTodo.findMany({
          where: {
            workspaceId,
            status: { not: GrowthTodoStatus.CANCELLED },
            OR: [{ dueAt: { gte: start, lt: end } }, { createdAt: { gte: start, lt: end } }],
          },
          select: { status: true },
        })
      : [],
    keys.some((k) => ['focus_time'].includes(k)) && identityId
      ? getFocusStats(workspaceId, identityId)
      : null,
  ]);

  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    const amount = fromDbMoney(entry.amount);
    if (entry.type === PersonalEntryType.INCOME) income += amount;
    else if (entry.type === PersonalEntryType.EXPENSE) expense += amount;
  }

  const activeBudgets = budgets.filter((b) => b.isActive);
  const budgetLimit = activeBudgets.reduce((sum, b) => sum + b.limitSom, 0);
  const budgetSpent = activeBudgets.reduce((sum, b) => sum + b.spentSom, 0);
  const budgetUsage =
    budgetLimit > 0 ? Math.round((budgetSpent / budgetLimit) * 1000) / 10 : 0;

  const goalProgress =
    goals.length > 0
      ? Math.round(
          (goals.reduce((sum, g) => {
            const pct = g.targetSom > 0 ? (g.savedSom / g.targetSom) * 100 : 0;
            return sum + Math.min(100, pct);
          }, 0) /
            goals.length) *
            10,
        ) / 10
      : 0;

  const completedTodos = todos.filter((t) => t.status === GrowthTodoStatus.DONE).length;
  const habitDone = new Set(checkIns.map((c) => c.habitId)).size;

  const out: ResolvedAutoMessageResult[] = [];
  for (const key of keys) {
    switch (key) {
      case 'balance':
        out.push({
          key,
          label: 'Balance',
          rawValue: summary?.totalBalanceSom ?? 0,
          formatted: `💰 Balance: ${money(summary?.totalBalanceSom ?? 0)}`,
        });
        break;
      case 'income':
        out.push({
          key,
          label: 'Income',
          rawValue: income,
          formatted: `📈 Income: ${money(income)}`,
        });
        break;
      case 'expense':
        out.push({
          key,
          label: 'Expense',
          rawValue: expense,
          formatted: `📉 Expense: ${money(expense)}`,
        });
        break;
      case 'remaining':
        out.push({
          key,
          label: 'Remaining',
          rawValue: income - expense,
          formatted: `💵 Remaining: ${money(income - expense)}`,
        });
        break;
      case 'budget':
        out.push({
          key,
          label: 'Budget',
          rawValue: budgetLimit,
          formatted: `📦 Budget: ${money(budgetLimit)}`,
        });
        break;
      case 'budget_usage':
        out.push({
          key,
          label: 'Budget Usage',
          rawValue: budgetUsage,
          formatted: `📊 Budget usage: ${budgetUsage}%`,
        });
        break;
      case 'goals':
        out.push({
          key,
          label: 'Goals',
          rawValue: goals.length,
          formatted: `🎯 Goals: ${goals.length} ta`,
        });
        break;
      case 'goal_progress':
        out.push({
          key,
          label: 'Goal Progress',
          rawValue: goalProgress,
          formatted: `🎯 Goal progress: ${goalProgress}%`,
        });
        break;
      case 'tasks':
        out.push({
          key,
          label: 'Tasks',
          rawValue: todos.length,
          formatted: `✅ Tasks: ${todos.length} ta`,
        });
        break;
      case 'completed_tasks':
        out.push({
          key,
          label: 'Completed Tasks',
          rawValue: completedTodos,
          formatted: `✅ Completed: ${completedTodos}/${todos.length}`,
        });
        break;
      case 'habits':
        out.push({
          key,
          label: 'Habits',
          rawValue: habits.length,
          formatted: `🔥 Habits: ${habits.length} ta`,
        });
        break;
      case 'habit_completion':
        out.push({
          key,
          label: 'Habit Completion',
          rawValue: habitDone,
          formatted: `🔥 Habits done: ${habitDone}/${habits.length}`,
        });
        break;
      case 'focus_time':
        out.push({
          key,
          label: 'Focus Time',
          rawValue: focus?.todayMinutes ?? 0,
          formatted: `⏱ Focus: ${focus?.todayMinutes ?? 0} daqiqa`,
        });
        break;
      default:
        break;
    }
  }
  return out;
}

async function resolveBusinessResults(
  storeId: string,
  keys: string[],
  dayKey: string,
  period: AutoMessagePeriod,
): Promise<ResolvedAutoMessageResult[]> {
  const days = periodDays(period);
  const startKey = addZonedDays(dayKey, 1 - days);
  const { start } = zonedDayRange(startKey);
  const { end } = zonedDayRange(dayKey);

  const [sales, expenses, customers, debt, inventory, workers] = await Promise.all([
    keys.some((k) => ['sales', 'revenue', 'profit'].includes(k))
      ? prisma.sale.findMany({
          where: {
            storeId,
            status: SaleStatus.ACTIVE,
            saleDate: { gte: start, lt: end },
          },
          select: { totalSalePrice: true },
        })
      : [],
    keys.some((k) => ['expenses', 'profit'].includes(k))
      ? prisma.expense.findMany({
          where: {
            storeId,
            status: ExpenseStatus.ACTIVE,
            expenseDate: { gte: start, lt: end },
          },
          select: { amount: true },
        })
      : [],
    keys.includes('customers')
      ? prisma.customer.count({
          where: { storeId, createdAt: { gte: start, lt: end } },
        })
      : 0,
    keys.includes('debt') ? getStoreDebtSummary(storeId) : null,
    keys.some((k) => ['inventory', 'products'].includes(k))
      ? summarizeInventory(storeId)
      : null,
    keys.includes('workers')
      ? prisma.user.count({
          where: { storeId, isActive: true, deletedAt: null },
        })
      : 0,
  ]);

  const revenue = sales.reduce((sum, s) => sum + fromDbMoney(s.totalSalePrice), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + fromDbMoney(e.amount), 0);
  const outstanding =
    debt && typeof debt === 'object' && 'totalOutstanding' in debt
      ? Number(debt.totalOutstanding ?? 0)
      : 0;

  const out: ResolvedAutoMessageResult[] = [];
  for (const key of keys) {
    switch (key) {
      case 'sales':
        out.push({
          key,
          label: 'Sales',
          rawValue: sales.length,
          formatted: `🛒 Sales: ${sales.length} ta`,
        });
        break;
      case 'revenue':
        out.push({
          key,
          label: 'Revenue',
          rawValue: revenue,
          formatted: `💰 Revenue: ${money(revenue)}`,
        });
        break;
      case 'expenses':
        out.push({
          key,
          label: 'Expenses',
          rawValue: expenseTotal,
          formatted: `💸 Expenses: ${money(expenseTotal)}`,
        });
        break;
      case 'profit':
        out.push({
          key,
          label: 'Profit',
          rawValue: revenue - expenseTotal,
          formatted: `📈 Profit: ${money(revenue - expenseTotal)}`,
        });
        break;
      case 'debt':
        out.push({
          key,
          label: 'Debt',
          rawValue: outstanding,
          formatted: `💳 Debt: ${money(outstanding)}`,
        });
        break;
      case 'inventory':
        out.push({
          key,
          label: 'Inventory',
          rawValue: inventory?.totalUnits ?? 0,
          formatted: `📦 Inventory: ${inventory?.totalProducts ?? 0} mahsulot, ${inventory?.totalUnits ?? 0} unit, past zaxira: ${inventory?.lowStockCount ?? 0}`,
        });
        break;
      case 'customers':
        out.push({
          key,
          label: 'Customers',
          rawValue: customers,
          formatted: `👥 Customers: ${customers} ta`,
        });
        break;
      case 'products':
        out.push({
          key,
          label: 'Products',
          rawValue: inventory?.totalProducts ?? 0,
          formatted: `📦 Products: ${inventory?.totalProducts ?? 0} ta`,
        });
        break;
      case 'workers':
        out.push({
          key,
          label: 'Workers',
          rawValue: workers,
          formatted: `👷 Workers: ${workers} ta`,
        });
        break;
      default:
        break;
    }
  }
  return out;
}

/** Sample values for admin Preview only — never used by production scheduler. */
export function previewSampleResults(
  accountType: TelegramAutoMessageAccountType | string,
  keys: string[],
): ResolvedAutoMessageResult[] {
  const personalSamples: Record<string, ResolvedAutoMessageResult> = {
    balance: { key: 'balance', label: 'Balance', rawValue: 12_500_000, formatted: '💰 Balance: 12 500 000 so‘m' },
    income: { key: 'income', label: 'Income', rawValue: 2_000_000, formatted: '📈 Income: 2 000 000 so‘m' },
    expense: { key: 'expense', label: 'Expense', rawValue: 750_000, formatted: '📉 Expense: 750 000 so‘m' },
    remaining: { key: 'remaining', label: 'Remaining', rawValue: 1_250_000, formatted: '💵 Remaining: 1 250 000 so‘m' },
    budget: { key: 'budget', label: 'Budget', rawValue: 3_000_000, formatted: '📦 Budget: 3 000 000 so‘m' },
    budget_usage: { key: 'budget_usage', label: 'Budget Usage', rawValue: 42, formatted: '📊 Budget usage: 42%' },
    goals: { key: 'goals', label: 'Goals', rawValue: 3, formatted: '🎯 Goals: 3 ta' },
    goal_progress: { key: 'goal_progress', label: 'Goal Progress', rawValue: 55, formatted: '🎯 Goal progress: 55%' },
    tasks: { key: 'tasks', label: 'Tasks', rawValue: 5, formatted: '✅ Tasks: 5 ta' },
    completed_tasks: { key: 'completed_tasks', label: 'Completed Tasks', rawValue: 2, formatted: '✅ Completed: 2/5' },
    habits: { key: 'habits', label: 'Habits', rawValue: 4, formatted: '🔥 Habits: 4 ta' },
    habit_completion: { key: 'habit_completion', label: 'Habit Completion', rawValue: 2, formatted: '🔥 Habits done: 2/4' },
    focus_time: { key: 'focus_time', label: 'Focus Time', rawValue: 45, formatted: '⏱ Focus: 45 daqiqa' },
  };
  const businessSamples: Record<string, ResolvedAutoMessageResult> = {
    sales: { key: 'sales', label: 'Sales', rawValue: 8, formatted: '🛒 Sales: 8 ta' },
    revenue: { key: 'revenue', label: 'Revenue', rawValue: 15_000_000, formatted: '💰 Revenue: 15 000 000 so‘m' },
    expenses: { key: 'expenses', label: 'Expenses', rawValue: 4_200_000, formatted: '💸 Expenses: 4 200 000 so‘m' },
    profit: { key: 'profit', label: 'Profit', rawValue: 10_800_000, formatted: '📈 Profit: 10 800 000 so‘m' },
    debt: { key: 'debt', label: 'Debt', rawValue: 3_500_000, formatted: '💳 Debt: 3 500 000 so‘m' },
    inventory: {
      key: 'inventory',
      label: 'Inventory',
      rawValue: 120,
      formatted: '📦 Inventory: 40 mahsulot, 120 unit, past zaxira: 3',
    },
    customers: { key: 'customers', label: 'Customers', rawValue: 2, formatted: '👥 Customers: 2 ta' },
    products: { key: 'products', label: 'Products', rawValue: 40, formatted: '📦 Products: 40 ta' },
    workers: { key: 'workers', label: 'Workers', rawValue: 6, formatted: '👷 Workers: 6 ta' },
  };
  const table =
    accountType === TelegramAutoMessageAccountType.BUSINESS ? businessSamples : personalSamples;
  return keys.map(
    (key) =>
      table[key] ?? {
        key,
        label: key,
        rawValue: null,
        formatted: `${key}: —`,
      },
  );
}
