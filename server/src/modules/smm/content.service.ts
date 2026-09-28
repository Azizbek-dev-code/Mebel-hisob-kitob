import {
  AuditEntityType,
  AuditEventType,
  SmmContentStatus,
  buildPaginationMeta,
  canTransitionSmmContentStatus,
  normalisePagination,
  type CreateSmmContentItemRequest,
  type PaginatedResult,
  type SmmContentBlockInput,
  type SmmContentItemDetail,
  type SmmContentItemListItem,
  type SmmContentItemListQuery,
  type TransitionSmmContentStatusRequest,
  type UpdateSmmContentItemRequest,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDate, parseFlexibleDateOrNull } from '../../lib/date-input.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import { requireContentInStore, resolveProjectAccess, userSelect } from './smm.access.js';
import { writeSmmActivity } from './smm.activity.js';
import { mapContentDetail, mapContentListItem } from './smm.mappers.js';
import {
  assertNotClient,
  canClientSeeContentStatus,
  clientContentStatusWhere,
} from './smm.permissions.js';

export type ContentListFilters = SmmContentItemListQuery & {
  audienceSegmentId?: string;
  assignedUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'publishAt_asc' | 'publishAt_desc' | 'updatedAt_desc' | 'title_asc' | 'status_asc';
};

export type CalendarQuery = ContentListFilters & {
  view?: 'month' | 'week' | 'day' | 'list';
  from?: string;
  to?: string;
};

const contentDetailInclude = {
  campaign: { select: { name: true } },
  pillar: { select: { name: true } },
  createdBy: { select: userSelect },
  blocks: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { assignments: true } },
} satisfies Prisma.SmmContentItemInclude;

