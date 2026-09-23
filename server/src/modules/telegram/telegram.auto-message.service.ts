import {
  DEFAULT_TELEGRAM_TIMEZONE,
  TelegramAutoMessageAccountType,
  TelegramAutoMessageRecurrence,
  TelegramAutomationKind,
  hourInTimeZone,
  toWeekKey,
  type TelegramAutoMessageDto,
  type TelegramAutoMessagePreviewRequest,
  type TelegramAutoMessagePreviewResponse,
  type TelegramAutoMessageTemplateDto,
  type TelegramAutoMessageTestSendResponse,
  type TelegramAutoMessageThresholdConfig,
  type UpsertTelegramAutoMessageRequest,
} from '@furniture-erp/shared';
import {
  TelegramAutoMessageExecutionStatus,
  Prisma,
  type TelegramAutoMessage as TelegramAutoMessageRow,
} from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { isWorkspaceNotifyEnabled } from './telegram.account-pref.service.js';
import { assertAutoMessageResultKeys, getAutoMessageResultCatalog } from './telegram.auto-message.catalog.js';
import {
  computeNextRunAt,
  formatNextRunLabel,
} from './telegram.auto-message.next-run.js';
import {
  previewSampleResults,
  resolveAutoMessageResults,
  type AutoMessagePeriod,
} from './telegram.auto-message.resolver.js';
import { composeAutoMessageText } from './telegram.auto-message.template.js';
import { getPublicAppUrl } from './telegram.config.js';
import { findActiveByIdentity } from './telegram.connection.service.js';
import { tryDeliverTelegram } from './telegram.delivery.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import {
  businessStoresForIdentity,
  personalWorkspacesForIdentity,
} from './telegram.summary.service.js';
import {
  addZonedDays,
  isoWeekdayFromDayKey,
  lastDayOfMonth,
  minuteInTimeZone,
  zonedDayKey,
} from './telegram.timezone.js';
import type { TelegramInlineKeyboardMarkup } from './telegram.types.js';

function hourInTimeZoneSafe(date: Date, timeZone: string): number {
  try {
    return hourInTimeZone(date, timeZone);
  } catch {
    return date.getUTCHours();
  }
}

function parseResultKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function parseThreshold(raw: unknown): TelegramAutoMessageThresholdConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.resultKey !== 'string' || !row.resultKey.trim()) return null;
  return {
    resultKey: row.resultKey.trim(),
    high: typeof row.high === 'number' ? row.high : null,
    medium: typeof row.medium === 'number' ? row.medium : null,
    low: typeof row.low === 'number' ? row.low : null,
    highMessage: typeof row.highMessage === 'string' ? row.highMessage : null,
    mediumMessage: typeof row.mediumMessage === 'string' ? row.mediumMessage : null,
    lowMessage: typeof row.lowMessage === 'string' ? row.lowMessage : null,
  };
}

function startDateKey(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toDto(row: TelegramAutoMessageRow, now = new Date()): TelegramAutoMessageDto {
  const timezone = row.timezone || DEFAULT_TELEGRAM_TIMEZONE;
  const nextRunAt = row.enabled
    ? computeNextRunAt(
        {
          enabled: row.enabled,
          recurrence: row.recurrence,
          hour: row.hour,
          minute: row.minute,
          timezone,
          weekday: row.weekday,
          monthDay: row.monthDay,
          startDate: row.startDate,
        },
        now,
      )
    : null;

  return {
    id: row.id,
    title: row.title,
    accountType: row.accountType as TelegramAutoMessageAccountType,
    enabled: row.enabled,
    recurrence: row.recurrence as TelegramAutoMessageRecurrence,
    hour: row.hour,
    minute: row.minute,
    timezone,
    weekday: row.weekday,
    monthDay: row.monthDay,
    startDate: startDateKey(row.startDate),
    messageBody: row.messageBody,
    resultKeys: parseResultKeys(row.resultKeys),
    thresholdConfig: parseThreshold(row.thresholdConfig),
    ctaEnabled: row.ctaEnabled,
    ctaLabel: row.ctaLabel,
    ctaPath: row.ctaPath,
    legacyKind: row.legacyKind,
    nextRunAt,
    nextRunLabel: formatNextRunLabel(nextRunAt, timezone, now),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function periodForRecurrence(recurrence: TelegramAutoMessageRecurrence): AutoMessagePeriod {
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_WEEK) return 'week';
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_MONTH) return 'month';
  return 'day';
}

function periodKeyFor(
  recurrence: TelegramAutoMessageRecurrence,
  dayKey: string,
  startDate: string | null,
): string {
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_WEEK) return toWeekKey(dayKey);
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_MONTH) return dayKey.slice(0, 7);
  if (recurrence === TelegramAutoMessageRecurrence.EVERY_15_DAYS) {
    return `15d:${dayKey}`;
  }
  if (recurrence === TelegramAutoMessageRecurrence.ONE_TIME) {
    return `once:${startDate || dayKey}`;
  }
  return dayKey;
}

