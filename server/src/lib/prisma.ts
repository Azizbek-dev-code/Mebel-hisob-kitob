import { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * `tsx watch` restarts the process on change, but Prisma Studio and test runners
 * can re-import this module within one process. Caching on `globalThis` keeps a
 * single connection pool instead of exhausting Postgres connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : ['warn', 'error'],
  });

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;

  prisma.$on('query' as never, (event: { query: string; duration: number }) => {
    // Only surface slow queries; logging every statement drowns out the request log.
    if (event.duration >= 200) {
      logger.warn('Slow query', { durationMs: event.duration, query: event.query });
    }
  });
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
