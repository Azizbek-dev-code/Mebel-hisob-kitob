import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`, {
      environment: env.NODE_ENV,
      corsOrigins: env.corsOrigins,
    });
    if (!env.isTest) {
      void import('./services/entitlement.service.js')
        .then((mod) => mod.repairAllFreePlanEntitlements())
        .then((repaired) => {
          if (repaired > 0) {
            logger.info('Repaired free-plan entitlements on boot', { repaired });
          }
        })
        .catch((error: unknown) => {
          logger.error('Failed to repair free-plan entitlements', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
    }
  });

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});
