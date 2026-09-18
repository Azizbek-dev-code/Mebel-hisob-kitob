import {
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  baseXpForSource,
  clampXpToDailyCap,
  computeLevelProgress,
  nextStreakState,
  toDayKey,
  xpForFocusMinutes,
  xpForLearningMinutes,
  type GrowthProgressDto,
  type GrowthXpEventDto,
  type GrowthXpSource as XpSource,
} from '@furniture-erp/shared';
import type { GrowthProgress, GrowthXpEvent, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { logger } from '../../../utils/logger.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  growthProgress: {
    findUnique: PrismaClient['growthProgress']['findUnique'];
    create: PrismaClient['growthProgress']['create'];
    update: PrismaClient['growthProgress']['update'];
  };
  growthXpEvent: {
    findUnique: PrismaClient['growthXpEvent']['findUnique'];
    findMany: PrismaClient['growthXpEvent']['findMany'];
    create: PrismaClient['growthXpEvent']['create'];
    aggregate: PrismaClient['growthXpEvent']['aggregate'];
  };
};

export type AwardXpInput = {
  workspaceId: string;
  identityId: string;
  source: XpSource;
  sourceEntityId: string;
  amount?: number;
  summary?: string;
  dayKey?: string;
};

function toEventDto(row: GrowthXpEvent): GrowthXpEventDto {
  return {
    id: row.id,
    source: row.source as XpSource,
    amount: row.amount,
    sourceEntityId: row.sourceEntityId,
    dayKey: row.dayKey,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProgressDto(
  row: GrowthProgress,
  todayXp: number,
  recentEvents: GrowthXpEvent[],
): GrowthProgressDto {
  const level = computeLevelProgress(row.totalXp);
  return {
    totalXp: row.totalXp,
    level: level.level,
    xpIntoLevel: level.xpIntoLevel,
    xpForNextLevel: level.xpForNextLevel,
    percent: level.percent,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
    lastActivityDayKey: row.lastActivityDayKey,
    todayXp,
    recentEvents: recentEvents.map(toEventDto),
  };
}

async function assertPersonalWorkspace(workspaceId: string, db: DbClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

async function ensureProgress(
  workspaceId: string,
  identityId: string,
  db: DbClient,
): Promise<GrowthProgress> {
  const existing = await db.growthProgress.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return db.growthProgress.create({
    data: { workspaceId, identityId },
  });
}

async function sumXpForDay(
  workspaceId: string,
  dayKey: string,
  db: DbClient,
): Promise<number> {
  const agg = await db.growthXpEvent.aggregate({
    where: { workspaceId, dayKey },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

function resolveAmount(source: XpSource, amount: number | undefined): number {
  if (amount != null && Number.isFinite(amount)) {
    return Math.max(0, Math.floor(amount));
  }
  if (source === GrowthXpSource.FOCUS_COMPLETED || source === GrowthXpSource.LEARNING_SESSION) {
    return 0;
  }
  return baseXpForSource(source);
}

/**
 * Idempotent XP award. Caps to daily limit. Updates streak + level cache.
 */
export async function awardXp(
  input: AwardXpInput,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<{ awarded: number; progress: GrowthProgressDto } | null> {
  await assertPersonalWorkspace(input.workspaceId, db);

  const dayKey = input.dayKey ?? toDayKey(now);
  const proposed = resolveAmount(input.source, input.amount);
  if (proposed <= 0 || !input.sourceEntityId.trim()) {
    return null;
  }

  const dup = await db.growthXpEvent.findUnique({
    where: {
      workspaceId_source_sourceEntityId: {
        workspaceId: input.workspaceId,
        source: input.source,
        sourceEntityId: input.sourceEntityId,
      },
    },
  });
  if (dup) {
    const progress = await getGrowthProgress(input.workspaceId, input.identityId, db, now);
    return { awarded: 0, progress };
  }

  const alreadyToday = await sumXpForDay(input.workspaceId, dayKey, db);
  const awarded = clampXpToDailyCap(proposed, alreadyToday);
  if (awarded <= 0) {
    return null;
  }

  let progressRow = await ensureProgress(input.workspaceId, input.identityId, db);
  const streak = nextStreakState({
    todayKey: dayKey,
    lastActivityDayKey: progressRow.lastActivityDayKey,
    currentStreak: progressRow.currentStreak,
    bestStreak: progressRow.bestStreak,
  });

  await db.growthXpEvent.create({
    data: {
      workspaceId: input.workspaceId,
      identityId: input.identityId,
      source: input.source,
      amount: awarded,
      sourceEntityId: input.sourceEntityId,
      dayKey,
      summary: input.summary?.slice(0, 200) ?? null,
    },
  });

  const totalXp = progressRow.totalXp + awarded;
  const level = computeLevelProgress(totalXp).level;
  progressRow = await db.growthProgress.update({
    where: { workspaceId: input.workspaceId },
    data: {
      totalXp,
      level,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      lastActivityDayKey: streak.lastActivityDayKey,
      identityId: input.identityId,
    },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_XP_AWARDED',
    entityType: 'GROWTH_XP_EVENT',
    entityId: input.sourceEntityId,
    summary: `+${awarded} XP (${input.source})`,
    metadata: {
      workspaceId: input.workspaceId,
      identityId: input.identityId,
      source: input.source,
      awarded,
    },
  });

  const recent = await db.growthXpEvent.findMany({
    where: { workspaceId: input.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  const result = {
    awarded,
    progress: toProgressDto(progressRow, alreadyToday + awarded, recent),
  };

  if (
    input.source !== GrowthXpSource.ACHIEVEMENT_UNLOCKED &&
    process.env.VITEST !== 'true'
  ) {
    void (async () => {
      try {
        const mod = await import('./personal-growth-achievements.service.js');
        await mod.tryEvaluateAchievements(input.workspaceId, input.identityId);
      } catch {
        /* ignore */
      }
    })();
  }

  return result;
}

/** Soft wrapper so activity flows never fail if XP write has a glitch. */
export async function tryAwardXp(
  input: AwardXpInput,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<void> {
  try {
    await awardXp(input, db, now);
  } catch (error) {
    logger.error('Failed to award growth XP', {
      workspaceId: input.workspaceId,
      source: input.source,
      sourceEntityId: input.sourceEntityId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getGrowthProgress(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthProgressDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const dayKey = toDayKey(now);
  const progressRow = await ensureProgress(workspaceId, identityId, db);
  const level = computeLevelProgress(progressRow.totalXp);
  if (progressRow.level !== level.level) {
    await db.growthProgress.update({
      where: { workspaceId },
      data: { level: level.level },
    });
    progressRow.level = level.level;
  }

  const [todayXp, recent] = await Promise.all([
    sumXpForDay(workspaceId, dayKey, db),
    db.growthXpEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return toProgressDto(progressRow, todayXp, recent);
}

export function focusXpAmount(creditedMinutes: number): number {
  return xpForFocusMinutes(creditedMinutes);
}

export function learningXpAmount(creditedMinutes: number): number {
  return xpForLearningMinutes(creditedMinutes);
}
