import { APP_FEEDBACK_KINDS } from '@furniture-erp/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';

import {
  getFeedbackStatus,
  getMyFeedback,
  postDismissFeedbackPrompt,
  postFeedback,
} from './personal-feedback.controller.js';

const createBodySchema = z.object({
  kind: z.enum(APP_FEEDBACK_KINDS as [string, ...string[]]),
  body: z.string().trim().min(2).max(2000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isPublic: z.boolean().optional(),
});

const dismissBodySchema = z.object({
  kind: z.enum(['onboarding', 'outcome']),
});

export const personalFeedbackRouter = Router();
personalFeedbackRouter.use(requireAuth, requirePersonalSession);

personalFeedbackRouter.get('/feedback', getMyFeedback);
personalFeedbackRouter.get('/feedback/status', getFeedbackStatus);
personalFeedbackRouter.post('/feedback', validate({ body: createBodySchema }), postFeedback);
personalFeedbackRouter.post(
  '/feedback/dismiss',
  validate({ body: dismissBodySchema }),
  postDismissFeedbackPrompt,
);
