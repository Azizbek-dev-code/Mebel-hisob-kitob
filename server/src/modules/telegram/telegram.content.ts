import type { TelegramMediaKind, TelegramRichContent } from '@furniture-erp/shared';

import {
  sendTelegramMessage,
  sendTelegramPhoto,
  type TelegramApiFailureReason,
  type TelegramClientDeps,
} from './telegram.service.js';
import { TELEGRAM_CAPTION_MAX_LENGTH, type TelegramInlineKeyboardMarkup } from './telegram.types.js';

export type TelegramSendableContent = {
  text: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  buttons?: Array<{ text: string; url?: string | null; callbackData?: string | null }>;
};

export function urlKeyboard(
  buttonText: string | null | undefined,
  buttonUrl: string | null | undefined,
): TelegramInlineKeyboardMarkup | undefined {
  const text = buttonText?.trim();
  const url = buttonUrl?.trim();
  if (!text || !url) return undefined;
  return { inline_keyboard: [[{ text, url }]] };
}

export function contentKeyboard(
  content: TelegramSendableContent,
): TelegramInlineKeyboardMarkup | undefined {
  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  if (content.buttons?.length) {
    for (const button of content.buttons) {
      const text = button.text.trim();
      if (!text) continue;
      const url = button.url?.trim();
      const callbackData = button.callbackData?.trim();
      if (url) rows.push([{ text, url }]);
      else if (callbackData) rows.push([{ text, callback_data: callbackData }]);
    }
  } else {
    return urlKeyboard(content.buttonText, content.buttonUrl);
  }
  return rows.length ? { inline_keyboard: rows } : undefined;
}

export function toRichContentDto(input: TelegramSendableContent): TelegramRichContent {
  return {
    text: input.text,
    mediaKind: input.imageUrl ? 'IMAGE' : 'NONE',
    imageUrl: input.imageUrl ?? null,
    buttonText: input.buttonText ?? null,
    buttonUrl: input.buttonUrl ?? null,
  };
}

export function previewTitle(text: string): string | null {
  const line = text.trim().split('\n').find((part) => part.trim());
  if (!line) return null;
  return line.replace(/<[^>]+>/g, '').slice(0, 80);
}

export function mediaKindFromUrl(imageUrl: string | null | undefined): TelegramMediaKind {
  return imageUrl ? 'IMAGE' : 'NONE';
}

/**
 * Sends admin-authored content (start message / broadcast). Notifications stay on
 * `sendTelegramMessage` so the two pipelines do not share delivery policy.
 */
export async function sendTelegramContent(
  chatId: string,
  content: TelegramSendableContent,
  deps?: TelegramClientDeps,
): Promise<{ ok: true } | { ok: false; reason: TelegramApiFailureReason }> {
  const markup = contentKeyboard(content);
  const text = content.text.trim();
  const imageUrl = content.imageUrl?.trim();

  if (imageUrl) {
    const caption = text && text.length <= TELEGRAM_CAPTION_MAX_LENGTH ? text : undefined;
    const photo = await sendTelegramPhoto(chatId, imageUrl, caption, caption ? markup : undefined, deps);
    if (!photo.ok) return photo;
    if (!caption && text) {
      return sendTelegramMessage(chatId, text, markup, deps);
    }
    if (!caption && !text && markup) {
      return sendTelegramMessage(chatId, ' ', markup, deps);
    }
    return photo;
  }

  if (!text) {
    return { ok: false, reason: 'api_error' };
  }
  return sendTelegramMessage(chatId, text, markup, deps);
}
