import {
  ExpenseStatus,
  PersonalEntryType,
  WorkspaceStatus,
  WorkspaceType,
  savingsRatePercent,
  utcYearMonth,
  type PersonalAnalyticsCategoryRow,
  type PersonalAnalyticsMonthRow,
  type PersonalAnalyticsResponse,
  type PersonalAnalyticsTotals,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { fromDbMoney } from '../../../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';
import { ensurePersonalLedger } from '../ledger/personal-ledger.service.js';

const MIN_MONTHS = 1;
const MAX_MONTHS = 12;
const DEFAULT_MONTHS = 1;

function clampMonths(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_MONTHS;
  return Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, Math.trunc(value)));
}

function monthWindow(count: number, now = new Date()) {
  const months: { key: string; start: Date; end: Date }[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    months.push({ key: utcYearMonth(start), start, end });
  }
  return months;
}

function emptyTotals(): PersonalAnalyticsTotals {
  return { incomeSom: 0, expenseSom: 0, netSom: 0, savingsRatePercent: null };
}

function toTotals(incomeSom: number, expenseSom: number): PersonalAnalyticsTotals {
  return {
    incomeSom,
    expenseSom,
    netSom: incomeSom - expenseSom,
    savingsRatePercent: savingsRatePercent(incomeSom, expenseSom),
  };
}

async function assertPersonalWorkspace(workspaceId: string, db: PrismaClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

export async function getPersonalAnalytics(
  workspaceId: string,
  monthsInput: number | undefined,
  db: PrismaClient = defaultPrisma,
  now = new Date(),
): Promise<PersonalAnalyticsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  await ensurePersonalLedger(workspaceId, db);

  const months = clampMonths(monthsInput);
  const window = monthWindow(months, now);
  const periodStart = window[0]?.start ?? now;
  const periodEnd = window[window.length - 1]?.end ?? now;
  const previousAnchor = new Date(periodStart.getTime() - 1);
  const previousWindow = monthWindow(months, previousAnchor);
  const previousStart = previousWindow[0]?.start ?? periodStart;

  const rows = await db.personalEntry.findMany({
    where: {
      workspaceId,
      status: ExpenseStatus.ACTIVE,
      type: { in: [PersonalEntryType.INCOME, PersonalEntryType.EXPENSE] },
      occurredAt: { gte: previousStart, lte: periodEnd },
    },
    select: {
      type: true,
      amount: true,
      occurredAt: true,
      categoryId: true,
      category: { select: { id: true, name: true, kind: true } },
    },
  });

  const monthlyMap = new Map<string, { incomeSom: number; expenseSom: number }>();
  for (const month of window) {
    monthlyMap.set(month.key, { incomeSom: 0, expenseSom: 0 });
  }

  let periodIncome = 0;
  let periodExpense = 0;
  let previousIncome = 0;
  let previousExpense = 0;
  const categoryMap = new Map<string, PersonalAnalyticsCategoryRow>();

  for (const row of rows) {
    const amount = fromDbMoney(row.amount);
    const inSelected = row.occurredAt.getTime() >= periodStart.getTime();
    if (row.type === PersonalEntryType.INCOME) {
      if (inSelected) periodIncome += amount;
      else previousIncome += amount;
    } else if (row.type === PersonalEntryType.EXPENSE) {
      if (inSelected) periodExpense += amount;
      else previousExpense += amount;
    }

    if (!inSelected) continue;

    const key = utcYearMonth(row.occurredAt);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      if (row.type === PersonalEntryType.INCOME) bucket.incomeSom += amount;
      else if (row.type === PersonalEntryType.EXPENSE) bucket.expenseSom += amount;
    }

    const existing = categoryMap.get(row.categoryId);
    if (existing) {
      existing.amountSom += amount;
    } else {
      categoryMap.set(row.categoryId, {
        categoryId: row.category.id,
        name: row.category.name,
        kind: row.category.kind,
        type: row.type,
        amountSom: amount,
      });
    }
  }

  const monthly: PersonalAnalyticsMonthRow[] = window.map((month) => {
    const bucket = monthlyMap.get(month.key) ?? { incomeSom: 0, expenseSom: 0 };
    return {
      yearMonth: month.key,
      incomeSom: bucket.incomeSom,
      expenseSom: bucket.expenseSom,
      netSom: bucket.incomeSom - bucket.expenseSom,
      savingsRatePercent: savingsRatePercent(bucket.incomeSom, bucket.expenseSom),
    };
  });

  const byCategory = [...categoryMap.values()].sort(
    (a, b) => b.amountSom - a.amountSom || a.name.localeCompare(b.name),
  );
  const totals = toTotals(periodIncome, periodExpense);
  const previous = toTotals(previousIncome, previousExpense);

  return {
    months,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    ...totals,
    previous: previous.incomeSom === 0 && previous.expenseSom === 0 ? emptyTotals() : previous,
    byCategory,
    monthly,
  };
}
