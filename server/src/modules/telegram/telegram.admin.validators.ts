import { z } from 'zod';

import { env } from '../../config/env.js';
import { TELEGRAM_BUTTON_TEXT_MAX_LENGTH, TELEGRAM_MESSAGE_MAX_LENGTH } from './telegram.types.js';

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    if (env.isDevelopment && url.protocol === 'http:') return true;
    return false;
  } catch {
    return false;
  }
}

function isAllowedButtonUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const telegramRichContentObjectSchema = z
  .object({
    text: z.string().trim().max(TELEGRAM_MESSAGE_MAX_LENGTH).default(''),
    mediaKind: z.enum(['NONE', 'IMAGE', 'VIDEO', 'DOCUMENT']).optional(),
    imageUrl: optionalTrimmed,
    buttonText: z
      .string()
      .trim()
      .max(TELEGRAM_BUTTON_TEXT_MAX_LENGTH)
      .optional()
      .transform((value) => (value ? value : undefined)),
    buttonUrl: optionalTrimmed,
  })
  .strict();

function refineRichContent(
  value: { text: string; imageUrl?: string; buttonText?: string; buttonUrl?: string },
  ctx: z.RefinementCtx,
) {
  const text = value.text.trim();
  const imageUrl = value.imageUrl;
  if (!text && !imageUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Matn yoki rasm kerak',
      path: ['text'],
    });
  }
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Rasm URL https bo‘lishi kerak',
      path: ['imageUrl'],
    });
  }
  const hasButtonText = Boolean(value.buttonText);
  const hasButtonUrl = Boolean(value.buttonUrl);
  if (hasButtonText !== hasButtonUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tugma matni va URL birga kerak',
      path: hasButtonText ? ['buttonUrl'] : ['buttonText'],
    });
  }
  if (value.buttonUrl && !isAllowedButtonUrl(value.buttonUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tugma URL noto‘g‘ri',
      path: ['buttonUrl'],
    });
  }
}

export const telegramRichContentSchema = telegramRichContentObjectSchema.superRefine(refineRichContent);

const menuButtonSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1).max(TELEGRAM_BUTTON_TEXT_MAX_LENGTH),
  action: z.enum(['URL', 'MENU', 'BACK']),
  url: z.string().trim().nullable().optional(),
  targetSlug: z.string().trim().max(64).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateTelegramBotTokenSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
  })
  .strict();

export const updateTelegramStartMessageSchema = telegramRichContentObjectSchema
  .extend({
    buttons: z.array(menuButtonSchema).max(12).optional(),
  })
  .superRefine((value, ctx) => {
    refineRichContent(value, ctx);
    for (const [index, button] of (value.buttons ?? []).entries()) {
      if (button.action === 'URL' && button.url && !isAllowedButtonUrl(button.url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tugma URL noto‘g‘ri',
          path: ['buttons', index, 'url'],
        });
      }
    }
  });

export const createTelegramBroadcastSchema = telegramRichContentObjectSchema
  .extend({
    name: z.string().trim().max(80).optional(),
    audience: z.enum(['ALL', 'PERSONAL', 'BUSINESS', 'PERSONAL_AND_BUSINESS']).optional(),
    audienceFilter: z.object({}).passthrough().nullable().optional(),
    timezone: z.string().trim().max(64).optional(),
    scheduledAt: z.string().trim().max(40).nullable().optional(),
    sendNow: z.boolean().optional(),
  })
  .superRefine(refineRichContent);

export const upsertTelegramMenuScreenSchema = z
  .object({
    slug: z.string().trim().min(1).max(64).optional(),
    title: z.string().trim().max(80),
    text: z.string().trim().max(TELEGRAM_MESSAGE_MAX_LENGTH),
    imageUrl: optionalTrimmed,
    categoryKey: z.string().trim().max(32).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    buttons: z.array(menuButtonSchema).max(12),
  })
  .strict();

export const updateTelegramAutomationSchema = z
  .object({
    enabled: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    timezone: z.string().trim().max(64).optional(),
    weekday: z.number().int().min(1).max(7).nullable().optional(),
    monthDay: z.number().int().min(1).max(31).nullable().optional(),
    messageTemplate: z.string().trim().max(TELEGRAM_MESSAGE_MAX_LENGTH).nullable().optional(),
    ctaLabel: z.string().trim().max(TELEGRAM_BUTTON_TEXT_MAX_LENGTH).nullable().optional(),
    ctaPath: z
      .string()
      .trim()
      .max(240)
      .nullable()
      .optional()
      .refine((value) => !value || (value.startsWith('/') && !value.startsWith('//')), {
        message: 'CTA path ichki yo‘l bo‘lishi kerak',
      }),
  })
  .strict();

export const telegramAdminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
