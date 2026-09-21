import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

import { env } from '../../config/env.js';
import { PRODUCT_IMAGE_MAX_BYTES } from '../../lib/storage/types.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import {
  getTelegramStatus,
  patchTelegramPrefs,
  postTelegramDailySummaryCron,
  postTelegramLinkStart,
  postTelegramSetupWebhook,
  postTelegramUnlink,
  postTelegramWebhook,
} from './telegram.controller.js';
import {
  getTelegramAdminBroadcast,
  getTelegramAdminBroadcasts,
  getTelegramAdminAutomations,
  getTelegramAdminAutoMessageCatalog,
  getTelegramAdminAutoMessages,
  getTelegramAdminMenu,
  getTelegramAdminStart,
  getTelegramAdminStats,
  getTelegramAdminStatus,
  getTelegramAdminUsers,
  postTelegramAdminAutoMessage,
  postTelegramAdminAutoMessageDuplicate,
  postTelegramAdminAutoMessagePreview,
  postTelegramAdminAutoMessageTestSend,
  postTelegramAdminBroadcast,
  postTelegramAdminBroadcastCancel,
  postTelegramAdminMedia,
  postTelegramAutomationCron,
  postTelegramBroadcastCron,
  deleteTelegramAdminAutoMessage,
  putTelegramAdminAutoMessage,
  putTelegramAdminAutomation,
  putTelegramAdminMenuScreen,
  putTelegramAdminStart,
  putTelegramAdminToken,
} from './telegram.admin.controller.js';
import {
  createTelegramBroadcastSchema,
  previewTelegramAutoMessageSchema,
  updateTelegramAutomationSchema,
  updateTelegramBotTokenSchema,
  updateTelegramStartMessageSchema,
  upsertTelegramAutoMessageSchema,
  upsertTelegramMenuScreenSchema,
} from './telegram.admin.validators.js';
import { telegramUpdateSchema, updateTelegramPrefsSchema } from './telegram.validators.js';
import { authorizeTelegramWebhook } from './telegram.webhook.js';

const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring.",
      ),
    );
  },
});

/**
 * Telegram HTTP surface.
 *
 * `POST /webhook` is public (Telegram has no session cookie) and is gated by
 * `X-Telegram-Bot-Api-Secret-Token`. Authenticated account routes follow.
 * Cron uses `CRON_SECRET` (Bearer or x-cron-secret).
 */
export const telegramRouter = Router();

telegramRouter.post(
  '/webhook',
  webhookRateLimiter,
  (req, _res, next) => {
    void authorizeTelegramWebhook(req)
      .then(() => next())
      .catch(next);
  },
  validate({ body: telegramUpdateSchema }),
  postTelegramWebhook,
);

telegramRouter.post('/cron/daily-summary', postTelegramDailySummaryCron);
telegramRouter.post('/cron/broadcast-tick', postTelegramBroadcastCron);
telegramRouter.post('/cron/automation-tick', postTelegramAutomationCron);

telegramRouter.get('/status', requireAuth, getTelegramStatus);
telegramRouter.post('/link/start', requireAuth, postTelegramLinkStart);
telegramRouter.post('/unlink', requireAuth, postTelegramUnlink);
telegramRouter.patch(
  '/prefs',
  requireAuth,
  validate({ body: updateTelegramPrefsSchema }),
  patchTelegramPrefs,
);
telegramRouter.post('/setup-webhook', requireAuth, requirePlatformAdmin, postTelegramSetupWebhook);

const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 },
});

telegramRouter.get('/admin/status', requireAuth, requirePlatformAdmin, getTelegramAdminStatus);
telegramRouter.put(
  '/admin/token',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: updateTelegramBotTokenSchema }),
  putTelegramAdminToken,
);
telegramRouter.get('/admin/start-message', requireAuth, requirePlatformAdmin, getTelegramAdminStart);
telegramRouter.put(
  '/admin/start-message',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: updateTelegramStartMessageSchema }),
  putTelegramAdminStart,
);
telegramRouter.get('/admin/users', requireAuth, requirePlatformAdmin, getTelegramAdminUsers);
telegramRouter.post(
  '/admin/media',
  requireAuth,
  requirePlatformAdmin,
  adminUpload.single('image'),
  postTelegramAdminMedia,
);
telegramRouter.get('/admin/broadcasts', requireAuth, requirePlatformAdmin, getTelegramAdminBroadcasts);
telegramRouter.post(
  '/admin/broadcasts',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: createTelegramBroadcastSchema }),
  postTelegramAdminBroadcast,
);
telegramRouter.get('/admin/broadcasts/:id', requireAuth, requirePlatformAdmin, getTelegramAdminBroadcast);
telegramRouter.post(
  '/admin/broadcasts/:id/cancel',
  requireAuth,
  requirePlatformAdmin,
  postTelegramAdminBroadcastCancel,
);
telegramRouter.get('/admin/menu', requireAuth, requirePlatformAdmin, getTelegramAdminMenu);
telegramRouter.put(
  '/admin/menu/:slug',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: upsertTelegramMenuScreenSchema }),
  putTelegramAdminMenuScreen,
);
telegramRouter.get('/admin/automations', requireAuth, requirePlatformAdmin, getTelegramAdminAutomations);
telegramRouter.put(
  '/admin/automations/:kind',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: updateTelegramAutomationSchema }),
  putTelegramAdminAutomation,
);
telegramRouter.get('/admin/auto-messages', requireAuth, requirePlatformAdmin, getTelegramAdminAutoMessages);
telegramRouter.get(
  '/admin/auto-messages/catalog',
  requireAuth,
  requirePlatformAdmin,
  getTelegramAdminAutoMessageCatalog,
);
telegramRouter.post(
  '/admin/auto-messages',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: upsertTelegramAutoMessageSchema }),
  postTelegramAdminAutoMessage,
);
telegramRouter.put(
  '/admin/auto-messages/:id',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: upsertTelegramAutoMessageSchema }),
  putTelegramAdminAutoMessage,
);
telegramRouter.post(
  '/admin/auto-messages/:id/duplicate',
  requireAuth,
  requirePlatformAdmin,
  postTelegramAdminAutoMessageDuplicate,
);
telegramRouter.delete(
  '/admin/auto-messages/:id',
  requireAuth,
  requirePlatformAdmin,
  deleteTelegramAdminAutoMessage,
);
telegramRouter.post(
  '/admin/auto-messages/preview',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: previewTelegramAutoMessageSchema }),
  postTelegramAdminAutoMessagePreview,
);
telegramRouter.post(
  '/admin/auto-messages/test-send',
  requireAuth,
  requirePlatformAdmin,
  validate({ body: previewTelegramAutoMessageSchema }),
  postTelegramAdminAutoMessageTestSend,
);
telegramRouter.get('/admin/stats', requireAuth, requirePlatformAdmin, getTelegramAdminStats);