function daysBetween(a: string, b: string): number {
  const am = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const bm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!am || !bm) return Number.NaN;
  const aUtc = Date.UTC(Number(am[1]), Number(am[2]) - 1, Number(am[3]));
  const bUtc = Date.UTC(Number(bm[1]), Number(bm[2]) - 1, Number(bm[3]));
  return Math.round((bUtc - aUtc) / 86_400_000);
}

export function autoMessageIsDue(
  row: {
    recurrence: TelegramAutoMessageRecurrence | string;
    hour: number;
    minute: number;
    timezone: string;
    weekday: number | null;
    monthDay: number | null;
    startDate: Date | null;
  },
  now: Date,
): { due: boolean; dayKey: string; periodKey: string } {
  const timezone = row.timezone || DEFAULT_TELEGRAM_TIMEZONE;
  const dayKey = zonedDayKey(now, timezone);
  const startKey = startDateKey(row.startDate);
  const periodKey = periodKeyFor(
    row.recurrence as TelegramAutoMessageRecurrence,
    dayKey,
    startKey,
  );

  const hour = hourInTimeZoneSafe(now, timezone);
  const minute = minuteInTimeZone(now, timezone);
  if (hour !== row.hour || minute !== row.minute) {
    return { due: false, dayKey, periodKey };
  }

  const recurrence = row.recurrence as TelegramAutoMessageRecurrence;

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_WEEK) {
    const weekday = row.weekday && row.weekday >= 1 && row.weekday <= 7 ? row.weekday : 1;
    if (isoWeekdayFromDayKey(dayKey) !== weekday) return { due: false, dayKey, periodKey };
  }

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_MONTH) {
    const parts = dayKey.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const wanted = Math.min(
      row.monthDay && row.monthDay >= 1 && row.monthDay <= 31 ? row.monthDay : 1,
      lastDayOfMonth(year, month),
    );
    if (day !== wanted) return { due: false, dayKey, periodKey };
  }

  if (recurrence === TelegramAutoMessageRecurrence.EVERY_15_DAYS) {
    if (!startKey) return { due: false, dayKey, periodKey };
    const delta = daysBetween(startKey, dayKey);
    if (!Number.isFinite(delta) || delta < 0 || delta % 15 !== 0) {
      return { due: false, dayKey, periodKey };
    }
  }

  if (recurrence === TelegramAutoMessageRecurrence.ONE_TIME) {
    if (!startKey || startKey !== dayKey) return { due: false, dayKey, periodKey };
  }

  return { due: true, dayKey, periodKey };
}

function validateUpsert(body: UpsertTelegramAutoMessageRequest): void {
  const title = body.title?.trim();
  if (!title || title.length < 2) {
    throw ApiError.validation('Title kerak', [{ field: 'title', message: 'Kamida 2 belgi' }]);
  }
  if (
    body.accountType !== TelegramAutoMessageAccountType.PERSONAL &&
    body.accountType !== TelegramAutoMessageAccountType.BUSINESS
  ) {
    throw ApiError.validation('Account type noto‘g‘ri', [
      { field: 'accountType', message: 'PERSONAL yoki BUSINESS' },
    ]);
  }
  if (!Object.values(TelegramAutoMessageRecurrence).includes(body.recurrence)) {
    throw ApiError.validation('Recurrence noto‘g‘ri', [{ field: 'recurrence', message: 'Noto‘g‘ri qiymat' }]);
  }
  if (!Number.isInteger(body.hour) || body.hour < 0 || body.hour > 23) {
    throw ApiError.validation('Soat 0–23 oralig‘ida', [{ field: 'hour', message: '0–23' }]);
  }
  if (!Number.isInteger(body.minute) || body.minute < 0 || body.minute > 59) {
    throw ApiError.validation('Daqiqa 0–59 oralig‘ida', [{ field: 'minute', message: '0–59' }]);
  }

  if (body.recurrence === TelegramAutoMessageRecurrence.EVERY_WEEK) {
    if (!body.weekday || body.weekday < 1 || body.weekday > 7) {
      throw ApiError.validation('Hafta kuni 1–7', [{ field: 'weekday', message: '1=Du … 7=Ya' }]);
    }
  }
  if (body.recurrence === TelegramAutoMessageRecurrence.EVERY_MONTH) {
    if (!body.monthDay || body.monthDay < 1 || body.monthDay > 31) {
      throw ApiError.validation('Oy kuni 1–31', [{ field: 'monthDay', message: '1–31' }]);
    }
  }
  if (
    body.recurrence === TelegramAutoMessageRecurrence.EVERY_15_DAYS ||
    body.recurrence === TelegramAutoMessageRecurrence.ONE_TIME
  ) {
    if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      throw ApiError.validation('Start date kerak (YYYY-MM-DD)', [
        { field: 'startDate', message: 'YYYY-MM-DD' },
      ]);
    }
  }

  const keys = Array.isArray(body.resultKeys) ? body.resultKeys : [];
  const check = assertAutoMessageResultKeys(body.accountType, keys);
  if (!check.ok) {
    throw ApiError.validation('Natija kalitlari account type bilan mos emas', [
      { field: 'resultKeys', message: `Noto‘g‘ri: ${check.invalid.join(', ')}` },
    ]);
  }

  if (body.thresholdConfig?.resultKey) {
    if (!keys.includes(body.thresholdConfig.resultKey)) {
      throw ApiError.validation('Threshold result tanlangan natijalar ichida bo‘lishi kerak', [
        { field: 'thresholdConfig.resultKey', message: 'resultKeys ichida bo‘lsin' },
      ]);
    }
    if (!assertAutoMessageResultKeys(body.accountType, [body.thresholdConfig.resultKey]).ok) {
      throw ApiError.validation('Threshold result account type bilan mos emas', [
        { field: 'thresholdConfig.resultKey', message: 'Noto‘g‘ri key' },
      ]);
    }
  }

  if (body.ctaEnabled) {
    if (!body.ctaLabel?.trim()) {
      throw ApiError.validation('CTA matni kerak', [{ field: 'ctaLabel', message: 'Majburiy' }]);
    }
    if (!body.ctaPath?.trim() || !body.ctaPath.startsWith('/')) {
      throw ApiError.validation('CTA path / bilan boshlanishi kerak', [
        { field: 'ctaPath', message: 'Masalan /personal/dashboard' },
      ]);
    }
  }
}

function parseStartDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Optional form templates — never scheduled by themselves. */
export const AUTO_MESSAGE_TEMPLATES: TelegramAutoMessageTemplateDto[] = [
  {
    id: 'personal_morning',
    title: 'Xayrli tong',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 8,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['balance', 'income', 'expense'],
    messageBody: 'Assalomu alaykum 👋\n\n{{balance}}\n{{income}}\n{{expense}}\n\nKuningiz barakali o‘tsin!',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'personal_evening',
    title: 'Kechki natija',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 21,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['income', 'expense', 'remaining', 'habit_completion'],
    messageBody: 'Bugungi yakun:\n\n{{income}}\n{{expense}}\n{{remaining}}\n{{habit_completion}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'personal_weekly',
    title: 'Haftalik hisobot',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK,
    hour: 20,
    minute: 0,
    weekday: 7,
    monthDay: null,
    resultKeys: ['income', 'expense', 'remaining', 'goal_progress'],
    messageBody: 'Haftalik natija:\n\n{{income}}\n{{expense}}\n{{remaining}}\n{{goal_progress}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'personal_monthly',
    title: 'Oylik hisobot',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_MONTH,
    hour: 20,
    minute: 0,
    weekday: null,
    monthDay: 1,
    resultKeys: ['balance', 'income', 'expense', 'budget_usage'],
    messageBody: 'Oylik natija:\n\n{{balance}}\n{{income}}\n{{expense}}\n{{budget_usage}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'business_morning',
    title: 'Biznes — tonggi natija',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 8,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'customers'],
    messageBody: 'Bugungi biznes holati:\n\n{{sales}}\n{{revenue}}\n{{customers}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'business_evening',
    title: 'Biznes — kechki natija',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 21,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit'],
    messageBody: 'Bugungi yakun:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'business_weekly',
    title: 'Biznes — haftalik hisobot',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK,
    hour: 20,
    minute: 0,
    weekday: 7,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit', 'debt'],
    messageBody: 'Haftalik biznes:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}\n{{debt}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
  {
    id: 'business_monthly',
    title: 'Biznes — oylik hisobot',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_MONTH,
    hour: 20,
    minute: 0,
    weekday: null,
    monthDay: 1,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit', 'inventory'],
    messageBody: 'Oylik biznes:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}\n{{inventory}}',
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  },
];

const LEGACY_KIND_BY_TEMPLATE: Record<string, string> = {
  personal_morning: TelegramAutomationKind.PERSONAL_MORNING,
  personal_evening: TelegramAutomationKind.PERSONAL_EVENING,
  personal_weekly: TelegramAutomationKind.PERSONAL_WEEKLY,
  personal_monthly: TelegramAutomationKind.PERSONAL_MONTHLY,
  business_morning: TelegramAutomationKind.BUSINESS_MORNING,
  business_evening: TelegramAutomationKind.BUSINESS_EVENING,
  business_weekly: TelegramAutomationKind.BUSINESS_WEEKLY,
  business_monthly: TelegramAutomationKind.BUSINESS_MONTHLY,
};

/**
 * One-time copy from still-enabled legacy TelegramAutomation rows.
 * Does NOT recreate templates admins deleted (legacy is already disabled after migrate).
 * Templates themselves are never auto-scheduled — use AUTO_MESSAGE_TEMPLATES for form fill.
 */
