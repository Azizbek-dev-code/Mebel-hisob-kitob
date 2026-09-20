import { Resend } from 'resend';

import { env } from '../config/env.js';
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

function codeBlockHtml(code: string): string {
  return `<p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>`;
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

  if (!client || !from) {
    if (env.isProduction) {
      logger.error('Transactional email skipped: Resend is not configured', {
        to: params.to,
        subject: params.subject,
      });
      return;
    }
    logger.info('Transactional email (dev)', {
      to: params.to,
      subject: params.subject,
      code: params.codeForDevLog,
    });
    return;
  }

  const result = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  if (result.error) {
    logger.error('Resend delivery failed', {
      to: params.to,
      subject: params.subject,
      message: result.error.message,
    });
    return;
  }

  logger.info('Transactional email sent', { to: params.to, subject: params.subject });
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
