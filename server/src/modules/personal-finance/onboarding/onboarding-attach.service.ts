import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import { AccountPurpose, OnboardingSubmissionStatus } from '@furniture-erp/shared';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Bind a completed BUSINESS onboarding row to the workspace that was just created.
 * Personal submissions are left untouched.
 */
export async function attachBusinessOnboardingWorkspace(
  identityId: string,
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  const candidates = await db.onboardingSubmission.findMany({
    where: {
      identityId,
      workspaceId: null,
      status: OnboardingSubmissionStatus.COMPLETED,
    },
    select: { id: true, answers: true, completedAt: true },
    orderBy: { completedAt: 'desc' },
  });

  const match = candidates.find((row) => {
    const answers = row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
      ? (row.answers as Record<string, unknown>)
      : {};
    return answers.purpose === AccountPurpose.BUSINESS;
  });

  if (!match) return;

  await db.onboardingSubmission.update({
    where: { id: match.id },
    data: { workspaceId },
  });
}
