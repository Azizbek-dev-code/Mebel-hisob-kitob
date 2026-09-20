import {
  AppFeedbackKind,
  type AppFeedbackDto,
  type AppFeedbackListResponse,
  type AppFeedbackPromptStatus,
  type CreateAppFeedbackRequest,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

function toDto(row: {
  id: string;
  kind: string;
  body: string;
  rating: number | null;
  isPublic: boolean;
  createdAt: Date;
  _count?: { reactions: number; views: number };
}): AppFeedbackDto {
  return {
    id: row.id,
    kind: row.kind as AppFeedbackKind,
    body: row.body,
    rating: row.rating,
    isPublic: row.isPublic,
    likeCount: row._count?.reactions ?? 0,
    viewCount: row._count?.views ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getFeedbackPromptStatus(
  identityId: string,
  canWrite: boolean,
  db: PrismaClient = defaultPrisma,
): Promise<AppFeedbackPromptStatus> {
  const identity = await db.identity.findUnique({
    where: { id: identityId },
    select: {
      createdAt: true,
      feedbackOnboardingDismissedAt: true,
      feedbackOutcomeDismissedAt: true,
    },
  });
  const existing = await db.appFeedback.findMany({
    where: { identityId },
    select: { kind: true },
  });
  const kinds = new Set(existing.map((row) => row.kind));
  const showOnboarding =
    !identity?.feedbackOnboardingDismissedAt && !kinds.has(AppFeedbackKind.ONBOARDING_EXPECTATION);
  const showOutcome =
    !canWrite &&
    !identity?.feedbackOutcomeDismissedAt &&
    !kinds.has(AppFeedbackKind.SUBSCRIPTION_OUTCOME);
  return { showOnboarding, showOutcome };
}

export async function dismissFeedbackPrompt(
  identityId: string,
  kind: 'onboarding' | 'outcome',
  db: PrismaClient = defaultPrisma,
): Promise<void> {
  await db.identity.update({
    where: { id: identityId },
    data:
      kind === 'onboarding'
        ? { feedbackOnboardingDismissedAt: new Date() }
        : { feedbackOutcomeDismissedAt: new Date() },
  });
}

export async function listMyFeedback(
  identityId: string,
  db: PrismaClient = defaultPrisma,
): Promise<AppFeedbackListResponse> {
  const items = await db.appFeedback.findMany({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { _count: { select: { reactions: true, views: true } } },
  });
  return { items: items.map(toDto) };
}

export async function createFeedback(
  identityId: string,
  body: CreateAppFeedbackRequest,
  db: PrismaClient = defaultPrisma,
): Promise<AppFeedbackDto> {
  const text = body.body.trim();
  if (text.length < 2) throw ApiError.badRequest('Fikr juda qisqa');
  const rating =
    body.rating == null ? null : Math.min(5, Math.max(1, Math.round(body.rating)));
  const row = await db.appFeedback.create({
    data: {
      identityId,
      kind: body.kind,
      body: text.slice(0, 2000),
      rating,
      isPublic: Boolean(body.isPublic),
    },
    include: { _count: { select: { reactions: true, views: true } } },
  });
  if (body.kind === AppFeedbackKind.ONBOARDING_EXPECTATION) {
    await db.identity.update({
      where: { id: identityId },
      data: { feedbackOnboardingDismissedAt: new Date() },
    });
  }
  if (body.kind === AppFeedbackKind.SUBSCRIPTION_OUTCOME) {
    await db.identity.update({
      where: { id: identityId },
      data: { feedbackOutcomeDismissedAt: new Date() },
    });
  }
  return toDto(row);
}
