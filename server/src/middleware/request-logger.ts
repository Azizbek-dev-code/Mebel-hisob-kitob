import type { RequestHandler } from 'express';

import { logger } from '../utils/logger.js';

/** Logs one line per completed request. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: req.requestId,
      durationMs: Math.round(durationMs),
    });
  });

  next();
};
