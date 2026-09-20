import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_TELEGRAM_TIMEZONE,
  TelegramAutomationKind,
  hourInTimeZone,
  toWeekKey,
  type TelegramAutomationDto,
  type UpdateTelegramAutomationRequest,
} from '@furniture-erp/shared';
import { TelegramAutomationLogStatus } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { isWorkspaceNotifyEnabled } from './telegram.account-pref.service.js';
import { tryDeliverTelegram } from './telegram.delivery.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import {
  buildBusinessSummary,
  buildPersonalSummary,
  businessStoresForIdentity,
  personalWorkspacesForIdentity,
  type SummaryPeriod,
} from './telegram.summary.service.js';
import {
  isoWeekdayFromDayKey,
  lastDayOfMonth,
  minuteInTimeZone,
  zonedDayKey,
} from './telegram.timezone.js';

function hourInTimeZoneSafe(date: Date, timeZone: string): number {
  try {
    return hourInTimeZone(date, timeZone);
  } catch {
    return date.getUTCHours();
  }
}

function toDto(row: {
  id: string;
  kind: TelegramAutomationKind;
  enabled: boolean;
  hour: number;
  minute: number;
  timezone: string;
  weekday: number | null;
  monthDay: number | null;
  messageTemplate: string | null;
  ctaLabel: string | null;
  ctaPath: string | null;
  lastRunAt: Date | null;
  lastRunLocalKey: string | null;
  updatedAt: Date;
}): TelegramAutomationDto {
  return {
    id: row.id,
    kind: row.kind,
    enabled: row.enabled,
    hour: row.hour,
    minute: row.minute,
    timezone: row.timezone || DEFAULT_TELEGRAM_TIMEZONE,
    weekday: row.weekday,
    monthDay: row.monthDay,
    messageTemplate: row.messageTemplate,
    ctaLabel: row.ctaLabel,
    ctaPath: row.ctaPath,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastRunLocalKey: row.lastRunLocalKey,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function channelOf(kind: TelegramAutomationKind): 'personal' | 'business' {
  return kind.startsWith('PERSONAL') ? 'personal' : 'business';
}

function periodOf(kind: TelegramAutomationKind): SummaryPeriod {
  if (kind.includes('WEEKLY')) return 'week';
  if (kind.includes('MONTHLY')) return 'month';
  return 'day';
}

function isEvening(kind: TelegramAutomationKind): boolean {
  return kind.includes('EVENING');
}

function runKey(kind: TelegramAutomationKind, dayKey: string): string {
  if (kind.includes('WEEKLY')) return toWeekKey(dayKey);
  if (kind.includes('MONTHLY')) return dayKey.slice(0, 7);
  return dayKey;
}

function prefFieldFor(kind: TelegramAutomationKind) {
  if (kind.includes('WEEKLY')) {
    return channelOf(kind) === 'personal' ? 'notifyWeeklySummaryPersonal' : 'notifyWeeklySummaryBusiness';
  }
  if (kind.includes('MONTHLY')) {
    return channelOf(kind) === 'personal' ? 'notifyMonthlySummaryPersonal' : 'notifyMonthlySummaryBusiness';
  }
  return channelOf(kind) === 'personal' ? 'notifyDailySummaryPersonal' : 'notifyDailySummaryBusiness';
}

function isDue(
  row: {
    kind: TelegramAutomationKind;
    hour: number;
    minute: number;
    timezone: string;
    weekday: number | null;
    monthDay: number | null;
    lastRunLocalKey: string | null;
  },
  now: Date,
): { due: boolean; dayKey: string; key: string } {
  const timezone = row.timezone || DEFAULT_TELEGRAM_TIMEZONE;
  const dayKey = zonedDayKey(now, timezone);
  const key = runKey(row.kind, dayKey);
  if (row.lastRunLocalKey === key) return { due: false, dayKey, key };

  const hour = hourInTimeZoneSafe(now, timezone);
  const minute = minuteInTimeZone(now, timezone);
  if (hour !== row.hour || minute !== row.minute) return { due: false, dayKey, key };

  if (periodOf(row.kind) === 'week') {
    const weekday = row.weekday && row.weekday >= 1 && row.weekday <= 7 ? row.weekday : 1;
    if (isoWeekdayFromDayKey(dayKey) !== weekday) return { due: false, dayKey, key };
  }
  if (periodOf(row.kind) === 'month') {
    const parts = dayKey.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const wanted = Math.min(row.monthDay && row.monthDay >= 1 ? row.monthDay : 1, lastDayOfMonth(year, month));
    if (day !== wanted) return { due: false, dayKey, key };
  }
  return { due: true, dayKey, key };
}

const DEFAULT_AUTOMATIONS: Array<{
  kind: TelegramAutomationKind;
  hour: number;
  minute: number;
  weekday: number | null;
  monthDay: number | null;
}> = [
  { kind: TelegramAutomationKind.PERSONAL_MORNING, hour: 8, minute: 0, weekday: null, monthDay: null },
  { kind: TelegramAutomationKind.PERSONAL_EVENING, hour: 21, minute: 0, weekday: null, monthDay: null },
  { kind: TelegramAutomationKind.PERSONAL_WEEKLY, hour: 20, minute: 0, weekday: 7, monthDay: null },
  { kind: TelegramAutomationKind.PERSONAL_MONTHLY, hour: 20, minute: 0, weekday: null, monthDay: 1 },
  { kind: TelegramAutomationKind.BUSINESS_MORNING, hour: 8, minute: 0, weekday: null, monthDay: null },
  { kind: TelegramAutomationKind.BUSINESS_EVENING, hour: 21, minute: 0, weekday: null, monthDay: null },
  { kind: TelegramAutomationKind.BUSINESS_WEEKLY, hour: 20, minute: 0, weekday: 7, monthDay: null },
  { kind: TelegramAutomationKind.BUSINESS_MONTHLY, hour: 20, minute: 0, weekday: null, monthDay: 1 },
];

export async function ensureDefaultAutomations(): Promise<void> {
  const existing = await prisma.telegramAutomation.findMany({ select: { kind: true } });
  const have = new Set(existing.map((row) => row.kind));
  for (const item of DEFAULT_AUTOMATIONS) {
    if (have.has(item.kind)) continue;
    await prisma.telegramAutomation.create({
      data: {
        kind: item.kind,
        enabled: false,
        hour: item.hour,
        minute: item.minute,
        timezone: DEFAULT_TELEGRAM_TIMEZONE,
        weekday: item.weekday,
        monthDay: item.monthDay,
      },
    });
  }
}

export async function listAutomations(): Promise<TelegramAutomationDto[]> {
  await ensureDefaultAutomations();
  const rows = await prisma.telegramAutomation.findMany({ orderBy: { kind: 'asc' } });
  return rows.map((row) => toDto(row));
}

export async function updateAutomation(
  actorUserId: string,
  kind: TelegramAutomationKind,
  body: UpdateTelegramAutomationRequest,
): Promise<TelegramAutomationDto> {
  const existing = await prisma.telegramAutomation.findUnique({ where: { kind } });
  if (!existing) throw ApiError.notFound('Avtomatik xabar topilmadi');

  const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;
  const updated = await prisma.telegramAutomation.update({
    where: { kind },
    data: {
      enabled: nextEnabled,
      hour: body.hour ?? existing.hour,
      minute: body.minute ?? existing.minute,
      timezone: body.timezone?.trim() || existing.timezone,
      weekday: body.weekday === undefined ? existing.weekday : body.weekday,
      monthDay: body.monthDay === undefined ? existing.monthDay : body.monthDay,
      messageTemplate: body.messageTemplate === undefined ? existing.messageTemplate : body.messageTemplate,
      ctaLabel: body.ctaLabel === undefined ? existing.ctaLabel : body.ctaLabel,
      ctaPath: body.ctaPath === undefined ? existing.ctaPath : body.ctaPath,
    },
  });

  if (existing.enabled !== updated.enabled) {
    await recordAudit({
      storeId: null,
      actorUserId,
      eventType: updated.enabled
        ? AuditEventType.TELEGRAM_AUTOMATION_ENABLED
        : AuditEventType.TELEGRAM_AUTOMATION_DISABLED,
      entityType: AuditEntityType.TELEGRAM_AUTOMATION,
      entityId: updated.id,
      summary: `Telegram automation ${updated.kind} ${updated.enabled ? 'enabled' : 'disabled'}`,
      metadata: { kind: updated.kind, hour: updated.hour, timezone: updated.timezone },
    });
  }

  return toDto(updated);
}

async function sendForConnection(
  automation: {
    id: string;
    kind: TelegramAutomationKind;
    messageTemplate: string | null;
    ctaLabel: string | null;
    ctaPath: string | null;
  },
  connection: {
    id: string;
    identityId: string;
    notifyBusiness: boolean;
    notifyPersonal: boolean;
    notifyDailySummaryBusiness: boolean;
    notifyDailySummaryPersonal: boolean;
    notifyWeeklySummaryBusiness: boolean;
    notifyWeeklySummaryPersonal: boolean;
    notifyMonthlySummaryBusiness: boolean;
    notifyMonthlySummaryPersonal: boolean;
  },
  dayKey: string,
): Promise<number> {
  const channel = channelOf(automation.kind);
  if (channel === 'personal' && !connection.notifyPersonal) return 0;
  if (channel === 'business' && !connection.notifyBusiness) return 0;

  const pref = prefFieldFor(automation.kind);
  if (!connection[pref]) return 0;

  let sent = 0;
  const period = periodOf(automation.kind);
  const evening = isEvening(automation.kind);

  if (channel === 'personal') {
    const memberships = await personalWorkspacesForIdentity(connection.identityId);
    for (const membership of memberships) {
      if (!(await isWorkspaceNotifyEnabled(connection.id, membership.workspaceId))) continue;
      const formatted = await buildPersonalSummary({
        workspaceId: membership.workspaceId,
        dayKey,
        period,
        evening,
      });
      if (!formatted) continue;
      const text = automation.messageTemplate?.trim()
        ? `${automation.messageTemplate.trim()}\n\n${formatted.text}`
        : formatted.text;
      await tryDeliverTelegram({
        identityId: connection.identityId,
        channel: 'personal',
        prefField: pref,
        text,
        workspaceId: membership.workspaceId,
        replyMarkup: formatted.keyboard,
      });
      await prisma.telegramAutomationLog.create({
        data: {
          automationId: automation.id,
          identityId: connection.identityId,
          workspaceId: membership.workspaceId,
          connectionId: connection.id,
          status: TelegramAutomationLogStatus.SENT,
        },
      });
      sent += 1;
    }
    return sent;
  }

  const stores = await businessStoresForIdentity(connection.identityId);
  for (const store of stores) {
    const workspace = await prisma.workspace.findUnique({
      where: { storeId: store.id },
      select: { id: true },
    });
    if (!(await isWorkspaceNotifyEnabled(connection.id, workspace?.id))) continue;
    const formatted = await buildBusinessSummary({
      storeId: store.id,
      storeName: store.name,
      businessType: store.businessType,
      dayKey,
      period,
      evening,
    });
    if (!formatted) continue;
    const text = automation.messageTemplate?.trim()
      ? `${automation.messageTemplate.trim()}\n\n${formatted.text}`
      : formatted.text;
    await tryDeliverTelegram({
      identityId: connection.identityId,
      channel: 'business',
      prefField: pref,
      text,
      storeId: store.id,
      workspaceId: workspace?.id,
      replyMarkup: formatted.keyboard,
    });
    await prisma.telegramAutomationLog.create({
      data: {
        automationId: automation.id,
        identityId: connection.identityId,
        workspaceId: workspace?.id,
        connectionId: connection.id,
        status: TelegramAutomationLogStatus.SENT,
      },
    });
    sent += 1;
  }
  return sent;
}

export async function runTelegramAutomationTick(now = new Date()): Promise<{ sent: number; ran: number }> {
  if (process.env.VITEST) return { sent: 0, ran: 0 };

  let sent = 0;
  let ran = 0;
  try {
    await ensureDefaultAutomations();
    const automations = await prisma.telegramAutomation.findMany({ where: { enabled: true } });
    const connections = await prisma.telegramConnection.findMany({ where: { isActive: true } });

    for (const automation of automations) {
      const due = isDue(automation, now);
      if (!due.due) continue;
      ran += 1;
      for (const connection of connections) {
        try {
          sent += await sendForConnection(automation, connection, due.dayKey);
        } catch (error) {
          logger.warn('Telegram automation row failed', {
            kind: automation.kind,
            identityId: connection.identityId,
            message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
          });
          await prisma.telegramAutomationLog.create({
            data: {
              automationId: automation.id,
              identityId: connection.identityId,
              connectionId: connection.id,
              status: TelegramAutomationLogStatus.FAILED,
              error: error instanceof Error ? error.message.slice(0, 180) : 'failed',
            },
          });
        }
      }
      await prisma.telegramAutomation.update({
        where: { id: automation.id },
        data: { lastRunAt: now, lastRunLocalKey: due.key },
      });
    }
  } catch (error) {
    logger.warn('Telegram automation tick failed', {
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
  return { sent, ran };
}

/** Test helper — evaluate due logic without sending. */
export function automationIsDueForTest(
  row: Parameters<typeof isDue>[0],
  now: Date,
): ReturnType<typeof isDue> {
  return isDue(row, now);
}
