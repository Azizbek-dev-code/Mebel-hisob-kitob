import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';

import {
  getStatus,
  postAnalyticsMaintenanceCron,
  postEvents,
  postHeartbeat,
} from './presence.controller.js';

const heartbeatBodySchema = z.object({
  clientSessionId: z.string().trim().min(8).max(80),
  visible: z.boolean(),
  active: z.boolean(),
  route: z.string().trim().max(160).optional(),
  accountType: z.enum(['PERSONAL', 'BUSINESS', 'PLATFORM'] as const).optional(),
  accountId: z.string().trim().max(64).nullable().optional(),
});

const eventsBodySchema = z.object({
  clientSessionId: z.string().trim().min(8).max(80),
  events: z
    .array(
      z.object({
        eventType: z.string().trim().min(1).max(80),
        route: z.string().trim().max(160).optional(),
        feature: z.string().trim().max(64).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .max(20),
});

const identityParamsSchema = z.object({
  identityId: z.string().trim().min(1).max(64),
});

export const presenceRouter = Router();

presenceRouter.post('/cron/maintenance', postAnalyticsMaintenanceCron);

presenceRouter.use(requireAuth);
presenceRouter.post('/heartbeat', validate({ body: heartbeatBodySchema }), postHeartbeat);
presenceRouter.post('/events', validate({ body: eventsBodySchema }), postEvents);
presenceRouter.get(
  '/status/:identityId',
  validate({ params: identityParamsSchema }),
  getStatus,
);