export async function ensureAutoMessagesMigrated(): Promise<void> {
  for (const template of AUTO_MESSAGE_TEMPLATES) {
    const legacyKind = LEGACY_KIND_BY_TEMPLATE[template.id];
    if (!legacyKind) continue;

    const existing = await prisma.telegramAutoMessage.findUnique({
      where: { legacyKind },
    });
    if (existing) continue;

    const legacy = await prisma.telegramAutomation.findUnique({
      where: { kind: legacyKind as never },
    });
    // Only migrate still-enabled legacy rows. Deleted Auto Messages are not recreated.
    if (!legacy?.enabled) continue;

    await prisma.telegramAutoMessage.create({
      data: {
        title: template.title,
        accountType: template.accountType,
        enabled: true,
        recurrence: template.recurrence,
        hour: legacy.hour ?? template.hour,
        minute: legacy.minute ?? template.minute,
        timezone: legacy.timezone || DEFAULT_TELEGRAM_TIMEZONE,
        weekday: legacy.weekday ?? template.weekday,
        monthDay: legacy.monthDay ?? template.monthDay,
        messageBody: legacy.messageTemplate?.trim() || template.messageBody,
        resultKeys: template.resultKeys,
        ctaEnabled: Boolean(legacy.ctaLabel && legacy.ctaPath),
        ctaLabel: legacy.ctaLabel ?? null,
        ctaPath: legacy.ctaPath ?? null,
        legacyKind,
      },
    });

    await prisma.telegramAutomation.update({
      where: { id: legacy.id },
      data: { enabled: false },
    });
  }
}

export function listAutoMessageTemplates(
  accountType?: string,
): TelegramAutoMessageTemplateDto[] {
  if (
    accountType === TelegramAutoMessageAccountType.PERSONAL ||
    accountType === TelegramAutoMessageAccountType.BUSINESS
  ) {
    return AUTO_MESSAGE_TEMPLATES.filter((item) => item.accountType === accountType);
  }
  return AUTO_MESSAGE_TEMPLATES;
}

export async function listAutoMessages(): Promise<TelegramAutoMessageDto[]> {
  await ensureAutoMessagesMigrated();
  const rows = await prisma.telegramAutoMessage.findMany({
    orderBy: [{ accountType: 'asc' }, { createdAt: 'asc' }],
  });
  const now = new Date();
  return rows.map((row) => toDto(row, now));
}

export async function getAutoMessage(id: string): Promise<TelegramAutoMessageDto> {
  const row = await prisma.telegramAutoMessage.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Auto Message topilmadi');
  return toDto(row);
}

export async function createAutoMessage(
  body: UpsertTelegramAutoMessageRequest,
): Promise<TelegramAutoMessageDto> {
  validateUpsert(body);
  const row = await prisma.telegramAutoMessage.create({
    data: {
      title: body.title.trim(),
      accountType: body.accountType,
      enabled: Boolean(body.enabled),
      recurrence: body.recurrence,
      hour: body.hour,
      minute: body.minute,
      timezone: body.timezone?.trim() || DEFAULT_TELEGRAM_TIMEZONE,
      weekday: body.weekday ?? null,
      monthDay: body.monthDay ?? null,
      startDate: parseStartDate(body.startDate),
      messageBody: body.messageBody ?? '',
      resultKeys: body.resultKeys,
      thresholdConfig: body.thresholdConfig
        ? (body.thresholdConfig as unknown as Prisma.InputJsonValue)
        : undefined,
      ctaEnabled: Boolean(body.ctaEnabled),
      ctaLabel: body.ctaLabel?.trim() || null,
      ctaPath: body.ctaPath?.trim() || null,
    },
  });
  return toDto(row);
}

export async function updateAutoMessage(
  id: string,
  body: UpsertTelegramAutoMessageRequest,
): Promise<TelegramAutoMessageDto> {
  validateUpsert(body);
  const existing = await prisma.telegramAutoMessage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Auto Message topilmadi');

  const row = await prisma.telegramAutoMessage.update({
    where: { id },
    data: {
      title: body.title.trim(),
      accountType: body.accountType,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : existing.enabled,
      recurrence: body.recurrence,
      hour: body.hour,
      minute: body.minute,
      timezone: body.timezone?.trim() || existing.timezone,
      weekday: body.weekday ?? null,
      monthDay: body.monthDay ?? null,
      startDate: parseStartDate(body.startDate),
      messageBody: body.messageBody ?? '',
      resultKeys: body.resultKeys,
      thresholdConfig:
        body.thresholdConfig === null
          ? Prisma.DbNull
          : body.thresholdConfig === undefined
            ? undefined
            : (body.thresholdConfig as unknown as Prisma.InputJsonValue),
      ctaEnabled: Boolean(body.ctaEnabled),
      ctaLabel: body.ctaLabel?.trim() || null,
      ctaPath: body.ctaPath?.trim() || null,
    },
  });
  return toDto(row);
}

