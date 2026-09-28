import {
  AuditEntityType,
  AuditEventType,
  SmmApprovalDecision,
  SmmAssignmentStatus,
  SmmContentStatus,
  SmmFileKind,
  SmmTaskStatus,
  SmmTemplateScope,
  buildPaginationMeta,
  canTransitionSmmContentStatus,
  normalisePagination,
  type CreateSmmContentAssignmentRequest,
  type CreateSmmContentCostRequest,
  type CreateSmmContentTaskRequest,
  type CreateSmmContentTemplateRequest,
  type DecideSmmContentApprovalRequest,
  type PaginatedResult,
  type SmmContentAnalyticsDto,
  type SmmContentApprovalListItem,
  type SmmContentAssignmentDetail,
  type SmmContentCostDetail,
  type SmmContentCostListItem,
  type SmmContentCostListQuery,
  type SmmContentFileListItem,
  type SmmContentItemDetail,
  type SmmContentTaskDetail,
  type SmmContentTaskListItem,
  type SmmContentTaskListQuery,
  type SmmContentTemplateDetail,
  type SmmContentTemplateListItem,
  type SmmContentTemplateListQuery,
  type UpdateSmmContentAssignmentRequest,
  type UpdateSmmContentCostRequest,
  type UpdateSmmContentTaskRequest,
  type UpdateSmmContentTemplateRequest,
  type UpsertSmmContentAnalyticsRequest,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDate, parseFlexibleDateOrNull } from '../../lib/date-input.js';
import { toDbMoney } from '../../lib/money-mapper.js';
import { prisma } from '../../lib/prisma.js';
import { getStorageDriver } from '../../lib/storage/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/api-error.js';

import { requireContentInStore, resolveProjectAccess, userSelect } from './smm.access.js';
import { writeSmmActivity } from './smm.activity.js';
import {
  mapAnalytics,
  mapApproval,
  mapAssignmentDetail,
  mapContentDetail,
  mapCostDetail,
  mapCostListItem,
  mapFile,
  mapTaskDetail,
  mapTaskListItem,
  mapTemplateDetail,
  mapTemplateListItem,
} from './smm.mappers.js';
import {
  assertCanViewCosts,
  assertNotClient,
  isStoreSmmAdmin,
} from './smm.permissions.js';

