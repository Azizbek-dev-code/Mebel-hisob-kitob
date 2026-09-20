import { TelegramCtaKind } from '@furniture-erp/shared';

import { ctaForNotification, type TelegramNotificationPayload } from './telegram.cta.js';
import type { TelegramInlineKeyboardMarkup } from './telegram.types.js';

export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function accountContextLine(payload: TelegramNotificationPayload): string {
  if (payload.accountType === 'PERSONAL') {
    return '🏠 Shaxsiy hisob';
  }
  const name = payload.accountName?.trim();
  const type = (payload.businessType ?? '').toUpperCase();
  if (type === 'CARPET') return `🧶 ${escapeTelegramHtml(name || 'Gilam do‘koni')}`;
  if (type === 'FURNITURE') return `🪑 ${escapeTelegramHtml(name || 'Mebel do‘koni')}`;
  return `💼 ${escapeTelegramHtml(name || 'Business')}`;
}

export function formatTelegramNotification(payload: TelegramNotificationPayload): {
  text: string;
  buttonText: string;
  buttonUrl: string;
  keyboard: TelegramInlineKeyboardMarkup;
} {
  const cta = ctaForNotification(payload);
  const lines = [payload.title.trim(), '', accountContextLine(payload)];
  const body = payload.message.trim();
  if (body) {
    lines.push('', body);
  }
  return {
    text: lines.join('\n'),
    buttonText: cta.label,
    buttonUrl: cta.url,
    keyboard: { inline_keyboard: [[{ text: cta.label, url: cta.url }]] },
  };
}

export function summaryCtaKind(): TelegramCtaKind {
  return TelegramCtaKind.SUMMARY;
}