export async function duplicateAutoMessage(id: string): Promise<TelegramAutoMessageDto> {
  const existing = await prisma.telegramAutoMessage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Auto Message topilmadi');
  const row = await prisma.telegramAutoMessage.create({
    data: {
      title: `${existing.title} (nusxa)`,
      accountType: existing.accountType,
      enabled: false,
      recurrence: existing.recurrence,
      hour: existing.hour,
      minute: existing.minute,
      timezone: existing.timezone,
      weekday: existing.weekday,
      monthDay: existing.monthDay,
      startDate: existing.startDate,
      messageBody: existing.messageBody,
      resultKeys: existing.resultKeys as never,
      thresholdConfig: existing.thresholdConfig as never,
      ctaEnabled: existing.ctaEnabled,
      ctaLabel: existing.ctaLabel,
      ctaPath: existing.ctaPath,
      legacyKind: null,
    },
  });
  return toDto(row);
}

export async function deleteAutoMessage(id: string): Promise<void> {
  const existing = await prisma.telegramAutoMessage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Auto Message topilmadi');
  // Cascade deletes executions; deleted messages are never re-seeded.
  await prisma.telegramAutoMessage.delete({ where: { id } });
}

export function listAutoMessageCatalog(accountType: string) {
  if (
    accountType !== TelegramAutoMessageAccountType.PERSONAL &&
    accountType !== TelegramAutoMessageAccountType.BUSINESS
  ) {
    throw ApiError.validation('Account type noto‘g‘ri', [
      { field: 'accountType', message: 'PERSONAL yoki BUSINESS' },
    ]);
  }
  return getAutoMessageResultCatalog(accountType);
}

function normalizePreviewBody(body: TelegramAutoMessagePreviewRequest): TelegramAutoMessagePreviewRequest {
  return {
    title: body.title,
    accountType: body.accountType,
    messageBody: body.messageBody ?? '',
    resultKeys: Array.isArray(body.resultKeys) ? body.resultKeys : [],
    thresholdConfig: body.thresholdConfig ?? null,
    ctaEnabled: body.ctaEnabled,
    ctaLabel: body.ctaLabel ?? null,
    ctaPath: body.ctaPath ?? null,
  };
}

export function previewAutoMessage(
  body: TelegramAutoMessagePreviewRequest,
): TelegramAutoMessagePreviewResponse {
  const normalized = normalizePreviewBody(body);
  if (
    normalized.accountType !== TelegramAutoMessageAccountType.PERSONAL &&
    normalized.accountType !== TelegramAutoMessageAccountType.BUSINESS
  ) {
    throw ApiError.validation('Account type noto‘g‘ri', [
      { field: 'accountType', message: 'PERSONAL yoki BUSINESS' },
    ]);
  }
  const keys = normalized.resultKeys;
  const check = assertAutoMessageResultKeys(normalized.accountType, keys);
  if (!check.ok) {
    throw ApiError.validation('Natija kalitlari account type bilan mos emas', [
      { field: 'resultKeys', message: `Noto‘g‘ri: ${check.invalid.join(', ')}` },
    ]);
  }
  const results = previewSampleResults(normalized.accountType, keys);
  const composed = composeAutoMessageText({
    title: normalized.title ?? 'Preview',
    messageBody: normalized.messageBody,
    results,
    thresholdConfig: normalized.thresholdConfig,
    previewBanner: true,
  });
  return {
    preview: true,
    text: composed.text,
    unresolvedPlaceholders: composed.unresolvedPlaceholders,
    ctaLabel: normalized.ctaEnabled ? normalized.ctaLabel ?? null : null,
    ctaPath: normalized.ctaEnabled ? normalized.ctaPath ?? null : null,
    thresholdApplied: composed.thresholdApplied,
    thresholdNote: composed.thresholdNote,
  };
}

function buildCtaKeyboard(
  enabled: boolean,
  label: string | null,
  path: string | null,
): TelegramInlineKeyboardMarkup | undefined {
  if (!enabled || !label?.trim() || !path?.trim()) return undefined;
  const base = getPublicAppUrl().replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return { inline_keyboard: [[{ text: label.trim().slice(0, 64), url }]] };
}

async function resolveTestSendResults(
  identityId: string,
  accountType: TelegramAutoMessageAccountType,
  resultKeys: string[],
) {
  const dayKey = zonedDayKey(new Date(), DEFAULT_TELEGRAM_TIMEZONE);
  const period: AutoMessagePeriod = 'day';

  if (accountType === TelegramAutoMessageAccountType.PERSONAL) {
    const memberships = await personalWorkspacesForIdentity(identityId);
    const workspaceId = memberships[0]?.workspaceId;
    if (!workspaceId) {
      return {
        ok: false as const,
        message: 'Personal hisob topilmadi. Avval shaxsiy hisob yarating.',
      };
    }
    const results = await resolveAutoMessageResults({
      accountType,
      resultKeys,
      dayKey,
      period,
      workspaceId,
      identityId,
    });
    return { ok: true as const, results, accountId: workspaceId };
  }

  const stores = await businessStoresForIdentity(identityId);
  const storeId = stores[0]?.id;
  if (!storeId) {
    return {
      ok: false as const,
      message: 'Business hisob topilmadi. Avval biznes hisobiga ulang.',
    };
  }
  const results = await resolveAutoMessageResults({
    accountType,
    resultKeys,
    dayKey,
    period,
    storeId,
  });
  return { ok: true as const, results, accountId: storeId };
}

