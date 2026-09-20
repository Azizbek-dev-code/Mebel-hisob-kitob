import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getTelegramHealthStatus } from '../modules/telegram/telegram.service.js';
import type { TelegramHealthStatus } from '../modules/telegram/telegram.types.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';

export interface HealthPayload {
  status: 'ok' | 'degraded';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  /** Database reachability — never includes connection strings or credentials. */
  database: 'up' | 'down';
  /** Telegram bot reachability. Never includes the bot token or webhook secret. */
  telegram: TelegramHealthStatus;
}

/**
 * Liveness + shallow readiness.
 *
 * Returns 200 when the process is up even if the database is unreachable
 * (`status: degraded`, `database: down`) so orchestrators can distinguish
 * "process crashed" from "DB outage" without scraping logs. Callers that need
 * a hard fail on DB should check `data.database === 'up'`.
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  let database: 'up' | 'down' = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch {
    database = 'down';
  }

  sendSuccess<HealthPayload>(res, {
    status: database === 'up' ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    database,
    telegram: await getTelegramHealthStatus(),
  });
});
