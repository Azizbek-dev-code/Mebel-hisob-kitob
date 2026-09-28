import {
  AuditEntityType,
  AuditEventType,
  SmmContentStatus,
  buildPaginationMeta,
  normalisePagination,
  type CreateSmmAudienceSegmentRequest,
  type CreateSmmCompetitorRequest,
  type CreateSmmContentReferenceRequest,
  type CreateSmmPersonaRequest,
  type PaginatedResult,
  type SmmAudienceSegmentDetail,
  type SmmAudienceSegmentListItem,
  type SmmAudienceSegmentListQuery,
  type SmmCompetitorDetail,
  type SmmCompetitorListItem,
  type SmmCompetitorListQuery,
  type SmmContentItemDetail,
  type SmmContentReferenceDetail,
  type SmmContentReferenceListItem,
  type SmmContentReferenceListQuery,
  type SmmPersonaDetail,
  type SmmPersonaListItem,
  type SmmPersonaListQuery,
  type UpdateSmmAudienceSegmentRequest,
  type UpdateSmmCompetitorRequest,
  type UpdateSmmContentReferenceRequest,
  type UpdateSmmPersonaRequest,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDateOrNull } from '../../lib/date-input.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import { resolveProjectAccess, userSelect } from './smm.access.js';
import { writeSmmActivity } from './smm.activity.js';
import {
  mapAudienceDetail,
  mapAudienceListItem,
  mapCompetitorDetail,
  mapCompetitorListItem,
  mapContentDetail,
  mapPersonaDetail,
  mapPersonaListItem,
  mapReferenceDetail,
  mapReferenceListItem,
} from './smm.mappers.js';
import { assertCanViewCompetitors, assertNotClient } from './smm.permissions.js';