/**
 * Admin Test Send: uses the same composeAutoMessageText as Preview/Scheduler,
 * but resolves LIVE metrics for the admin's Personal/Business account.
 * Does not create scheduler executions.
 */
export async function testSendAutoMessage(
  identityId: string,
  body: TelegramAutoMessagePreviewRequest,
): Promise<TelegramAutoMessageTestSendResponse> {
  const normalized = normalizePreviewBody(body);
  const connection = await findActiveByIdentity(identityId);
  if (!connection) {
    return {
      sent: false,
      reason: 'not_connected',
      message: 'Telegram akkauntingiz ulanmagan.',
    };
  }

  if (
    normalized.accountType !== TelegramAutoMessageAccountType.PERSONAL &&
    normalized.accountType !== TelegramAutoMessageAccountType.BUSINESS
  ) {
    throw ApiError.validation('Account type noto‘g‘ri', [
      { field: 'accountType', message: 'PERSONAL yoki BUSINESS' },
    ]);
  }

  const keys = normalized.resultKeys;
  const check = assertAutoMessageResultKeys(normalized.accountType, keys);
  if (!check.ok) {
    throw ApiError.validation('Natija kalitlari account type bilan mos emas', [
      { field: 'resultKeys', message: `Noto‘g‘ri: ${check.invalid.join(', ')}` },
    ]);
  }

  const channel =
    normalized.accountType === TelegramAutoMessageAccountType.BUSINESS ? 'business' : 'personal';
  if (channel === 'personal' && !connection.notifyPersonal) {
    return {
      sent: false,
      reason: 'pref_off',
      message: 'Personal Telegram bildirishnomalari o‘chirilgan.',
    };
  }
  if (channel === 'business' && !connection.notifyBusiness) {
    return {
      sent: false,
      reason: 'pref_off',
      message: 'Business Telegram bildirishnomalari o‘chirilgan.',
    };
  }

  const resolved = await resolveTestSendResults(identityId, normalized.accountType, keys);
  if (!resolved.ok) {
    return { sent: false, reason: 'no_account', message: resolved.message };
  }

  const composed = composeAutoMessageText({
    title: normalized.title ?? 'Test',
    messageBody: normalized.messageBody,
    results: resolved.results,
    thresholdConfig: normalized.thresholdConfig,
    previewBanner: false,
  });

  if (composed.unresolvedPlaceholders.length) {
    throw ApiError.validation(
      `Noma’lum placeholder: ${composed.unresolvedPlaceholders.map((k) => `{{${k}}}`).join(', ')}`,
      [{ field: 'messageBody', message: 'Placeholderlarni tekshiring' }],
    );
  }

  const keyboard = buildCtaKeyboard(
    Boolean(normalized.ctaEnabled),
    normalized.ctaLabel ?? null,
    normalized.ctaPath ?? null,
  );

  const delivery = await tryDeliverTelegram({
    identityId,
    channel,
    text: composed.text,
    replyMarkup: keyboard,
    workspaceId: channel === 'personal' ? resolved.accountId : undefined,
    storeId: channel === 'business' ? resolved.accountId : undefined,
    // Admin explicitly requested a test — still require connection + channel master
    // (checked above), but do not require daily-summary preference fields.
    bypassPrefs: true,
  });

  if (!delivery.delivered) {
    logger.warn('Auto Message test send failed', {
      identityId,
      reason: delivery.reason,
      message: sanitizeTelegramLogText(delivery.message ?? ''),
    });
    return {
      sent: false,
      reason: delivery.reason === 'not_connected' ? 'not_connected' : 'send_failed',
      message: delivery.message ?? 'Yuborish muvaffaqiyatsiz.',
    };
  }

  return { sent: true, message: 'Test xabar Telegramga yuborildi.' };
}

/**
 * Claim an execution slot atomically. Returns false if already claimed (idempotent).
 */
export async function claimAutoMessageExecution(opts: {
  autoMessageId: string;
  identityId: string;
  accountId: string;
  periodKey: string;
  status?: TelegramAutoMessageExecutionStatus;
  error?: string | null;
}): Promise<boolean> {
  try {
    await prisma.telegramAutoMessageExecution.create({
      data: {
        autoMessageId: opts.autoMessageId,
        identityId: opts.identityId,
        accountId: opts.accountId,
        periodKey: opts.periodKey,
        status: opts.status ?? TelegramAutoMessageExecutionStatus.SENT,
        error: opts.error ?? null,
      },
    });
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return false;
    }
    throw error;
  }
}

