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

function toDto(row: TelegramAutoMessageRow): TelegramAutoMessageDto {
  return {
    id: row.id,
    title: row.title,
    accountType: row.accountType as TelegramAutoMessageAccountType,
    enabled: row.enabled,
    recurrence: row.recurrence as TelegramAutoMessageRecurrence,
    hour: row.hour,
    minute: row.minute,
    timezone: row.timezone || DEFAULT_TELEGRAM_TIMEZONE,
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
    // Safe clamp: if monthDay=31 and month has 30 days, fire on last day of month.
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

const LEGACY_SEED: Array<{
  kind: string;
  title: string;
  accountType: TelegramAutoMessageAccountType;
  recurrence: TelegramAutoMessageRecurrence;
  hour: number;
  minute: number;
  weekday: number | null;
  monthDay: number | null;
  resultKeys: string[];
  messageBody: string;
}> = [
  {
    kind: TelegramAutomationKind.PERSONAL_MORNING,
    title: 'Xayrli tong',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 8,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['balance', 'income', 'expense'],
    messageBody: 'Assalomu alaykum 👋\n\n{{balance}}\n{{income}}\n{{expense}}\n\nKuningiz barakali o‘tsin!',
  },
  {
    kind: TelegramAutomationKind.PERSONAL_EVENING,
    title: 'Kechki natija',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 21,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['income', 'expense', 'remaining', 'habit_completion'],
    messageBody: 'Bugungi yakun:\n\n{{income}}\n{{expense}}\n{{remaining}}\n{{habit_completion}}',
  },
  {
    kind: TelegramAutomationKind.PERSONAL_WEEKLY,
    title: 'Haftalik hisobot',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK,
    hour: 20,
    minute: 0,
    weekday: 7,
    monthDay: null,
    resultKeys: ['income', 'expense', 'remaining', 'goal_progress'],
    messageBody: 'Haftalik natija:\n\n{{income}}\n{{expense}}\n{{remaining}}\n{{goal_progress}}',
  },
  {
    kind: TelegramAutomationKind.PERSONAL_MONTHLY,
    title: 'Oylik hisobot',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    recurrence: TelegramAutoMessageRecurrence.EVERY_MONTH,
    hour: 20,
    minute: 0,
    weekday: null,
    monthDay: 1,
    resultKeys: ['balance', 'income', 'expense', 'budget_usage'],
    messageBody: 'Oylik natija:\n\n{{balance}}\n{{income}}\n{{expense}}\n{{budget_usage}}',
  },
  {
    kind: TelegramAutomationKind.BUSINESS_MORNING,
    title: 'Biznes — tonggi natija',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 8,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'customers'],
    messageBody: 'Bugungi biznes holati:\n\n{{sales}}\n{{revenue}}\n{{customers}}',
  },
  {
    kind: TelegramAutomationKind.BUSINESS_EVENING,
    title: 'Biznes — kechki natija',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 21,
    minute: 0,
    weekday: null,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit'],
    messageBody: 'Bugungi yakun:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}',
  },
  {
    kind: TelegramAutomationKind.BUSINESS_WEEKLY,
    title: 'Biznes — haftalik hisobot',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK,
    hour: 20,
    minute: 0,
    weekday: 7,
    monthDay: null,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit', 'debt'],
    messageBody: 'Haftalik biznes:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}\n{{debt}}',
  },
  {
    kind: TelegramAutomationKind.BUSINESS_MONTHLY,
    title: 'Biznes — oylik hisobot',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    recurrence: TelegramAutoMessageRecurrence.EVERY_MONTH,
    hour: 20,
    minute: 0,
    weekday: null,
    monthDay: 1,
    resultKeys: ['sales', 'revenue', 'expenses', 'profit', 'inventory'],
    messageBody: 'Oylik biznes:\n\n{{sales}}\n{{revenue}}\n{{expenses}}\n{{profit}}\n{{inventory}}',
  },
];

/**
 * Seed universal Auto Messages from legacy fixed kinds (once).
 * Copies enabled/time/timezone/template from TelegramAutomation when present,
 * then disables the legacy rows to prevent duplicate sends.
 */
export async function ensureAutoMessagesMigrated(): Promise<void> {
  for (const seed of LEGACY_SEED) {
    const existing = await prisma.telegramAutoMessage.findUnique({
      where: { legacyKind: seed.kind },
    });
    if (existing) continue;

    const legacy = await prisma.telegramAutomation.findUnique({
      where: { kind: seed.kind as never },
    });

    await prisma.telegramAutoMessage.create({
      data: {
        title: seed.title,
        accountType: seed.accountType,
        enabled: legacy?.enabled ?? false,
        recurrence: seed.recurrence,
        hour: legacy?.hour ?? seed.hour,
        minute: legacy?.minute ?? seed.minute,
        timezone: legacy?.timezone || DEFAULT_TELEGRAM_TIMEZONE,
        weekday: legacy?.weekday ?? seed.weekday,
        monthDay: legacy?.monthDay ?? seed.monthDay,
        messageBody: legacy?.messageTemplate?.trim() || seed.messageBody,
        resultKeys: seed.resultKeys,
        ctaEnabled: Boolean(legacy?.ctaLabel && legacy?.ctaPath),
        ctaLabel: legacy?.ctaLabel ?? null,
        ctaPath: legacy?.ctaPath ?? null,
        legacyKind: seed.kind,
      },
    });

    if (legacy?.enabled) {
      await prisma.telegramAutomation.update({
        where: { id: legacy.id },
        data: { enabled: false },
      });
    }
  }
}

export async function listAutoMessages(): Promise<TelegramAutoMessageDto[]> {
  await ensureAutoMessagesMigrated();
  const rows = await prisma.telegramAutoMessage.findMany({
    orderBy: [{ accountType: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toDto);
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

export function previewAutoMessage(
  body: TelegramAutoMessagePreviewRequest,
): TelegramAutoMessagePreviewResponse {
  if (
    body.accountType !== TelegramAutoMessageAccountType.PERSONAL &&
    body.accountType !== TelegramAutoMessageAccountType.BUSINESS
  ) {
    throw ApiError.validation('Account type noto‘g‘ri', [
      { field: 'accountType', message: 'PERSONAL yoki BUSINESS' },
    ]);
  }
  const keys = Array.isArray(body.resultKeys) ? body.resultKeys : [];
  const check = assertAutoMessageResultKeys(body.accountType, keys);
  if (!check.ok) {
    throw ApiError.validation('Natija kalitlari account type bilan mos emas', [
      { field: 'resultKeys', message: `Noto‘g‘ri: ${check.invalid.join(', ')}` },
    ]);
  }
  const results = previewSampleResults(body.accountType, keys);
  const composed = composeAutoMessageText({
    title: body.title ?? 'Preview',
    messageBody: body.messageBody ?? '',
    results,
    thresholdConfig: body.thresholdConfig,
    previewBanner: true,
  });
  return {
    preview: true,
    text: composed.text,
    unresolvedPlaceholders: composed.unresolvedPlaceholders,
    ctaLabel: body.ctaEnabled ? body.ctaLabel ?? null : null,
    ctaPath: body.ctaEnabled ? body.ctaPath ?? null : null,
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

export async function testSendAutoMessage(
  identityId: string,
  body: TelegramAutoMessagePreviewRequest,
): Promise<TelegramAutoMessageTestSendResponse> {
  const connection = await findActiveByIdentity(identityId);
  if (!connection) {
    return {
      sent: false,
      reason: 'not_connected',
      message: 'Telegram akkauntingiz ulanmagan.',
    };
  }

  const preview = previewAutoMessage(body);
  if (preview.unresolvedPlaceholders.length) {
    throw ApiError.validation(
      `Noma’lum placeholder: ${preview.unresolvedPlaceholders.map((k) => `{{${k}}}`).join(', ')}`,
      [{ field: 'messageBody', message: 'Placeholderlarni tekshiring' }],
    );
  }

  const keyboard = buildCtaKeyboard(
    Boolean(body.ctaEnabled),
    body.ctaLabel ?? null,
    body.ctaPath ?? null,
  );

  try {
    await tryDeliverTelegram({
      identityId,
      channel: body.accountType === TelegramAutoMessageAccountType.BUSINESS ? 'business' : 'personal',
      text: preview.text,
      replyMarkup: keyboard,
    });
    return { sent: true };
  } catch (error) {
    logger.warn('Auto Message test send failed', {
      identityId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
    return { sent: false, reason: 'send_failed', message: 'Yuborish muvaffaqiyatsiz.' };
  }
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
    if (!claimed) continue;

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
      await tryDeliverTelegram({
        identityId: connection.identityId,
        channel: 'personal',
        prefField: 'notifyDailySummaryPersonal',
        text: composed.text,
        workspaceId: membership.workspaceId,
        replyMarkup: keyboard,
      });
      sent += 1;
    } catch (error) {
      await prisma.telegramAutoMessageExecution.updateMany({
        where: {
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: membership.workspaceId,
          periodKey,
        },
        data: {
          status: TelegramAutoMessageExecutionStatus.FAILED,
          error: error instanceof Error ? error.message.slice(0, 180) : 'failed',
        },
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
    if (!claimed) continue;

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
      await tryDeliverTelegram({
        identityId: connection.identityId,
        channel: 'business',
        prefField: 'notifyDailySummaryBusiness',
        text: composed.text,
        storeId: store.id,
        workspaceId: workspace?.id,
        replyMarkup: keyboard,
      });
      sent += 1;
    } catch (error) {
      await prisma.telegramAutoMessageExecution.updateMany({
        where: {
          autoMessageId: message.id,
          identityId: connection.identityId,
          accountId: store.id,
          periodKey,
        },
        data: {
          status: TelegramAutoMessageExecutionStatus.FAILED,
          error: error instanceof Error ? error.message.slice(0, 180) : 'failed',
        },
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
 * Missing Telegram connection → claim NO_CONNECTION and continue (no crash).
 */
export async function runTelegramAutoMessageTick(
  now = new Date(),
): Promise<{ sent: number; ran: number }> {
  if (process.env.VITEST && process.env.AUTO_MESSAGE_TICK_IN_TEST !== '1') {
    return { sent: 0, ran: 0 };
  }

  let sent = 0;
  let ran = 0;

  try {
    await ensureAutoMessagesMigrated();
    const messages = await prisma.telegramAutoMessage.findMany({ where: { enabled: true } });
    const connections = await prisma.telegramConnection.findMany({ where: { isActive: true } });

    for (const message of messages) {
      const due = autoMessageIsDue(message, now);
      if (!due.due) continue;
      ran += 1;

      if (connections.length === 0) continue;

      for (const connection of connections) {
        try {
          if (message.accountType === 'PERSONAL') {
            sent += await sendPersonalAutoMessage(message, connection, due.dayKey, due.periodKey);
          } else {
            sent += await sendBusinessAutoMessage(message, connection, due.dayKey, due.periodKey);
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
  } catch (error) {
    logger.warn('Auto Message tick failed', {
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }

  return { sent, ran };
}

/** Exported for tests — shift a day key by N days. */
export function autoMessageAddDaysForTest(dayKey: string, delta: number): string {
  return addZonedDays(dayKey, delta);
}
