import {
  isPersonalAuth,
  type CompletePersonalOnboardingRequest,
  type OnboardingStartRequest,
  type ReorderOnboardingItemsRequest,
  type SaveOnboardingAnswersRequest,
  type UpsertOnboardingMappingRequest,
  type UpsertOnboardingNeedRequest,
  type UpsertOnboardingQuestionRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { readAuthCookie, setAuthCookie } from '../../../lib/auth-cookie.js';
import { readReferralAttribution } from '../../referrals/referral-cookie.js';
import { prisma } from '../../../lib/prisma.js';
import { authenticate, issuePersonalSession } from '../../../services/auth.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';
import {
  createOnboardingMapping,
  createOnboardingNeed,
  createOnboardingQuestion,
  createOnboardingSolution,
  deactivateOnboardingNeed,
  deactivateOnboardingQuestion,
  deactivateOnboardingSolution,
  deleteOnboardingMapping,
  listCatalogQuestions,
  listOnboardingMappings,
  listOnboardingNeeds,
  listOnboardingSolutions,
  reorderLabeled,
  reorderOnboardingQuestions,
  updateOnboardingNeed,
  updateOnboardingQuestion,
  updateOnboardingSolution,
} from './onboarding-catalog.service.js';
import {
  completeBusinessOnboarding,
  completePersonalOnboardingForUser,
  completePersonalOnboardingRegister,
  getOnboarding,
  getOnboardingCatalog,
  getOnboardingStats,
  listOnboardingAnswers,
  saveOnboardingAnswers,
  startOnboarding,
} from './onboarding.service.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

function tokenParam(req: Request): string {
  const token = req.params.token;
  if (!token) throw ApiError.badRequest('Onboarding token kerak');
  return token;
}

function idParam(req: Request): string {
  const id = req.params.id;
  if (!id) throw ApiError.badRequest('Id kerak');
  return id;
}

async function optionalIdentityId(req: Request): Promise<string | null> {
  if (req.personalAuth) return req.personalAuth.identityId;
  if (req.auth) {
    const row = await prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { identityId: true },
    });
    return row?.identityId ?? null;
  }

  const token = readAuthCookie(req);
  if (!token) return null;
  try {
    const session = await authenticate(token);
    if (isPersonalAuth(session.user)) return session.user.identityId;
    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { identityId: true },
    });
    return row?.identityId ?? null;
  } catch {
    return null;
  }
}

export const getCatalog = asyncHandler(async (req: Request, res: Response) => {
  const accountType =
    req.query.accountType === 'PERSONAL' || req.query.accountType === 'BUSINESS'
      ? req.query.accountType
      : null;
  const businessType = typeof req.query.businessType === 'string' ? req.query.businessType : null;
  sendSuccess(res, await getOnboardingCatalog({ accountType, businessType }));
});

export const postStart = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as OnboardingStartRequest;
  const identityId = await optionalIdentityId(req);
  const submission = await startOnboarding(body.experimentKey, identityId);
  sendCreated(res, { submission });
});

export const getSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await getOnboarding(tokenParam(req));
  sendSuccess(res, { submission });
});

export const patchAnswers = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SaveOnboardingAnswersRequest;
  const submission = await saveOnboardingAnswers(tokenParam(req), body);
  sendSuccess(res, { submission });
});

export const postCompleteRegister = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CompletePersonalOnboardingRequest;
  const attribution = readReferralAttribution(req);
  const created = await completePersonalOnboardingRegister(
    tokenParam(req),
    body,
    prisma,
    attribution,
  );
  const session = await issuePersonalSession(created.identity.id, created.workspace.id);
  setAuthCookie(res, session.accessToken.token, session.accessToken.expiresAt);
  sendCreated(res, { ...created, user: session.user });
});