async function markExecutionStatus(opts: {
  autoMessageId: string;
  identityId: string;
  accountId: string;
  periodKey: string;
  status: TelegramAutoMessageExecutionStatus;
  error?: string | null;
}): Promise<void> {
  await prisma.telegramAutoMessageExecution.updateMany({
    where: {
      autoMessageId: opts.autoMessageId,
      identityId: opts.identityId,
      accountId: opts.accountId,
      periodKey: opts.periodKey,
    },
    data: {
      status: opts.status,
      error: opts.error ?? null,
    },
  });
}

async function sendPersonalAutoMessage(
  message: TelegramAutoMessageRow,
  connection: { id: string; identityId: string; notifyPersonal: boolean },
  dayKey: string,
  periodKey: string,
): Promise<number> {
  if (!connection.notifyPersonal) return 0;
  let sent = 0;
  const memberships = await personalWorkspacesForIdentity(connection.identityId);
  const period = periodForRecurrence(message.recurrence as TelegramAutoMessageRecurrence);
  const keys = parseResultKeys(message.resultKeys);

  for (const membership of memberships) {
    if (!(await isWorkspaceNotifyEnabled(connection.id, membership.workspaceId))) continue;

    const claimed = await claimAutoMessageExecution({
      autoMessageId: message.id,
      identityId: connection.identityId,
      accountId: membership.workspaceId,
      periodKey,
      status: TelegramAutoMessageExecutionStatus.SENT,
    });
    if (!claimed) {
      logger.info('Auto Message skip duplicate claim', {
        autoMessageId: message.id,
        identityId: connection.identityId,
        accountId: membership.workspaceId,
        periodKey,
      });
      continue;
    }

    try {
      const results = await resolveAutoMessageResults({
        accountType: TelegramAutoMessageAccountType.PERSONAL,
        resultKeys: keys,
        dayKey,
        period,
        workspaceId: membership.workspaceId,
        identityId: connection.identityId,
      });
      const composed = composeAutoMessageText({
        title: message.title,
        messageBody: message.messageBody,
        results,
        thresholdConfig: parseThreshold(message.thresholdConfig),
      });
      const keyboard = buildCtaKeyboard(message.ctaEnabled, message.ctaLabel, message.ctaPath);
      logger.info('Auto Message sending', {
        autoMessageId: message.id,
        channel: 'personal',
        identityId: connection.identityId,
        accountId: membership.workspaceId,
        periodKey,
      });
      const delivery = await tryDeliverTelegram({
        identityId: connection.identityId,
        channel: 'personal',
        prefField: 'notifyDailySummaryPersonal',
        text: composed.text,
        workspaceId: membership.workspaceId,
        replyMarkup: keyboard,
      });
      if (delivery.delivered) {
        sent += 1;
        logger.info('Auto Message sent', {
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: membership.workspaceId,
          periodKey,
        });
      } else {
        const status =
          delivery.reason === 'pref_off' ||
          delivery.reason === 'channel_off' ||
          delivery.reason === 'workspace_off'
            ? TelegramAutoMessageExecutionStatus.SKIPPED
            : TelegramAutoMessageExecutionStatus.FAILED;
        await markExecutionStatus({
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: membership.workspaceId,
          periodKey,
          status,
          error: delivery.message?.slice(0, 180) ?? delivery.reason ?? 'failed',
        });
        logger.warn('Auto Message delivery skipped/failed', {
          autoMessageId: message.id,
          identityId: connection.identityId,
          reason: delivery.reason,
        });
      }
    } catch (error) {
      await markExecutionStatus({
        autoMessageId: message.id,
        identityId: connection.identityId,
        accountId: membership.workspaceId,
        periodKey,
        status: TelegramAutoMessageExecutionStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 180) : 'failed',
      });
      logger.warn('Personal Auto Message send failed', {
        autoMessageId: message.id,
        identityId: connection.identityId,
        message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
      });
    }
  }
  return sent;
}

