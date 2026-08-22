import path from 'node:path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/index.js';
import { rootRouter } from './routes/root.routes.js';

/**
 * Builds the Express application without binding a port, so integration tests
 * can drive it through Supertest.
 */
export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop so rate limiting and secure cookies work behind
  // a reverse proxy in production.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Product images may be loaded from STORAGE_PUBLIC_URL (same origin /uploads).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigins,
      // Required for the HTTP-only auth cookie to travel cross-origin in dev.
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Local storage driver — development / single-node only. Production should
  // use STORAGE_DRIVER=cloudinary (or supabase once implemented).
  if (env.STORAGE_DRIVER === 'local') {
    const uploadsRoot = path.isAbsolute(env.STORAGE_LOCAL_DIR)
      ? env.STORAGE_LOCAL_DIR
      : path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
    app.use('/uploads', express.static(uploadsRoot, { fallthrough: true, maxAge: '7d' }));
  }

  app.use(requestId);
  if (!env.isTest) {
    app.use(requestLogger);
  }

  app.use('/', rootRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
