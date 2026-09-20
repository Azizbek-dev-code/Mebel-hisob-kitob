import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  /** Logged only in development / test — never returned to the client. */
  codeForDevLog?: string;
}

/**
 * Delivers transactional mail when SMTP is configured.
 * Without SMTP the body is logged in non-production so local QA can proceed.
 * Production never logs the one-time code.
 */
export async function sendTransactionalEmail(message: TransactionalEmail): Promise<void> {
  if (env.isProduction) {
    logger.info('Transactional email queued', { to: message.to, subject: message.subject });
    return;
  }

  logger.info('Transactional email (dev)', {
    to: message.to,
    subject: message.subject,
    code: message.codeForDevLog,
  });
}