export const postCompleteAuthenticated = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = (req.body ?? {}) as CompletePersonalOnboardingRequest;
  const created = await completePersonalOnboardingForUser(tokenParam(req), user.id, body);
  const session = await issuePersonalSession(created.identity.id, created.workspace.id);
  setAuthCookie(res, session.accessToken.token, session.accessToken.expiresAt);
  sendCreated(res, { ...created, user: session.user });
});

export const postCompleteBusiness = asyncHandler(async (req: Request, res: Response) => {
  const identityId = await optionalIdentityId(req);
  const submission = await completeBusinessOnboarding(tokenParam(req), identityId);
  sendSuccess(res, { submission });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getOnboardingStats();
  sendSuccess(res, stats);
});

export const getAdminQuestions = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { items: await listCatalogQuestions({ includeInactive: true }) });
});

export const postAdminQuestion = asyncHandler(async (req: Request, res: Response) => {
  const item = await createOnboardingQuestion(req.body as UpsertOnboardingQuestionRequest);
  sendCreated(res, { item });
});

export const patchAdminQuestion = asyncHandler(async (req: Request, res: Response) => {
  const item = await updateOnboardingQuestion(idParam(req), req.body as UpsertOnboardingQuestionRequest);
  sendSuccess(res, { item });
});

export const postAdminQuestionDeactivate = asyncHandler(async (req: Request, res: Response) => {
  const item = await deactivateOnboardingQuestion(idParam(req));
  sendSuccess(res, { item });
});

export const postAdminQuestionsReorder = asyncHandler(async (req: Request, res: Response) => {
  const items = await reorderOnboardingQuestions(req.body as ReorderOnboardingItemsRequest);
  sendSuccess(res, { items });
});

export const getAdminAnswers = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { items: await listOnboardingAnswers() });
});

export const getAdminNeeds = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { items: await listOnboardingNeeds() });
});

export const postAdminNeed = asyncHandler(async (req: Request, res: Response) => {
  const item = await createOnboardingNeed(req.body as UpsertOnboardingNeedRequest);
  sendCreated(res, { item });
});

export const patchAdminNeed = asyncHandler(async (req: Request, res: Response) => {
  const item = await updateOnboardingNeed(idParam(req), req.body as UpsertOnboardingNeedRequest);
  sendSuccess(res, { item });
});

export const postAdminNeedDeactivate = asyncHandler(async (req: Request, res: Response) => {
  const item = await deactivateOnboardingNeed(idParam(req));
  sendSuccess(res, { item });
});

export const postAdminNeedsReorder = asyncHandler(async (req: Request, res: Response) => {
  const items = await reorderLabeled('need', req.body as ReorderOnboardingItemsRequest);
  sendSuccess(res, { items });
});

export const getAdminSolutions = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { items: await listOnboardingSolutions() });
});

export const postAdminSolution = asyncHandler(async (req: Request, res: Response) => {
  const item = await createOnboardingSolution(req.body as UpsertOnboardingNeedRequest);
  sendCreated(res, { item });
});

export const patchAdminSolution = asyncHandler(async (req: Request, res: Response) => {
  const item = await updateOnboardingSolution(idParam(req), req.body as UpsertOnboardingNeedRequest);
  sendSuccess(res, { item });
});

export const postAdminSolutionDeactivate = asyncHandler(async (req: Request, res: Response) => {
  const item = await deactivateOnboardingSolution(idParam(req));
  sendSuccess(res, { item });
});

export const postAdminSolutionsReorder = asyncHandler(async (req: Request, res: Response) => {
  const items = await reorderLabeled('solution', req.body as ReorderOnboardingItemsRequest);
  sendSuccess(res, { items });
});

export const getAdminMappings = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { items: await listOnboardingMappings() });
});

export const postAdminMapping = asyncHandler(async (req: Request, res: Response) => {
  const item = await createOnboardingMapping(req.body as UpsertOnboardingMappingRequest);
  sendCreated(res, { item });
});

export const deleteAdminMapping = asyncHandler(async (req: Request, res: Response) => {
  await deleteOnboardingMapping(idParam(req));
  sendSuccess(res, { ok: true });
});