const contentDetailInclude = {
  campaign: { select: { name: true } },
  pillar: { select: { name: true } },
  createdBy: { select: userSelect },
  blocks: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { assignments: true } },
} satisfies Prisma.SmmContentItemInclude;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates(
  storeId: string,
  userId: string,
  userRole: string,
  query: SmmContentTemplateListQuery,
): Promise<PaginatedResult<SmmContentTemplateListItem>> {
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmContentTemplateWhereInput = {
    storeId,
    ...(query.includeArchived ? {} : { archivedAt: null }),
  };

  if (query.scope && query.scope !== 'ALL') where.scope = query.scope;
  if (query.contentType && query.contentType !== 'ALL') where.contentType = query.contentType;
  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  // When scoped to a project, return that project's templates plus agency-wide ones.
  if (query.projectId) {
    await resolveProjectAccess({
      storeId,
      userId,
      userRole,
      projectId: query.projectId,
    });
    if (!query.scope || query.scope === 'ALL') {
      where.OR = [
        { projectId: query.projectId },
        { scope: SmmTemplateScope.AGENCY, projectId: null },
      ];
    } else if (query.scope === SmmTemplateScope.PROJECT) {
      where.projectId = query.projectId;
    } else {
      where.scope = SmmTemplateScope.AGENCY;
      where.projectId = null;
    }
  } else if (query.projectId === null) {
    where.projectId = null;
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmContentTemplate.count({ where }),
    prisma.smmContentTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapTemplateListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createTemplate(
  storeId: string,
  userId: string,
  userRole: string,
  body: CreateSmmContentTemplateRequest,
): Promise<SmmContentTemplateDetail> {
  if (body.scope === SmmTemplateScope.AGENCY && !isStoreSmmAdmin(userRole)) {
    throw ApiError.forbidden('Only store admins can create agency templates');
  }

  if (body.projectId) {
    const { access } = await resolveProjectAccess({
      storeId,
      userId,
      userRole,
      projectId: body.projectId,
    });
    assertNotClient(access);
  } else if (body.scope === SmmTemplateScope.PROJECT) {
    throw ApiError.validation('projectId is required for PROJECT-scoped templates');
  }

  const row = await prisma.smmContentTemplate.create({
    data: {
      storeId,
      projectId: body.scope === SmmTemplateScope.AGENCY ? null : (body.projectId ?? null),
      scope: body.scope,
      name: body.name.trim(),
      contentType: body.contentType,
      description: body.description ?? null,
      payload: body.payload as Prisma.InputJsonValue,
      createdById: userId,
    },
    include: { createdBy: { select: userSelect } },
  });

  if (row.projectId) {
    await writeSmmActivity({
      storeId,
      projectId: row.projectId,
      actorUserId: userId,
      eventType: AuditEventType.SMM_CONTENT_TEMPLATE_CREATED,
      entityType: AuditEntityType.SMM_CONTENT_TEMPLATE,
      entityId: row.id,
      summary: `Template created: ${row.name}`,
    });
  } else {
    await recordAudit({
      storeId,
      actorUserId: userId,
      eventType: AuditEventType.SMM_CONTENT_TEMPLATE_CREATED,
      entityType: AuditEntityType.SMM_CONTENT_TEMPLATE,
      entityId: row.id,
      summary: `Agency template created: ${row.name}`,
    });
  }

  return mapTemplateDetail(row);
}

export async function getTemplate(
  storeId: string,
  userId: string,
  userRole: string,
  templateId: string,
): Promise<SmmContentTemplateDetail> {
  const row = await prisma.smmContentTemplate.findFirst({
    where: { id: templateId, storeId },
    include: { createdBy: { select: userSelect } },
  });
  if (!row) throw ApiError.notFound('Template not found');

  if (row.projectId) {
    await resolveProjectAccess({
      storeId,
      userId,
      userRole,
      projectId: row.projectId,
    });
  }

  return mapTemplateDetail(row);
}

export async function updateTemplate(
  storeId: string,
  userId: string,
  userRole: string,
  templateId: string,
  body: UpdateSmmContentTemplateRequest,
): Promise<SmmContentTemplateDetail> {
  const existing = await prisma.smmContentTemplate.findFirst({
    where: { id: templateId, storeId },
  });
  if (!existing) throw ApiError.notFound('Template not found');

  if (existing.projectId) {
    const { access } = await resolveProjectAccess({
      storeId,
      userId,
      userRole,
      projectId: existing.projectId,
    });
    assertNotClient(access);
  } else if (!isStoreSmmAdmin(userRole)) {
    throw ApiError.forbidden('Only store admins can manage agency templates');
  }

  const row = await prisma.smmContentTemplate.update({
    where: { id: templateId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.contentType !== undefined ? { contentType: body.contentType } : {}),
      ...(body.scope !== undefined ? { scope: body.scope } : {}),
      ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.payload !== undefined
        ? { payload: body.payload as Prisma.InputJsonValue }
        : {}),
      ...(body.archivedAt !== undefined
        ? { archivedAt: parseFlexibleDateOrNull(body.archivedAt) ?? null }
        : {}),
    },
    include: { createdBy: { select: userSelect } },
  });

  return mapTemplateDetail(row);
}

type TemplatePayload = {
  title?: string;
  platform?: string;
  contentType?: string;
  goal?: string | null;
  topic?: string | null;
  format?: string | null;
  hook?: string | null;
  body?: string | null;
  cta?: string | null;
  caption?: string | null;
  headline?: string | null;
  visualBrief?: string | null;
  scriptNotes?: string | null;
  shotList?: string | null;
  productionNotes?: string | null;
  extras?: unknown;
  blocks?: Array<{
    kind: string;
    title?: string | null;
    body?: string | null;
    visualDirection?: string | null;
    referenceText?: string | null;
    sortOrder?: number;
  }>;
};