function archiveWhere(includeArchived?: boolean): Prisma.DateTimeNullableFilter | undefined {
  if (includeArchived) return undefined;
  return { equals: null };
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

export async function listAudience(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmAudienceSegmentListQuery,
): Promise<PaginatedResult<SmmAudienceSegmentListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  if (access.isClient) {
    return { items: [], meta: buildPaginationMeta(1, 20, 0) };
  }

  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmAudienceSegmentWhereInput = {
    projectId,
    archivedAt: archiveWhere(query.includeArchived),
  };
  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmAudienceSegment.count({ where }),
    prisma.smmAudienceSegment.findMany({
      where,
      include: { _count: { select: { personas: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapAudienceListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createAudience(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmAudienceSegmentRequest,
): Promise<SmmAudienceSegmentDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmAudienceSegment.create({
    data: {
      projectId,
      name: body.name.trim(),
      ageRange: body.ageRange ?? null,
      gender: body.gender ?? null,
      location: body.location ?? null,
      income: body.income ?? null,
      occupation: body.occupation ?? null,
      interests: body.interests ?? [],
      painPoints: body.painPoints ?? null,
      needs: body.needs ?? null,
      desires: body.desires ?? null,
      objections: body.objections ?? null,
      buyingMotivation: body.buyingMotivation ?? null,
      buyingBehavior: body.buyingBehavior ?? null,
      contentPreferences: body.contentPreferences ?? null,
      researchSources: body.researchSources ?? null,
      notes: body.notes ?? null,
      insights: (body.insights ?? []) as unknown as Prisma.InputJsonValue,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { _count: { select: { personas: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_AUDIENCE_SEGMENT_CREATED,
    entityType: AuditEntityType.SMM_AUDIENCE_SEGMENT,
    entityId: row.id,
    summary: `Audience segment created: ${row.name}`,
  });

  return mapAudienceDetail(row);
}

export async function getAudience(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmAudienceSegmentDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmAudienceSegment.findFirst({
    where: { id, projectId },
    include: { _count: { select: { personas: true } } },
  });
  if (!row) throw ApiError.notFound('Audience segment not found');
  return mapAudienceDetail(row);
}

export async function updateAudience(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmAudienceSegmentRequest,
): Promise<SmmAudienceSegmentDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmAudienceSegment.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Audience segment not found');

  const row = await prisma.smmAudienceSegment.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.ageRange !== undefined ? { ageRange: body.ageRange } : {}),
      ...(body.gender !== undefined ? { gender: body.gender } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.income !== undefined ? { income: body.income } : {}),
      ...(body.occupation !== undefined ? { occupation: body.occupation } : {}),
      ...(body.interests !== undefined ? { interests: body.interests } : {}),
      ...(body.painPoints !== undefined ? { painPoints: body.painPoints } : {}),
      ...(body.needs !== undefined ? { needs: body.needs } : {}),
      ...(body.desires !== undefined ? { desires: body.desires } : {}),
      ...(body.objections !== undefined ? { objections: body.objections } : {}),
      ...(body.buyingMotivation !== undefined ? { buyingMotivation: body.buyingMotivation } : {}),
      ...(body.buyingBehavior !== undefined ? { buyingBehavior: body.buyingBehavior } : {}),
      ...(body.contentPreferences !== undefined
        ? { contentPreferences: body.contentPreferences }
        : {}),
      ...(body.researchSources !== undefined ? { researchSources: body.researchSources } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.insights !== undefined
        ? { insights: body.insights as unknown as Prisma.InputJsonValue }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: { _count: { select: { personas: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_AUDIENCE_SEGMENT_UPDATED,
    entityType: AuditEntityType.SMM_AUDIENCE_SEGMENT,
    entityId: row.id,
    summary: `Audience segment updated: ${row.name}`,
  });

  return mapAudienceDetail(row);
}

export async function archiveAudience(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmAudienceSegmentDetail> {
  return updateAudience(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export async function listPersonas(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmPersonaListQuery,
): Promise<PaginatedResult<SmmPersonaListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  if (access.isClient) {
    return { items: [], meta: buildPaginationMeta(1, 20, 0) };
  }

  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmPersonaWhereInput = {
    projectId,
    archivedAt: archiveWhere(query.includeArchived),
  };
  if (query.segmentId) where.segmentId = query.segmentId;
  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmPersona.count({ where }),
    prisma.smmPersona.findMany({
      where,
      include: { segment: { select: { name: true } } },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapPersonaListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createPersona(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmPersonaRequest,
): Promise<SmmPersonaDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  if (body.segmentId) {
    const segment = await prisma.smmAudienceSegment.findFirst({
      where: { id: body.segmentId, projectId },
    });
    if (!segment) throw ApiError.validation('Audience segment not found in this project');
  }

  const row = await prisma.smmPersona.create({
    data: {
      projectId,
      name: body.name.trim(),
      segmentId: body.segmentId ?? null,
      ageRange: body.ageRange ?? null,
      gender: body.gender ?? null,
      location: body.location ?? null,
      occupation: body.occupation ?? null,
      income: body.income ?? null,
      problems: body.problems ?? null,
      needs: body.needs ?? null,
      motivation: body.motivation ?? null,
      objections: body.objections ?? null,
      preferredContent: body.preferredContent ?? null,
      notes: body.notes ?? null,
    },
    include: { segment: { select: { name: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PERSONA_CREATED,
    entityType: AuditEntityType.SMM_PERSONA,
    entityId: row.id,
    summary: `Persona created: ${row.name}`,
  });

  return mapPersonaDetail(row);
}

export async function getPersona(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmPersonaDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmPersona.findFirst({
    where: { id, projectId },
    include: { segment: { select: { name: true } } },
  });
  if (!row) throw ApiError.notFound('Persona not found');
  return mapPersonaDetail(row);
}

export async function updatePersona(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmPersonaRequest,
): Promise<SmmPersonaDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmPersona.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Persona not found');

  if (body.segmentId) {
    const segment = await prisma.smmAudienceSegment.findFirst({
      where: { id: body.segmentId, projectId },
    });
    if (!segment) throw ApiError.validation('Audience segment not found in this project');
  }

  const row = await prisma.smmPersona.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.segmentId !== undefined ? { segmentId: body.segmentId } : {}),
      ...(body.ageRange !== undefined ? { ageRange: body.ageRange } : {}),
      ...(body.gender !== undefined ? { gender: body.gender } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.occupation !== undefined ? { occupation: body.occupation } : {}),
      ...(body.income !== undefined ? { income: body.income } : {}),
      ...(body.problems !== undefined ? { problems: body.problems } : {}),
      ...(body.needs !== undefined ? { needs: body.needs } : {}),
      ...(body.motivation !== undefined ? { motivation: body.motivation } : {}),
      ...(body.objections !== undefined ? { objections: body.objections } : {}),
      ...(body.preferredContent !== undefined ? { preferredContent: body.preferredContent } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: { segment: { select: { name: true } } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PERSONA_UPDATED,
    entityType: AuditEntityType.SMM_PERSONA,
    entityId: row.id,
    summary: `Persona updated: ${row.name}`,
  });

  return mapPersonaDetail(row);
}

export async function archivePersona(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmPersonaDetail> {
  return updatePersona(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export async function listCompetitors(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmCompetitorListQuery,
): Promise<PaginatedResult<SmmCompetitorListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCompetitors(access);

  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmCompetitorWhereInput = {
    projectId,
    archivedAt: archiveWhere(query.includeArchived),
  };
  if (query.platform && query.platform !== 'ALL') where.platform = query.platform;
  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmCompetitor.count({ where }),
    prisma.smmCompetitor.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapCompetitorListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createCompetitor(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmCompetitorRequest,
): Promise<SmmCompetitorDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCompetitors(access);

  const row = await prisma.smmCompetitor.create({
    data: {
      projectId,
      name: body.name.trim(),
      platform: body.platform,
      profileUrl: body.profileUrl || null,
      followers: body.followers ?? null,
      postingFrequency: body.postingFrequency ?? null,
      contentFormats: body.contentFormats ?? null,
      engagement: body.engagement ?? null,
      offers: body.offers ?? null,
      pricing: body.pricing ?? null,
      positioning: body.positioning ?? null,
      strengths: body.strengths ?? null,
      weaknesses: body.weaknesses ?? null,
      bestContent: body.bestContent ?? null,
      hooks: body.hooks ?? null,
      notes: body.notes ?? null,
      researchDate: parseFlexibleDateOrNull(body.researchDate) ?? null,
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_COMPETITOR_CREATED,
    entityType: AuditEntityType.SMM_COMPETITOR,
    entityId: row.id,
    summary: `Competitor created: ${row.name}`,
  });

  return mapCompetitorDetail(row);
}

export async function getCompetitor(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmCompetitorDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCompetitors(access);

  const row = await prisma.smmCompetitor.findFirst({ where: { id, projectId } });
  if (!row) throw ApiError.notFound('Competitor not found');
  return mapCompetitorDetail(row);
}

export async function updateCompetitor(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmCompetitorRequest,
): Promise<SmmCompetitorDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCompetitors(access);

  const existing = await prisma.smmCompetitor.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Competitor not found');

  const row = await prisma.smmCompetitor.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.platform !== undefined ? { platform: body.platform } : {}),
      ...(body.profileUrl !== undefined ? { profileUrl: body.profileUrl || null } : {}),
      ...(body.followers !== undefined ? { followers: body.followers } : {}),
      ...(body.postingFrequency !== undefined ? { postingFrequency: body.postingFrequency } : {}),
      ...(body.contentFormats !== undefined ? { contentFormats: body.contentFormats } : {}),
      ...(body.engagement !== undefined ? { engagement: body.engagement } : {}),
      ...(body.offers !== undefined ? { offers: body.offers } : {}),
      ...(body.pricing !== undefined ? { pricing: body.pricing } : {}),
      ...(body.positioning !== undefined ? { positioning: body.positioning } : {}),
      ...(body.strengths !== undefined ? { strengths: body.strengths } : {}),
      ...(body.weaknesses !== undefined ? { weaknesses: body.weaknesses } : {}),
      ...(body.bestContent !== undefined ? { bestContent: body.bestContent } : {}),
      ...(body.hooks !== undefined ? { hooks: body.hooks } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.researchDate !== undefined
        ? { researchDate: parseFlexibleDateOrNull(body.researchDate) ?? null }
        : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_COMPETITOR_UPDATED,
    entityType: AuditEntityType.SMM_COMPETITOR,
    entityId: row.id,
    summary: `Competitor updated: ${row.name}`,
  });

  return mapCompetitorDetail(row);
}

export async function archiveCompetitor(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmCompetitorDetail> {
  return updateCompetitor(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Content references
// ---------------------------------------------------------------------------

export async function listReferences(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmContentReferenceListQuery,
): Promise<PaginatedResult<SmmContentReferenceListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmContentReferenceWhereInput = {
    projectId,
    archivedAt: archiveWhere(query.includeArchived),
  };
  if (query.platform && query.platform !== 'ALL') where.platform = query.platform;
  if (query.contentType && query.contentType !== 'ALL') where.contentType = query.contentType;
  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { topic: { contains: q, mode: 'insensitive' } },
      { creatorName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmContentReference.count({ where }),
    prisma.smmContentReference.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapReferenceListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createReference(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmContentReferenceRequest,
): Promise<SmmContentReferenceDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmContentReference.create({
    data: {
      projectId,
      title: body.title.trim(),
      platform: body.platform,
      contentType: body.contentType,
      sourceUrl: body.sourceUrl ?? null,
      creatorName: body.creatorName ?? null,
      topic: body.topic ?? null,
      hook: body.hook ?? null,
      format: body.format ?? null,
      goal: body.goal ?? null,
      whySaved: body.whySaved ?? null,
      tags: body.tags ?? [],
      notes: body.notes ?? null,
      mediaKey: body.mediaKey ?? null,
      mediaUrl: body.mediaUrl ?? null,
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_REFERENCE_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_REFERENCE,
    entityId: row.id,
    summary: `Reference created: ${row.title}`,
  });

  return mapReferenceDetail(row);
}

export async function getReference(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmContentReferenceDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const row = await prisma.smmContentReference.findFirst({ where: { id, projectId } });
  if (!row) throw ApiError.notFound('Content reference not found');
  return mapReferenceDetail(row);
}

export async function updateReference(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
  body: UpdateSmmContentReferenceRequest,
): Promise<SmmContentReferenceDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmContentReference.findFirst({ where: { id, projectId } });
  if (!existing) throw ApiError.notFound('Content reference not found');

  const row = await prisma.smmContentReference.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.platform !== undefined ? { platform: body.platform } : {}),
      ...(body.contentType !== undefined ? { contentType: body.contentType } : {}),
      ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
      ...(body.creatorName !== undefined ? { creatorName: body.creatorName } : {}),
      ...(body.topic !== undefined ? { topic: body.topic } : {}),
      ...(body.hook !== undefined ? { hook: body.hook } : {}),
      ...(body.format !== undefined ? { format: body.format } : {}),
      ...(body.goal !== undefined ? { goal: body.goal } : {}),
      ...(body.whySaved !== undefined ? { whySaved: body.whySaved } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.mediaKey !== undefined ? { mediaKey: body.mediaKey } : {}),
      ...(body.mediaUrl !== undefined ? { mediaUrl: body.mediaUrl } : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_REFERENCE_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_REFERENCE,
    entityId: row.id,
    summary: `Reference updated: ${row.title}`,
  });

  return mapReferenceDetail(row);
}

export async function archiveReference(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  id: string,
): Promise<SmmContentReferenceDetail> {
  return updateReference(storeId, userId, userRole, projectId, id, {
    archivedAt: new Date().toISOString(),
  });
}

export async function duplicateIdeaFromReference(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  referenceId: string,
): Promise<SmmContentItemDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const reference = await prisma.smmContentReference.findFirst({
    where: { id: referenceId, projectId },
  });
  if (!reference) throw ApiError.notFound('Content reference not found');

  const item = await prisma.smmContentItem.create({
    data: {
      projectId,
      title: reference.title,
      platform: reference.platform,
      contentType: reference.contentType,
      status: SmmContentStatus.IDEA,
      referenceId: reference.id,
      topic: reference.topic,
      hook: reference.hook,
      format: reference.format,
      goal: reference.goal,
      notes: reference.notes,
      createdById: userId,
    },
    include: {
      campaign: { select: { name: true } },
      pillar: { select: { name: true } },
      createdBy: { select: userSelect },
      blocks: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { assignments: true } },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Idea created from reference: ${reference.title}`,
  });

  return mapContentDetail(item);
}
