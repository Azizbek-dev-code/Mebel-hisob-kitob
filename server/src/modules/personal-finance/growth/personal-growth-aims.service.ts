import {
  GrowthAimStatus,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  XP_MILESTONE_REACHED,
  type CreateGrowthAimRequest,
  type GrowthAimDto,
  type GrowthAimListResponse,
  type UpdateGrowthAimRequest,
} from '@furniture-erp/shared';
import type { GrowthAim, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryAwardXp } from './personal-growth-xp.service.js';

type DbClient = Pick<PrismaClient, 'workspace' | 'growthAim'>;

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

function toDto(row: GrowthAim): GrowthAimDto {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    status: row.status as GrowthAimStatus,
    targetDate: row.targetDate ? row.targetDate.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseOptionalDate(value: string | null | undefined, field: string): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`${field} noto‘g‘ri`);
  return date;
}

export async function listGrowthAims(
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthAimListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const rows = await db.growthAim.findMany({
    where: { workspaceId, status: { not: GrowthAimStatus.ARCHIVED } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  return { items: rows.map(toDto) };
}

export async function createGrowthAim(
  workspaceId: string,
  identityId: string,
  input: CreateGrowthAimRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthAimDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const title = input.title.trim();
  if (title.length < 2) {
    throw ApiError.validation('Maqsad nomini kiriting', [{ field: 'title', message: 'Kamida 2 belgi' }]);
  }
  const row = await db.growthAim.create({
    data: {
      workspaceId,
      title,
      note: input.note?.trim() || null,
      targetDate: parseOptionalDate(input.targetDate, 'targetDate'),
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_AIM_CREATED',
    entityType: 'GROWTH_AIM',
    entityId: row.id,
    summary: `Growth aim created: ${row.title}`,
    metadata: { workspaceId, identityId },
  });
  return toDto(row);
}

export async function updateGrowthAim(
  workspaceId: string,
  identityId: string,
  id: string,
  input: UpdateGrowthAimRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthAimDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.growthAim.findFirst({ where: { id, workspaceId } });
  if (!existing) throw ApiError.notFound('Maqsad topilmadi');

  const nextStatus = input.status ?? (existing.status as GrowthAimStatus);
  const completing =
    existing.status !== GrowthAimStatus.COMPLETED && nextStatus === GrowthAimStatus.COMPLETED;

  const row = await db.growthAim.update({
    where: { id: existing.id },
    data: {
      title: input.title?.trim() ?? existing.title,
      note: input.note === undefined ? existing.note : input.note?.trim() || null,
      targetDate:
        input.targetDate === undefined
          ? existing.targetDate
          : parseOptionalDate(input.targetDate, 'targetDate'),
      status: nextStatus,
      completedAt: completing ? new Date() : nextStatus === GrowthAimStatus.ACTIVE ? null : existing.completedAt,
    },
  });

  if (completing) {
    await tryAwardXp({
      workspaceId,
      identityId,
      source: GrowthXpSource.MILESTONE_REACHED,
      sourceEntityId: `aim:${row.id}`,
      amount: XP_MILESTONE_REACHED,
      summary: 'Growth aim completed',
    });
  }

  return toDto(row);
}