export async function useTemplate(
  storeId: string,
  userId: string,
  userRole: string,
  templateId: string,
  input: { projectId: string; publishAt?: string | null },
): Promise<SmmContentItemDetail> {
  const template = await prisma.smmContentTemplate.findFirst({
    where: { id: templateId, storeId, archivedAt: null },
  });
  if (!template) throw ApiError.notFound('Template not found');

  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: input.projectId,
  });
  assertNotClient(access);

  const payload = (template.payload ?? {}) as TemplatePayload;

  const item = await prisma.smmContentItem.create({
    data: {
      projectId: input.projectId,
      title: payload.title?.trim() || template.name,
      platform: (payload.platform as never) || 'INSTAGRAM',
      contentType: (payload.contentType as never) || template.contentType,
      status: SmmContentStatus.IDEA,
      publishAt: parseFlexibleDateOrNull(input.publishAt) ?? null,
      goal: payload.goal ?? null,
      topic: payload.topic ?? null,
      format: payload.format ?? null,
      hook: payload.hook ?? null,
      body: payload.body ?? null,
      cta: payload.cta ?? null,
      caption: payload.caption ?? null,
      headline: payload.headline ?? null,
      visualBrief: payload.visualBrief ?? null,
      scriptNotes: payload.scriptNotes ?? null,
      shotList: payload.shotList ?? null,
      productionNotes: payload.productionNotes ?? null,
      extras:
        payload.extras === undefined || payload.extras === null
          ? undefined
          : (payload.extras as Prisma.InputJsonValue),
      createdById: userId,
      blocks: payload.blocks?.length
        ? {
            create: payload.blocks.map((block, index) => ({
              kind: block.kind as never,
              title: block.title ?? null,
              body: block.body ?? null,
              visualDirection: block.visualDirection ?? null,
              referenceText: block.referenceText ?? null,
              sortOrder: block.sortOrder ?? index,
            })),
          }
        : undefined,
    },
    include: contentDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId: input.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ITEM_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_ITEM,
    entityId: item.id,
    summary: `Content created from template: ${template.name}`,
  });

  return mapContentDetail(item);
}

