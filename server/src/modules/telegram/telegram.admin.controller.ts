import type { Request, Response } from 'express';
import {
  AuditEntityType,
  AuditEventType,
  type CreateTelegramBroadcastRequest,
  type TelegramAutomationKind,
  type UpdateTelegramAutomationRequest,
  type UpdateTelegramStartMessageRequest,
  type UpsertTelegramMenuScreenRequest,
} from '@furniture-erp/shared';

import { recordAudit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { isCronSecretAuthorized } from '../../utils/cron-secret.js';
import { sendSuccess } from '../../utils/http-response.js';
import {
  getAdminBotStatus,
  getAdminStartMessage,
  getAdminTelegramStats,
  listAdminConnectedUsers,
  updateAdminBotToken,
  updateAdminStartMessage,
  uploadAdminTelegramMedia,
} from './telegram.admin.service.js';
import { createBroadcast, cancelBroadcast, getBroadcast, listBroadcasts, processBroadcastQueue } from './telegram.broadcast.service.js';
import { listAutomations, updateAutomation, runTelegramAutomationTick } from './telegram.automation.service.js';
import { listMenuScreens, upsertMenuScreen } from './telegram.menu.js';

function requirePlatformActor(req: Request): { id: string } {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const getTelegramAdminStatus = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getAdminBotStatus());
});

export const putTelegramAdminToken = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  const token = String((req.body as { token?: string }).token ?? '');
  sendSuccess(res, await updateAdminBotToken(actor.id, token));
});

export const getTelegramAdminStart = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getAdminStartMessage());
});

export const putTelegramAdminStart = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await updateAdminStartMessage(actor.id, req.body as UpdateTelegramStartMessageRequest));
});

export const getTelegramAdminUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  sendSuccess(res, await listAdminConnectedUsers(page, pageSize));
});

export const postTelegramAdminMedia = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw ApiError.validation('Rasm fayli kerak', [
      { field: 'image', message: 'image maydoniga rasm yuklang' },
    ]);
  }
  sendSuccess(
    res,
    await uploadAdminTelegramMedia({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    }),
  );
});

export const getTelegramAdminBroadcasts = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  sendSuccess(res, await listBroadcasts(page, pageSize));
});

export const postTelegramAdminBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await createBroadcast(actor.id, req.body as CreateTelegramBroadcastRequest));
});

export const getTelegramAdminBroadcast = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await getBroadcast(req.params.id!));
});

export const postTelegramAdminBroadcastCancel = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(res, await cancelBroadcast(actor.id, req.params.id!));
});

export const getTelegramAdminMenu = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listMenuScreens());
});

export const putTelegramAdminMenuScreen = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  const slug = req.params.slug!;
  const body = req.body as UpsertTelegramMenuScreenRequest;
  const result = await upsertMenuScreen(slug, body);
  await recordAudit({
    storeId: null,
    actorUserId: actor.id,
    eventType: AuditEventType.TELEGRAM_MENU_UPDATED,
    entityType: AuditEntityType.TELEGRAM_MENU,
    entityId: result.id,
    summary: 'Telegram menu content updated',
    metadata: { slug },
  });
  sendSuccess(res, result);
});

export const getTelegramAdminAutomations = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listAutomations());
});

export const putTelegramAdminAutomation = asyncHandler(async (req: Request, res: Response) => {
  const actor = requirePlatformActor(req);
  sendSuccess(
    res,
    await updateAutomation(
      actor.id,
      req.params.kind as TelegramAutomationKind,
      req.body as UpdateTelegramAutomationRequest,
    ),
  );
});

export const getTelegramAdminStats = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getAdminTelegramStats());
});

export const postTelegramBroadcastCron = asyncHandler(async (req: Request, res: Response) => {
  if (!isCronSecretAuthorized(req)) {
    throw ApiError.unauthorized('Cron unauthorized');
  }
  sendSuccess(res, await processBroadcastQueue());
});

export const postTelegramAutomationCron = asyncHandler(async (req: Request, res: Response) => {
  if (!isCronSecretAuthorized(req)) {
    throw ApiError.unauthorized('Cron unauthorized');
  }
  sendSuccess(res, await runTelegramAutomationTick());
});
