import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import { sendSuccess } from '../utils/http-response.js';

export interface ServiceInfoPayload {
  name: string;
  status: 'ok';
  version: string;
  environment: string;
  /** Where the actual endpoints live; nothing is served from the root itself. */
  apiBasePath: string;
  healthPath: string;
}

/**
 * Served at `/` so uptime probes and port scanners get a meaningful answer
 * instead of filling the log with 404s for a path the API never intended to own.
 */
export function getServiceInfo(_req: Request, res: Response): void {
  sendSuccess<ServiceInfoPayload>(res, {
    name: 'Furniture ERP API',
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    environment: env.NODE_ENV,
    apiBasePath: '/api',
    healthPath: '/api/health',
  });
}
