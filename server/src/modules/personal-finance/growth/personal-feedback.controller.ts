import type { Request, Response } from 'express';

import { sendNoContent, sendSuccess } from '../../../utils/http-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';

import {
  createFeedback,
  dismissFeedbackPrompt,
  getFeedbackPromptStatus,
  listMyFeedback,
} from './personal-feedback.service.js';

export const getMyFeedback = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await listMyFeedback(req.personalAuth!.identityId));
});

export const getFeedbackStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.personalAuth!;
  sendSuccess(res, {
    prompts: await getFeedbackPromptStatus(user.identityId, user.subscription.canWrite),
  });
});

export const postFeedback = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, {
    feedback: await createFeedback(req.personalAuth!.identityId, req.body),
  });
});

export const postDismissFeedbackPrompt = asyncHandler(async (req: Request, res: Response) => {
  const kind = String((req.body as { kind?: string }).kind ?? '');
  if (kind !== 'onboarding' && kind !== 'outcome') {
    sendNoContent(res);
    return;
  }
  await dismissFeedbackPrompt(req.personalAuth!.identityId, kind);
  sendNoContent(res);
});