async function sendBusinessAutoMessage(
  message: TelegramAutoMessageRow,
  connection: { id: string; identityId: string; notifyBusiness: boolean },
  dayKey: string,
  periodKey: string,
): Promise<number> {
  if (!connection.notifyBusiness) return 0;
  let sent = 0;
  const stores = await businessStoresForIdentity(connection.identityId);
  const period = periodForRecurrence(message.recurrence as TelegramAutoMessageRecurrence);
  const keys = parseResultKeys(message.resultKeys);

  for (const store of stores) {
    const workspace = await prisma.workspace.findUnique({
      where: { storeId: store.id },
      select: { id: true },
    });
    if (!(await isWorkspaceNotifyEnabled(connection.id, workspace?.id))) continue;

    const claimed = await claimAutoMessageExecution({
      autoMessageId: message.id,
      identityId: connection.identityId,
      accountId: store.id,
      periodKey,
      status: TelegramAutoMessageExecutionStatus.SENT,
    });
    if (!claimed) {
      logger.info('Auto Message skip duplicate claim', {
        autoMessageId: message.id,
        identityId: connection.identityId,
        accountId: store.id,
        periodKey,
      });
      continue;
    }

    try {
      const results = await resolveAutoMessageResults({
        accountType: TelegramAutoMessageAccountType.BUSINESS,
        resultKeys: keys,
        dayKey,
        period,
        storeId: store.id,
      });
      const composed = composeAutoMessageText({
        title: message.title,
        messageBody: message.messageBody,
        results,
        thresholdConfig: parseThreshold(message.thresholdConfig),
      });
      const keyboard = buildCtaKeyboard(message.ctaEnabled, message.ctaLabel, message.ctaPath);
      logger.info('Auto Message sending', {
        autoMessageId: message.id,
        channel: 'business',
        identityId: connection.identityId,
        accountId: store.id,
        periodKey,
      });
      const delivery = await tryDeliverTelegram({
        identityId: connection.identityId,
        channel: 'business',
        prefField: 'notifyDailySummaryBusiness',
        text: composed.text,
        storeId: store.id,
        workspaceId: workspace?.id,
        replyMarkup: keyboard,
      });
      if (delivery.delivered) {
        sent += 1;
        logger.info('Auto Message sent', {
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: store.id,
          periodKey,
        });
      } else {
        const status =
          delivery.reason === 'pref_off' ||
          delivery.reason === 'channel_off' ||
          delivery.reason === 'workspace_off'
            ? TelegramAutoMessageExecutionStatus.SKIPPED
            : TelegramAutoMessageExecutionStatus.FAILED;
        await markExecutionStatus({
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: store.id,
          periodKey,
          status,
          error: delivery.message?.slice(0, 180) ?? delivery.reason ?? 'failed',
        });
        logger.warn('Auto Message delivery skipped/failed', {
          autoMessageId: message.id,
          identityId: connection.identityId,
          storeId: store.id,
          reason: delivery.reason,
        });
      }
    } catch (error) {
      await markExecutionStatus({
        autoMessageId: message.id,
        identityId: connection.identityId,
        accountId: store.id,
        periodKey,
        status: TelegramAutoMessageExecutionStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 180) : 'failed',
      });
      logger.warn('Business Auto Message send failed', {
        autoMessageId: message.id,
        identityId: connection.identityId,
        storeId: store.id,
        message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
      });
    }
  }
  return sent;
}

/**
 * Process due universal Auto Messages.
 */
export async function runTelegramAutoMessageTick(
  now = new Date(),
): Promise<{ sent: number; ran: number; due: number }> {
  if (process.env.VITEST && process.env.AUTO_MESSAGE_TICK_IN_TEST !== '1') {
    return { sent: 0, ran: 0, due: 0 };
  }

  let sent = 0;
  let ran = 0;
  let due = 0;

  try {
    logger.info('Auto Message cron started', { at: now.toISOString() });
    await ensureAutoMessagesMigrated();
    const messages = await prisma.telegramAutoMessage.findMany({ where: { enabled: true } });
    const connections = await prisma.telegramConnection.findMany({ where: { isActive: true } });
    logger.info('Auto Message cron loaded', {
      enabledCount: messages.length,
      connectionCount: connections.length,
    });

    for (const message of messages) {
      const dueInfo = autoMessageIsDue(message, now);
      if (!dueInfo.due) continue;
      due += 1;
      ran += 1;
      logger.info('Auto Message due', {
        autoMessageId: message.id,
        title: message.title,
        accountType: message.accountType,
        dayKey: dueInfo.dayKey,
        periodKey: dueInfo.periodKey,
      });

      if (connections.length === 0) {
        logger.info('Auto Message no active connections', { autoMessageId: message.id });
        continue;
      }

      for (const connection of connections) {
        try {
          if (message.accountType === 'PERSONAL') {
            sent += await sendPersonalAutoMessage(message, connection, dueInfo.dayKey, dueInfo.periodKey);
          } else {
            sent += await sendBusinessAutoMessage(message, connection, dueInfo.dayKey, dueInfo.periodKey);
          }
        } catch (error) {
          logger.warn('Auto Message connection loop failed', {
            autoMessageId: message.id,
            identityId: connection.identityId,
            message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
          });
        }
      }
    }

    logger.info('Auto Message cron finished', { due, ran, sent });
  } catch (error) {
    logger.warn('Auto Message tick failed', {
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }

  return { sent, ran, due };
}

/** Exported for tests — shift a day key by N days. */
export function autoMessageAddDaysForTest(dayKey: string, delta: number): string {
  return addZonedDays(dayKey, delta);
}
