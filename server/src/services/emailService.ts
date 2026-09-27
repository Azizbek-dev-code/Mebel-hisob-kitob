import { Resend } from 'resend';

import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (resendClient === undefined) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/** Test-only: drop the cached Resend client after env stubs change. */
export function resetEmailServiceClient(): void {
  resendClient = undefined;
}

/** Mask local-part for safe logs — never log full address or OTP. */
export function maskEmailForLog(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '***';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain || '***'}`;
}

function codeBlockHtml(code: string): string {
  return `<p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>`;
}

function deliveryFailed(message = 'Email yuborib bo‘lmadi. Keyinroq qayta urinib ko‘ring.'): ApiError {
  return ApiError.internal(message);
}

async function deliver(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  codeForDevLog?: string;
}): Promise<void> {
  const client = getResendClient();
  const from = env.EMAIL_FROM;
  const toMasked = maskEmailForLog(params.to);

  if (!client || !from) {
    if (env.isProduction) {
      logger.error('EMAIL_DELIVERY_SKIPPED', {
        reason: 'not_configured',
        provider: 'resend',
        to: toMasked,
        subject: params.subject,
        hasApiKey: Boolean(env.RESEND_API_KEY),
        hasFrom: Boolean(from),
      });
      throw deliveryFailed();
    }
    logger.info('Transactional email (dev)', {
      to: toMasked,
      subject: params.subject,
      code: params.codeForDevLog,
    });
    return;
  }

  try {
    const result = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (result.error) {
      logger.error('EMAIL_DELIVERY_FAILED', {
        provider: 'resend',
        to: toMasked,
        subject: params.subject,
        message: result.error.message,
      });
      throw deliveryFailed();
    }

    logger.info('Transactional email sent', {
      provider: 'resend',
      to: toMasked,
      subject: params.subject,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('EMAIL_DELIVERY_FAILED', {
      provider: 'resend',
      to: toMasked,
      subject: params.subject,
      message: error instanceof Error ? error.message : 'unknown',
    });
    throw deliveryFailed();
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await deliver({
    to,
    subject: 'Email tasdiqlash kodi',
    text: `Email tasdiqlash kodi: ${code}. 15 daqiqa amal qiladi. Hech kimga bermang.`,
    html: `<p>Email tasdiqlash kodi:</p>${codeBlockHtml(code)}<p>15 daqiqa amal qiladi. Hech kimga bermang.</p>`,
    codeForDevLog: code,
  });
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await deliver({
    to,
    subject: 'Parolni tiklash kodi',
    text: `Parolni tiklash kodi: ${code}. 15 daqiqa amal qiladi. Hech kimga bermang.`,
    html: `<p>Parolni tiklash kodi:</p>${codeBlockHtml(code)}<p>15 daqiqa amal qiladi. Hech kimga bermang.</p>`,
    codeForDevLog: code,
  });
}