export async function saveContentAsTemplate(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: { name: string; scope: SmmTemplateScope; projectId?: string | null },
): Promise<SmmContentTemplateDetail> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  if (body.scope === SmmTemplateScope.AGENCY) {
    if (!isStoreSmmAdmin(userRole)) {
      throw ApiError.forbidden('Only store admins can create agency templates');
    }
  }

  const payload: TemplatePayload = {
    title: item.title,
    platform: item.platform,
    contentType: item.contentType,
    goal: item.goal,
    topic: item.topic,
    format: item.format,
    hook: item.hook,
    body: item.body,
    cta: item.cta,
    caption: item.caption,
    headline: item.headline,
    visualBrief: item.visualBrief,
    scriptNotes: item.scriptNotes,
    shotList: item.shotList,
    productionNotes: item.productionNotes,
    extras: item.extras,
    blocks: item.blocks.map((block) => ({
      kind: block.kind,
      title: block.title,
      body: block.body,
      visualDirection: block.visualDirection,
      referenceText: block.referenceText,
      sortOrder: block.sortOrder,
    })),
  };

  const projectId =
    body.scope === SmmTemplateScope.AGENCY
      ? null
      : (body.projectId ?? item.projectId);

  const row = await prisma.smmContentTemplate.create({
    data: {
      storeId,
      projectId,
      scope: body.scope,
      name: body.name.trim(),
      contentType: item.contentType,
      description: `Saved from ${item.title}`,
      payload: payload as Prisma.InputJsonValue,
      createdById: userId,
    },
    include: { createdBy: { select: userSelect } },
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_TEMPLATE_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_TEMPLATE,
    entityId: row.id,
    summary: `Template saved from content: ${item.title}`,
  });

  return mapTemplateDetail(row);
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function listAssignments(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentAssignmentDetail[]> {
  const item = await requireContentInStore(storeId, contentId);
  await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });

  const rows = await prisma.smmContentAssignment.findMany({
    where: { contentItemId: contentId },
    include: {
      user: { select: userSelect },
      contentItem: { select: { title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map(mapAssignmentDetail);
}

export async function createAssignment(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: Omit<CreateSmmContentAssignmentRequest, 'contentItemId'>,
): Promise<SmmContentAssignmentDetail> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  const assignee = await prisma.user.findFirst({
    where: { id: body.userId, storeId },
    select: userSelect,
  });
  if (!assignee) throw ApiError.notFound('Assignee not found in this store');

  const row = await prisma.smmContentAssignment.create({
    data: {
      contentItemId: contentId,
      userId: body.userId,
      role: body.role.trim(),
      responsibility: body.responsibility ?? null,
      deadline: parseFlexibleDateOrNull(body.deadline) ?? null,
      status: body.status ?? SmmAssignmentStatus.PENDING,
      estimatedMinutes: body.estimatedMinutes ?? null,
      actualMinutes: body.actualMinutes ?? null,
      notes: body.notes ?? null,
    },
    include: {
      user: { select: userSelect },
      contentItem: { select: { title: true } },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ASSIGNMENT_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_ASSIGNMENT,
    entityId: row.id,
    summary: `Assignment created: ${row.role} → ${assignee.fullName}`,
  });

  return mapAssignmentDetail(row);
}

export async function updateAssignment(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  assignmentId: string,
  body: UpdateSmmContentAssignmentRequest,
): Promise<SmmContentAssignmentDetail> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  const existing = await prisma.smmContentAssignment.findFirst({
    where: { id: assignmentId, contentItemId: contentId },
  });
  if (!existing) throw ApiError.notFound('Assignment not found');

  const row = await prisma.smmContentAssignment.update({
    where: { id: assignmentId },
    data: {
      ...(body.role !== undefined ? { role: body.role.trim() } : {}),
      ...(body.responsibility !== undefined ? { responsibility: body.responsibility } : {}),
      ...(body.deadline !== undefined
        ? { deadline: parseFlexibleDateOrNull(body.deadline) ?? null }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.estimatedMinutes !== undefined
        ? { estimatedMinutes: body.estimatedMinutes }
        : {}),
      ...(body.actualMinutes !== undefined ? { actualMinutes: body.actualMinutes } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: {
      user: { select: userSelect },
      contentItem: { select: { title: true } },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ASSIGNMENT_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_ASSIGNMENT,
    entityId: row.id,
    summary: `Assignment updated: ${row.role}`,
  });

  return mapAssignmentDetail(row);
}

export async function deleteAssignment(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  assignmentId: string,
): Promise<void> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  const existing = await prisma.smmContentAssignment.findFirst({
    where: { id: assignmentId, contentItemId: contentId },
  });
  if (!existing) throw ApiError.notFound('Assignment not found');

  await prisma.smmContentAssignment.delete({ where: { id: assignmentId } });
}

export async function generateTaskFromAssignment(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  assignmentId: string,
): Promise<SmmContentTaskDetail> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  const assignment = await prisma.smmContentAssignment.findFirst({
    where: { id: assignmentId, contentItemId: contentId },
    include: { user: { select: userSelect } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const task = await prisma.smmContentTask.create({
    data: {
      storeId,
      projectId: item.projectId,
      contentItemId: contentId,
      assignmentId: assignment.id,
      userId: assignment.userId,
      title: `${assignment.role}: ${item.title}`,
      description: assignment.responsibility ?? assignment.notes,
      status: SmmTaskStatus.PENDING,
      deadline: assignment.deadline,
      createdById: userId,
    },
    include: {
      user: { select: userSelect },
      createdBy: { select: userSelect },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_TASK_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_TASK,
    entityId: task.id,
    summary: `Task generated from assignment: ${task.title}`,
  });

  return mapTaskDetail(task);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function listTasks(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmContentTaskListQuery,
): Promise<PaginatedResult<SmmContentTaskListItem>> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);

  const where: Prisma.SmmContentTaskWhereInput = { projectId, storeId };
  if (query.userId) where.userId = query.userId;
  if (query.contentItemId) where.contentItemId = query.contentItemId;
  if (query.status && query.status !== 'ALL') where.status = query.status;

  const [totalItems, rows] = await Promise.all([
    prisma.smmContentTask.count({ where }),
    prisma.smmContentTask.findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: [{ deadline: 'asc' }, { updatedAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapTaskListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createTask(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: Omit<CreateSmmContentTaskRequest, 'projectId'>,
): Promise<SmmContentTaskDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const task = await prisma.smmContentTask.create({
    data: {
      storeId,
      projectId,
      userId: body.userId,
      title: body.title.trim(),
      description: body.description ?? null,
      contentItemId: body.contentItemId ?? null,
      assignmentId: body.assignmentId ?? null,
      status: body.status ?? SmmTaskStatus.PENDING,
      deadline: parseFlexibleDateOrNull(body.deadline) ?? null,
      createdById: userId,
    },
    include: {
      user: { select: userSelect },
      createdBy: { select: userSelect },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_TASK_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_TASK,
    entityId: task.id,
    summary: `Task created: ${task.title}`,
  });

  return mapTaskDetail(task);
}

export async function updateTask(
  storeId: string,
  userId: string,
  userRole: string,
  taskId: string,
  body: UpdateSmmContentTaskRequest,
): Promise<SmmContentTaskDetail> {
  const existing = await prisma.smmContentTask.findFirst({
    where: { id: taskId, storeId },
  });
  if (!existing) throw ApiError.notFound('Task not found');

  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });

  // Assignees can update their own task status; clients cannot.
  if (access.isClient) throw ApiError.forbidden('Clients cannot update tasks');
  if (
    !access.isAdmin &&
    access.memberRole &&
    existing.userId !== userId &&
    body.userId === undefined &&
    Object.keys(body).every((k) => k === 'status' || k === 'completedAt' || k === 'description')
  ) {
    // non-assignee members can still update if they have project access
  }

  let completedAt = parseFlexibleDateOrNull(body.completedAt);
  if (body.status === SmmTaskStatus.COMPLETED && completedAt === undefined) {
    completedAt = new Date();
  }
  if (
    body.status &&
    body.status !== SmmTaskStatus.COMPLETED &&
    body.completedAt === undefined
  ) {
    completedAt = null;
  }

  const task = await prisma.smmContentTask.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.userId !== undefined ? { userId: body.userId } : {}),
      ...(body.contentItemId !== undefined ? { contentItemId: body.contentItemId } : {}),
      ...(body.assignmentId !== undefined ? { assignmentId: body.assignmentId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.deadline !== undefined
        ? { deadline: parseFlexibleDateOrNull(body.deadline) ?? null }
        : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
    include: {
      user: { select: userSelect },
      createdBy: { select: userSelect },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId: task.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_TASK_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_TASK,
    entityId: task.id,
    summary: `Task updated: ${task.title}`,
  });

  return mapTaskDetail(task);
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

export async function listCosts(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmContentCostListQuery,
): Promise<PaginatedResult<SmmContentCostListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCosts(access);

  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmContentCostWhereInput = { projectId };
  if (query.contentItemId) where.contentItemId = query.contentItemId;
  if (query.userId) where.userId = query.userId;
  if (query.from || query.to) {
    where.costDate = {
      ...(query.from ? { gte: parseFlexibleDate(query.from) } : {}),
      ...(query.to ? { lte: parseFlexibleDate(query.to) } : {}),
    };
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmContentCost.count({ where }),
    prisma.smmContentCost.findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: { costDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapCostListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createCost(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: Omit<CreateSmmContentCostRequest, 'projectId'>,
): Promise<SmmContentCostDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertCanViewCosts(access);

  const row = await prisma.smmContentCost.create({
    data: {
      projectId,
      label: body.label.trim(),
      amount: toDbMoney(body.amount),
      costDate: parseFlexibleDate(body.costDate)!,
      contentItemId: body.contentItemId ?? null,
      taskId: body.taskId ?? null,
      userId: body.userId ?? null,
      notes: body.notes ?? null,
      createdById: userId,
    },
    include: {
      user: { select: userSelect },
      createdBy: { select: userSelect },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_COST_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_COST,
    entityId: row.id,
    summary: `Cost created: ${row.label}`,
  });

  return mapCostDetail(row);
}

export async function updateCost(
  storeId: string,
  userId: string,
  userRole: string,
  costId: string,
  body: UpdateSmmContentCostRequest,
): Promise<SmmContentCostDetail> {
  const existing = await prisma.smmContentCost.findFirst({
    where: { id: costId, project: { storeId } },
  });
  if (!existing) throw ApiError.notFound('Cost not found');

  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertCanViewCosts(access);

  const row = await prisma.smmContentCost.update({
    where: { id: costId },
    data: {
      ...(body.label !== undefined ? { label: body.label.trim() } : {}),
      ...(body.amount !== undefined ? { amount: toDbMoney(body.amount) } : {}),
      ...(body.costDate !== undefined ? { costDate: parseFlexibleDate(body.costDate)! } : {}),
      ...(body.contentItemId !== undefined ? { contentItemId: body.contentItemId } : {}),
      ...(body.taskId !== undefined ? { taskId: body.taskId } : {}),
      ...(body.userId !== undefined ? { userId: body.userId } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: {
      user: { select: userSelect },
      createdBy: { select: userSelect },
    },
  });

  await writeSmmActivity({
    storeId,
    projectId: row.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_COST_UPDATED,
    entityType: AuditEntityType.SMM_CONTENT_COST,
    entityId: row.id,
    summary: `Cost updated: ${row.label}`,
  });

  return mapCostDetail(row);
}

export async function deleteCost(
  storeId: string,
  userId: string,
  userRole: string,
  costId: string,
): Promise<void> {
  const existing = await prisma.smmContentCost.findFirst({
    where: { id: costId, project: { storeId } },
  });
  if (!existing) throw ApiError.notFound('Cost not found');

  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertCanViewCosts(access);

  await prisma.smmContentCost.delete({ where: { id: costId } });
}

// ---------------------------------------------------------------------------
// Analytics / approvals / files
// ---------------------------------------------------------------------------

export async function upsertAnalytics(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: UpsertSmmContentAnalyticsRequest,
): Promise<SmmContentAnalyticsDto> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });
  assertNotClient(access);

  const row = await prisma.smmContentAnalytics.upsert({
    where: { contentItemId: contentId },
    create: {
      contentItemId: contentId,
      reach: body.reach ?? null,
      views: body.views ?? null,
      likes: body.likes ?? null,
      comments: body.comments ?? null,
      shares: body.shares ?? null,
      saves: body.saves ?? null,
      engagement: body.engagement ?? null,
      profileVisits: body.profileVisits ?? null,
      leads: body.leads ?? null,
      conversions: body.conversions ?? null,
      sales: body.sales ?? null,
      notes: body.notes ?? null,
      recordedAt: parseFlexibleDateOrNull(body.recordedAt) ?? new Date(),
      recordedById: userId,
    },
    update: {
      ...(body.reach !== undefined ? { reach: body.reach } : {}),
      ...(body.views !== undefined ? { views: body.views } : {}),
      ...(body.likes !== undefined ? { likes: body.likes } : {}),
      ...(body.comments !== undefined ? { comments: body.comments } : {}),
      ...(body.shares !== undefined ? { shares: body.shares } : {}),
      ...(body.saves !== undefined ? { saves: body.saves } : {}),
      ...(body.engagement !== undefined ? { engagement: body.engagement } : {}),
      ...(body.profileVisits !== undefined ? { profileVisits: body.profileVisits } : {}),
      ...(body.leads !== undefined ? { leads: body.leads } : {}),
      ...(body.conversions !== undefined ? { conversions: body.conversions } : {}),
      ...(body.sales !== undefined ? { sales: body.sales } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.recordedAt !== undefined
        ? { recordedAt: parseFlexibleDateOrNull(body.recordedAt) ?? null }
        : {}),
      recordedById: userId,
    },
    include: { recordedBy: { select: userSelect } },
  });

  if (
    item.status === SmmContentStatus.PUBLISHED &&
    canTransitionSmmContentStatus(item.status, SmmContentStatus.ANALYZED)
  ) {
    await prisma.smmContentItem.update({
      where: { id: contentId },
      data: { status: SmmContentStatus.ANALYZED },
    });
  }

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_ANALYTICS_UPSERTED,
    entityType: AuditEntityType.SMM_CONTENT_ANALYTICS,
    entityId: row.id,
    summary: `Analytics upserted for: ${item.title}`,
  });

  return mapAnalytics(row);
}

export async function getAnalytics(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentAnalyticsDto | null> {
  const item = await requireContentInStore(storeId, contentId);
  await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });

  const row = await prisma.smmContentAnalytics.findUnique({
    where: { contentItemId: contentId },
    include: { recordedBy: { select: userSelect } },
  });
  return row ? mapAnalytics(row) : null;
}

export async function listApprovals(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
): Promise<SmmContentApprovalListItem[]> {
  const item = await requireContentInStore(storeId, contentId);
  await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });

  const rows = await prisma.smmContentApproval.findMany({
    where: { contentItemId: contentId },
    include: { reviewer: { select: userSelect } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapApproval);
}

export async function decideApproval(
  storeId: string,
  userId: string,
  userRole: string,
  contentId: string,
  body: DecideSmmContentApprovalRequest,
): Promise<SmmContentApprovalListItem> {
  const item = await requireContentInStore(storeId, contentId);
  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: item.projectId,
  });

  const reviewerRole = access.isClient ? 'CLIENT' : 'INTERNAL';

  const approval = await prisma.smmContentApproval.create({
    data: {
      contentItemId: contentId,
      decision: body.decision,
      reviewerId: userId,
      reviewerRole,
      comment: body.comment ?? null,
      decidedAt: body.decision === SmmApprovalDecision.PENDING ? null : new Date(),
    },
    include: { reviewer: { select: userSelect } },
  });

  let nextStatus: SmmContentStatus | null = null;
  if (body.decision === SmmApprovalDecision.APPROVED) {
    nextStatus = SmmContentStatus.APPROVED;
  } else if (body.decision === SmmApprovalDecision.REVISION_REQUESTED) {
    nextStatus = SmmContentStatus.REVISION;
  }

  if (
    nextStatus &&
    canTransitionSmmContentStatus(item.status, nextStatus)
  ) {
    await prisma.smmContentItem.update({
      where: { id: contentId },
      data: { status: nextStatus },
    });
  }

  await writeSmmActivity({
    storeId,
    projectId: item.projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_APPROVAL_DECIDED,
    entityType: AuditEntityType.SMM_CONTENT_APPROVAL,
    entityId: approval.id,
    summary: `Approval ${body.decision} for: ${item.title}`,
  });

  return mapApproval(approval);
}

export async function listFiles(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  contentItemId?: string,
): Promise<SmmContentFileListItem[]> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });

  const rows = await prisma.smmContentFile.findMany({
    where: {
      projectId,
      ...(contentItemId ? { contentItemId } : {}),
    },
    include: { uploadedBy: { select: userSelect } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapFile);
}

export async function uploadFile(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  meta: { kind?: SmmFileKind; contentItemId?: string | null },
): Promise<SmmContentFileListItem> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  if (meta.contentItemId) {
    const item = await prisma.smmContentItem.findFirst({
      where: { id: meta.contentItemId, projectId },
    });
    if (!item) throw ApiError.notFound('Content item not found');
  }

  if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
    throw ApiError.validation('File must be between 1 byte and 25 MB');
  }

  const storage = getStorageDriver();
  const uploaded = await storage.upload({
    folder: `smm/${storeId}/${projectId}`,
    filename: file.originalname || 'upload.bin',
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const kind =
    meta.kind ??
    (file.mimetype.startsWith('video/')
      ? SmmFileKind.VIDEO
      : file.mimetype.startsWith('image/')
        ? SmmFileKind.IMAGE
        : SmmFileKind.OTHER);

  const row = await prisma.smmContentFile.create({
    data: {
      projectId,
      contentItemId: meta.contentItemId ?? null,
      kind,
      fileName: file.originalname || uploaded.key,
      fileKey: uploaded.key,
      fileUrl: uploaded.url,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: userId,
    },
    include: { uploadedBy: { select: userSelect } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_CONTENT_FILE_CREATED,
    entityType: AuditEntityType.SMM_CONTENT_FILE,
    entityId: row.id,
    summary: `File uploaded: ${row.fileName}`,
  });

  return mapFile(row);
}

export async function deleteFile(
  storeId: string,
  userId: string,
  userRole: string,
  fileId: string,
): Promise<void> {
  const existing = await prisma.smmContentFile.findFirst({
    where: { id: fileId, project: { storeId } },
  });
  if (!existing) throw ApiError.notFound('File not found');

  const { access } = await resolveProjectAccess({
    storeId,
    userId,
    userRole,
    projectId: existing.projectId,
  });
  assertNotClient(access);

  await prisma.smmContentFile.delete({ where: { id: fileId } });
  await getStorageDriver().delete(existing.fileKey).catch(() => undefined);
}
