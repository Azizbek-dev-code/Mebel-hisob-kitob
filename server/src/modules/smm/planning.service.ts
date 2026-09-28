import {
  AuditEntityType,
  AuditEventType,
  buildPaginationMeta,
  normalisePagination,
  type CreateSmmCampaignRequest,
  type CreateSmmContentPillarRequest,
  type CreateSmmContentPlanRequest,
  type PaginatedResult,
  type SmmCampaignDetail,
  type SmmCampaignListItem,
  type SmmCampaignListQuery,
  type SmmContentPillarDetail,
  type SmmContentPillarListItem,
  type SmmContentPlanDetail,
  type SmmContentPlanListItem,
  type SmmContentPlanSlotDto,
  type SmmContentPlanSlotInput,
  type UpdateSmmCampaignRequest,
  type UpdateSmmContentPillarRequest,
  type UpdateSmmContentPlanRequest,
} from '@furniture-erp/shared';
import { Prisma } from '@prisma/client';

import { parseFlexibleDate, parseFlexibleDateOrNull } from '../../lib/date-input.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import { resolveProjectAccess } from './smm.access.js';
import { writeSmmActivity } from './smm.activity.js';
import {
  mapCampaignDetail,
  mapCampaignListItem,
  mapPillarDetail,
  mapPillarListItem,
  mapPlanDetail,
  mapPlanListItem,
  mapPlanSlot,
} from './smm.mappers.js';
import { assertNotClient } from './smm.permissions.js';

function archiveWhere(includeArchived?: boolean) {
  if (includeArchived) return undefined;
  return { equals: null as Date | null };
}

// ---------------------------------------------------------------------------
// Pillars
// ---------------------------------------------------------------------------