function buildContentWhere(
  projectId: string,
  query: ContentListFilters,
  isClient: boolean,
): Prisma.SmmContentItemWhereInput {
  const where: Prisma.SmmContentItemWhereInput = {
    projectId,
    ...(query.includeArchived ? {} : { archivedAt: null }),
  };

  if (isClient) {
    Object.assign(where, clientContentStatusWhere());
  } else if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.platform && query.platform !== 'ALL') where.platform = query.platform;
  if (query.contentType && query.contentType !== 'ALL') where.contentType = query.contentType;
  if (query.campaignId) where.campaignId = query.campaignId;
  if (query.pillarId) where.pillarId = query.pillarId;
  if (query.audienceSegmentId) where.audienceSegmentId = query.audienceSegmentId;

  if (query.assignedUserId) {
    where.assignments = { some: { userId: query.assignedUserId } };
  }

  const dateFrom = query.dateFrom ? parseFlexibleDate(query.dateFrom) : undefined;
  const dateTo = query.dateTo ? parseFlexibleDate(query.dateTo) : undefined;
  if (dateFrom || dateTo) {
    where.publishAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { topic: { contains: q, mode: 'insensitive' } },
      { hook: { contains: q, mode: 'insensitive' } },
      { caption: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function contentOrderBy(
  sort?: ContentListFilters['sort'],
): Prisma.SmmContentItemOrderByWithRelationInput {
  switch (sort) {
    case 'publishAt_asc':
      return { publishAt: 'asc' };
    case 'publishAt_desc':
      return { publishAt: 'desc' };
    case 'title_asc':
      return { title: 'asc' };
    case 'status_asc':
      return { status: 'asc' };
    case 'updatedAt_desc':
    default:
      return { updatedAt: 'desc' };
  }
}

function blocksCreateData(blocks: SmmContentBlockInput[]) {
  return blocks.map((block, index) => ({
    kind: block.kind,
    title: block.title ?? null,
    body: block.body ?? null,
    visualDirection: block.visualDirection ?? null,
    referenceText: block.referenceText ?? null,
    sortOrder: block.sortOrder ?? index,
  }));
}

export async function listContent(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: ContentListFilters,
): Promise<PaginatedResult<SmmContentItemListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where = buildContentWhere(projectId, query, access.isClient);

  const [totalItems, rows] = await Promise.all([
    prisma.smmContentItem.count({ where }),
    prisma.smmContentItem.findMany({
      where,
      include: {
        campaign: { select: { name: true } },
        pillar: { select: { name: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: contentOrderBy(query.sort),
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapContentListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function listCalendar(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: CalendarQuery,
): Promise<{ items: SmmContentItemListItem[]; view: string }> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });

  const filters: ContentListFilters = {
    ...query,
    dateFrom: query.from ?? query.dateFrom,
    dateTo: query.to ?? query.dateTo,
    pageSize: 500,
    page: 1,
  };
  const where = buildContentWhere(projectId, filters, access.isClient);

  const rows = await prisma.smmContentItem.findMany({
    where,
    include: {
      campaign: { select: { name: true } },
      pillar: { select: { name: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: [{ publishAt: 'asc' }, { title: 'asc' }],
    take: 500,
  });

  return {
    items: rows.map(mapContentListItem),
    view: query.view ?? 'month',
  };
}

export async function createContent(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: CreateSmmContentItemRequest,
): Promise<SmmContentItemDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const item = await prisma.smmContentItem.create({
    data: {
      projectId,
      title: body.title.trim(),
      platform: body.platform,
      contentType: body.contentType,
      campaignId: body.campaignId ?? null,
      publishAt: parseFlexibleDateOrNull(body.publishAt) ?? null,
      goal: body.goal ?? null,
      topic: body.topic ?? null,
      expectedResult: body.expectedResult ?? null,
      audienceSegmentId: body.audienceSegmentId ?? null,
      personaId: body.personaId ?? null,
      pillarId: body.pillarId ?? null,
      status: body.status ?? SmmContentStatus.IDEA,
      referenceId: body.referenceId ?? null,
      notes: body.notes ?? null,
      format: body.format ?? null,
      hook: body.hook ?? null,
      body: body.body ?? null,
      cta: body.cta ?? null,
      caption: body.caption ?? null,
      scriptNotes: body.scriptNotes ?? null,
      shotList: body.shotList ?? null,
      productionNotes: body.productionNotes ?? null,
      headline: body.headline ?? null,
      visualBrief: body.visualBrief ?? null,
      extras: (body.extras ?? undefined) as Prisma.InputJsonValue | undefined,
      createdById: userId,
      blocks: body.blocks?.length ? { create: blocksCreateData(body.blocks) } : undefined,
    },
    include: contentDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Content created: ${item.title}`,
  });

  return mapContentDetail(item);
}

export async function getContent(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentItemDetail> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });

  if (access.isClient && !canClientSeeContentStatus(item.status)) {
    throw ApiError.forbidden('Clients cannot view this content item');
  }

  return mapContentDetail(item, { hideInternalNotes: access.isClient });
}

export async function updateContent(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: UpdateSmmContentItemRequest,
): Promise<SmmContentItemDetail> {
  const existing = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertNotClient(access);

  const item = await prisma.smmContentItem.update({
    where: { id: contentId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.platform !== undefined ? { platform: body.platform } : {}),
      ...(body.contentType !== undefined ? { contentType: body.contentType } : {}),
      ...(body.campaignId !== undefined ? { campaignId: body.campaignId } : {}),
      ...(body.publishAt !== undefined
        ? { publishAt: parseFlexibleDateOrNull(body.publishAt) ?? null }
        : {}),
      ...(body.goal !== undefined ? { goal: body.goal } : {}),
      ...(body.topic !== undefined ? { topic: body.topic } : {}),
      ...(body.expectedResult !== undefined ? { expectedResult: body.expectedResult } : {}),
      ...(body.audienceSegmentId !== undefined
        ? { audienceSegmentId: body.audienceSegmentId }
        : {}),
      ...(body.personaId !== undefined ? { personaId: body.personaId } : {}),
      ...(body.pillarId !== undefined ? { pillarId: body.pillarId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.referenceId !== undefined ? { referenceId: body.referenceId } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.format !== undefined ? { format: body.format } : {}),
      ...(body.hook !== undefined ? { hook: body.hook } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.cta !== undefined ? { cta: body.cta } : {}),
      ...(body.caption !== undefined ? { caption: body.caption } : {}),
      ...(body.scriptNotes !== undefined ? { scriptNotes: body.scriptNotes } : {}),
      ...(body.shotList !== undefined ? { shotList: body.shotList } : {}),
      ...(body.productionNotes !== undefined ? { productionNotes: body.productionNotes } : {}),
      ...(body.headline !== undefined ? { headline: body.headline } : {}),
      ...(body.visualBrief !== undefined ? { visualBrief: body.visualBrief } : {}),
      ...(body.extras !== undefined
        ? { extras: body.extras as Prisma.InputJsonValue }
        : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: contentDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Content updated: ${item.title}`,
  });

  return mapContentDetail(item);
}

export async function archiveContent(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentItemDetail> {
  return updateContent(storeId, userId, userRole, contentId, {
    status: SmmContentStatus.ARCHIVED,
    archivedAt: new Date().toISOString(),
  });
}

export async function duplicateContent(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentItemDetail> {
  const existing = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertNotClient(access);

  const item = await prisma.smmContentItem.create({
    data: {
      projectId: existing.projectId,
      campaignId: existing.campaignId,
      platform: existing.platform,
      contentType: existing.contentType,
      title: `${existing.title} (copy)`,
      publishAt: null,
      goal: existing.goal,
      topic: existing.topic,
      expectedResult: existing.expectedResult,
      audienceSegmentId: existing.audienceSegmentId,
      personaId: existing.personaId,
      pillarId: existing.pillarId,
      status: SmmContentStatus.IDEA,
      referenceId: existing.referenceId,
      notes: existing.notes,
      format: existing.format,
      hook: existing.hook,
      body: existing.body,
      cta: existing.cta,
      caption: existing.caption,
      scriptNotes: existing.scriptNotes,
      shotList: existing.shotList,
      productionNotes: existing.productionNotes,
      headline: existing.headline,
      visualBrief: existing.visualBrief,
      extras: existing.extras === null ? undefined : (existing.extras as Prisma.InputJsonValue),
      createdById: userId,
      blocks: {
        create: existing.blocks.map((block, index) => ({
          kind: block.kind,
          title: block.title,
          body: block.body,
          visualDirection: block.visualDirection,
          referenceText: block.referenceText,
          sortOrder: block.sortOrder ?? index,
        })),
      },
    },
    include: contentDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Content duplicated from ${existing.title}`,
  });

  return mapContentDetail(item);
}

export async function transitionContentStatus(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: TransitionSmmContentStatusRequest,
): Promise<SmmContentItemDetail> {
  const existing = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });

  if (access.isClient) {
    const allowedForClient =
      (existing.status === SmmContentStatus.CLIENT_REVIEW &&
        (body.status === SmmContentStatus.APPROVED ||
          body.status === SmmContentStatus.REVISION)) ||
      (existing.status === body.status);
    if (!allowedForClient) {
      throw ApiError.forbidden('Clients can only approve or request revision');
    }
  }

  if (!canTransitionSmmContentStatus(existing.status, body.status)) {
    throw ApiError.validation(
      `Cannot transition content from ${existing.status} to ${body.status}`,
    );
  }

  const item = await prisma.smmContentItem.update({
    where: { id: contentId },
    data: {
      status: body.status,
      ...(body.status === SmmContentStatus.ARCHIVED
        ? { archivedAt: new Date() }
        : existing.archivedAt
          ? { archivedAt: null }
          : {}),
    },
    include: contentDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_STATUS_CHANGED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Content status: ${existing.status} → ${body.status}`,
    metadata: { from: existing.status, to: body.status },
  });

  return mapContentDetail(item, { hideInternalNotes: access.isClient });
}

export async function replaceContentBlocks(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  blocks: SmmContentBlockInput[],
): Promise<SmmContentItemDetail> {
  const existing = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertNotClient(access);

  await prisma.$transaction(async (tx) => {
    await tx.smmContentBlock.deleteMany({ where: { contentItemId: contentId } });
    if (blocks.length) {
      await tx.smmContentBlock.createMany({
        data: blocksCreateData(blocks).map((block) => ({
          ...block,
          contentItemId: contentId,
        })),
      });
    }
  });

  await writeSmmActivity({
    storeId,
    projectId: existing.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: contentId,
    summary: `Content blocks replaced: ${existing.title}`,
  });

  const item = await requireContentInStore(storeId, contentId);
  return mapContentDetail(item);
}