export async function listPillars(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  includeArchived = false,
): Promise<SmmContentPillarListItem[]> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const rows = await prisma.smmContentPillar.findMany({
    where: {
      projectId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    include: { _count: { select: { contentItems: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(mapPillarListItem);
}

export async function createPillar(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmContentPillarRequest,
): Promise<SmmContentPillarDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmContentPillar.create({
    data: {
      projectId,
      name: body.name.trim(),
      description: body.description ?? null,
      color: body.color ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { _count: { select: { contentItems: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_PILLAR_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_PILLAR,
    entityId: row.id,
    summary: `Pillar created: ${row.name}`,
  });

  return mapPillarDetail(row);
}

export async function getPillar(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmContentPillarDetail> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const row = await prisma.smmContentPillar.findFirst({
    where: { id, projectId },
    include: { _count: { select: { contentItems: true } } },
  });
  if (!row) throw ApiError.notFound('Content pillar not found');
  return mapPillarDetail(row);
}

export async function updatePillar(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmContentPillarRequest,
): Promise<SmmContentPillarDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmContentPillar.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Content pillar not found');

  const row = await prisma.smmContentPillar.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: { _count: { select: { contentItems: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_PILLAR_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_PILLAR,
    entityId: row.id,
    summary: `Pillar updated: ${row.name}`,
  });

  return mapPillarDetail(row);
}

export async function archivePillar(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmContentPillarDetail> {
  return updatePillar(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function listCampaigns(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmCampaignListQuery,
): Promise<PaginatedResult<SmmCampaignListItem>> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmCampaignWhereInput = {
    projectId,
    archivedAt: archiveWhere(query.includeArchived),
  };
  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmCampaign.count({ where }),
    prisma.smmCampaign.findMany({
      where,
      include: { _count: { select: { contentItems: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapCampaignListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createCampaign(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmCampaignRequest,
): Promise<SmmCampaignDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmCampaign.create({
    data: {
      projectId,
      name: body.name.trim(),
      description: body.description ?? null,
      startDate: parseFlexibleDateOrNull(body.startDate) ?? null,
      endDate: parseFlexibleDateOrNull(body.endDate) ?? null,
      goal: body.goal ?? null,
      status: body.status ?? 'ACTIVE',
    },
    include: { _count: { select: { contentItems: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CAMPAIGN_CREATED,
    entityType: AuditEntityType.SMM_CAMPAIGN,
    entityId: row.id,
    summary: `Campaign created: ${row.name}`,
  });

  return mapCampaignDetail(row);
}

export async function getCampaign(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmCampaignDetail> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const row = await prisma.smmCampaign.findFirst({
    where: { id, projectId },
    include: { _count: { select: { contentItems: true } } },
  });
  if (!row) throw ApiError.notFound('Campaign not found');
  return mapCampaignDetail(row);
}

export async function updateCampaign(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmCampaignRequest,
): Promise<SmmCampaignDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmCampaign.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Campaign not found');

  const row = await prisma.smmCampaign.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.startDate !== undefined
        ? { startDate: parseFlexibleDateOrNull(body.startDate) ?? null }
        : {}),
      ...(body.endDate !== undefined
        ? { endDate: parseFlexibleDateOrNull(body.endDate) ?? null }
        : {}),
      ...(body.goal !== undefined ? { goal: body.goal } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: { _count: { select: { contentItems: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CAMPAIGN_UPDATED,
    entityType: AuditEntityType.SMM_CAMPAIGN,
    entityId: row.id,
    summary: `Campaign updated: ${row.name}`,
  });

  return mapCampaignDetail(row);
}

export async function archiveCampaign(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmCampaignDetail> {
  return updateCampaign(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Content plans + slots
// ---------------------------------------------------------------------------

async function loadPlanDetail(projectId: string, planId: string): Promise<SmmContentPlanDetail> {
  const row = await prisma.smmContentPlan.findFirst({
    where: { id: planId, projectId },
    include: { slots: { orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }] } },
  });
  if (!row) throw ApiError.notFound('Content plan not found');
  return mapPlanDetail(row);
}

function slotCreateData(slots: SmmContentPlanSlotInput[]) {
  return slots.map((slot, index) => ({
    date: parseFlexibleDate(slot.date)!,
    contentType: slot.contentType,
    platform: slot.platform ?? null,
    title: slot.title ?? null,
    notes: slot.notes ?? null,
    contentItemId: slot.contentItemId ?? null,
    sortOrder: slot.sortOrder ?? index,
  }));
}

export async function listPlans(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResult<SmmContentPlanListItem>> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const pagination = normalisePagination(page, pageSize);

  const where = { projectId };
  const [totalItems, rows] = await Promise.all([
    prisma.smmContentPlan.count({ where }),
    prisma.smmContentPlan.findMany({
      where,
      include: { _count: { select: { slots: true } } },
      orderBy: { periodStart: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    items: rows.map(mapPlanListItem),
    meta: buildPaginationMeta(pagination.page, pagination.pageSize, totalItems),
  };
}

export async function createPlan(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmContentPlanRequest,
): Promise<SmmContentPlanDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const plan = await prisma.smmContentPlan.create({
    data: {
      projectId,
      name: body.name.trim(),
      periodStart: parseFlexibleDate(body.periodStart)!,
      periodEnd: parseFlexibleDate(body.periodEnd)!,
      platforms: body.platforms,
      contentTypes: body.contentTypes,
      frequencyNotes: body.frequencyNotes ?? null,
      pillarIds: body.pillarIds ?? [],
      goals: body.goals ?? null,
      notes: body.notes ?? null,
      slots: body.slots?.length
        ? { create: slotCreateData(body.slots) }
        : undefined,
    },
    include: { slots: { orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }] } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_PLAN_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_PLAN,
    entityId: plan.id,
    summary: `Content plan created: ${plan.name}`,
  });

  return mapPlanDetail(plan);
}

export async function getPlan(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmContentPlanDetail> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  return loadPlanDetail(projectId, id);
}

export async function updatePlan(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmContentPlanRequest,
): Promise<SmmContentPlanDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmContentPlan.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Content plan not found');

  await prisma.$transaction(async (tx) => {
    await tx.smmContentPlan.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.periodStart !== undefined
          ? { periodStart: parseFlexibleDate(body.periodStart)! }
          : {}),
        ...(body.periodEnd !== undefined
          ? { periodEnd: parseFlexibleDate(body.periodEnd)! }
          : {}),
        ...(body.platforms !== undefined ? { platforms: body.platforms } : {}),
        ...(body.contentTypes !== undefined ? { contentTypes: body.contentTypes } : {}),
        ...(body.frequencyNotes !== undefined ? { frequencyNotes: body.frequencyNotes } : {}),
        ...(body.pillarIds !== undefined
          ? {
              pillarIds:
                body.pillarIds === null
                  ? Prisma.JsonNull
                  : (body.pillarIds as Prisma.InputJsonValue),
            }
          : {}),
        ...(body.goals !== undefined ? { goals: body.goals } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    if (body.slots) {
      await tx.smmContentPlanSlot.deleteMany({ where: { planId: id } });
      if (body.slots.length) {
        await tx.smmContentPlanSlot.createMany({
          data: slotCreateData(body.slots).map((slot) => ({ ...slot, planId: id })),
        });
      }
    }
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_PLAN_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_PLAN,
    entityId: id,
    summary: `Content plan updated: ${existing.name}`,
  });

  return loadPlanDetail(projectId, id);
}

export async function createPlanSlot(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  planId: string,
  body: SmmContentPlanSlotInput,
): Promise<SmmContentPlanSlotDto> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const plan = await prisma.smmContentPlan.findFirst({ where: { id: planId, projectId } });
  if (!plan) throw ApiError.notFound('Content plan not found');

  const slot = await prisma.smmContentPlanSlot.create({
    data: {
      planId,
      date: parseFlexibleDate(body.date)!,
      contentType: body.contentType,
      platform: body.platform ?? null,
      title: body.title ?? null,
      notes: body.notes ?? null,
      contentItemId: body.contentItemId ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return mapPlanSlot(slot);
}

export async function updatePlanSlot(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  planId: string,
  slotId: string,
  body: Partial<SmmContentPlanSlotInput>,
): Promise<SmmContentPlanSlotDto> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmContentPlanSlot.findFirst({
    where: { id: slotId, planId, plan: { projectId } },
  });
  if (!existing) throw ApiError.notFound('Plan slot not found');

  const slot = await prisma.smmContentPlanSlot.update({
    where: { id: slotId },
    data: {
      ...(body.date !== undefined ? { date: parseFlexibleDate(body.date)! } : {}),
      ...(body.contentType !== undefined ? { contentType: body.contentType } : {}),
      ...(body.platform !== undefined ? { platform: body.platform } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.contentItemId !== undefined ? { contentItemId: body.contentItemId } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return mapPlanSlot(slot);
}

export async function deletePlanSlot(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  planId: string,
  slotId: string,
): Promise<void> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmContentPlanSlot.findFirst({
    where: { id: slotId, planId, plan: { projectId } },
  });
  if (!existing) throw ApiError.notFound('Plan slot not found');

  await prisma.smmContentPlanSlot.delete({ where: { id: slotId } });
}
