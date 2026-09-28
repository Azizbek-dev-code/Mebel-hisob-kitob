import {
  AuditEntityType,
  AuditEventType,
  SmmProjectMemberRole,
  SmmProjectStatus,
  buildPaginationMeta,
  normalisePagination,
  type CreateSmmProjectRequest,
  type PaginatedResult,
  type SmmActivityListItem,
  type SmmActivityListQuery,
  type SmmProgressStats,
  type SmmProgressStatusBucket,
  type SmmProjectDetail,
  type SmmProjectListItem,
  type SmmProjectListQuery,
  type SmmProjectMemberDto,
  type SmmContentStatus,
  type UpdateSmmProjectRequest,
  type UpsertSmmProjectMemberRequest,
  SmmAssignmentStatus,
  SmmApprovalDecision,
  SmmTaskStatus,
  SMM_CONTENT_STATUSES,
  smmProgressGroupForStatus,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDateOrNull } from '../../lib/date-input.js';
import { fromDbMoney, fromDbMoneySum, toDbMoney } from '../../lib/money-mapper.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import { resolveProjectAccess, userSelect } from './smm.access.js';
import { writeSmmActivity } from './smm.activity.js';
import {
  emptyProgressByGroup,
  mapActivity,
  mapProjectDetail,
  mapProjectListItem,
  mapProjectMember,
} from './smm.mappers.js';
import {
  assertNotClient,
  isStoreSmmAdmin,
  shouldRestrictActivityFeed,
  type SmmProjectAccess,
} from './smm.permissions.js';

const projectDetailInclude = {
  clientUser: { select: userSelect },
  createdBy: { select: userSelect },
  members: {
    include: { user: { select: userSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { members: true, contentItems: true } },
} satisfies Prisma.SmmProjectInclude;

async function loadProjectDetail(storeId: string, projectId: string): Promise<SmmProjectDetail> {
  const project = await prisma.smmProject.findFirst({
    where: { id: projectId, storeId },
    include: projectDetailInclude,
  });
  if (!project) throw ApiError.notFound('SMM project not found');
  return mapProjectDetail(project);
}

export async function listProjects(
  storeId: string,
  userId: string,
  userRole: string,
  query: SmmProjectListQuery,
): Promise<PaginatedResult<SmmProjectListItem>> {
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const where: Prisma.SmmProjectWhereInput = { storeId };

  if (!isStoreSmmAdmin(userRole)) {
    where.members = { some: { userId, isActive: true } };
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmProject.count({ where }),
    prisma.smmProject.findMany({
      where,
      include: { _count: { select: { members: true, contentItems: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(mapProjectListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createProject(
  storeId: string,
  userId: string,
  body: CreateSmmProjectRequest,
): Promise<SmmProjectDetail> {
  const project = await prisma.smmProject.create({
    data: {
      storeId,
      name: body.name.trim(),
      clientName: body.clientName ?? null,
      clientUserId: body.clientUserId ?? null,
      description: body.description ?? null,
      status: body.status ?? SmmProjectStatus.ACTIVE,
      budgetPlanned:
        body.budgetPlanned === undefined || body.budgetPlanned === null
          ? null
          : toDbMoney(body.budgetPlanned),
      startDate: parseFlexibleDateOrNull(body.startDate) ?? null,
      endDate: parseFlexibleDateOrNull(body.endDate) ?? null,
      notes: body.notes ?? null,
      createdById: userId,
      members: {
        create: {
          userId,
          role: SmmProjectMemberRole.OWNER,
          isActive: true,
        },
      },
    },
    include: projectDetailInclude,
  });

  await writeSmmActivity({
    storeId,
    projectId: project.id,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PROJECT_CREATED,
    entityType: AuditEntityType.SMM_PROJECT,
    entityId: project.id,
    summary: `SMM project created: ${project.name}`,
  });

  return mapProjectDetail(project);
}

export async function getProject(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
): Promise<{ project: SmmProjectDetail; access: SmmProjectAccess }> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const project = await loadProjectDetail(storeId, projectId);
  if (access.isClient) {
    project.notes = null;
  }
  return { project, access };
}

export async function updateProject(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: UpdateSmmProjectRequest,
): Promise<SmmProjectDetail> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const data: Prisma.SmmProjectUpdateInput = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.clientName !== undefined) data.clientName = body.clientName;
  if (body.clientUserId !== undefined) {
    data.clientUser = body.clientUserId
      ? { connect: { id: body.clientUserId } }
      : { disconnect: true };
  }
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.budgetPlanned !== undefined) {
    data.budgetPlanned =
      body.budgetPlanned === null ? null : toDbMoney(body.budgetPlanned);
  }
  if (body.startDate !== undefined) data.startDate = parseFlexibleDateOrNull(body.startDate) ?? null;
  if (body.endDate !== undefined) data.endDate = parseFlexibleDateOrNull(body.endDate) ?? null;
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.smmProject.update({
    where: { id: projectId },
    data,
    include: projectDetailInclude,
  });

  const eventType =
    body.status !== undefined
      ? AuditEventType.SMM_PROJECT_STATUS_CHANGED
      : AuditEventType.SMM_PROJECT_UPDATED;

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType,
    entityType: AuditEntityType.SMM_PROJECT,
    entityId: projectId,
    summary: `SMM project updated: ${updated.name}`,
    metadata: body as Record<string, unknown>,
  });

  return mapProjectDetail(updated);
}

export async function archiveProject(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
): Promise<SmmProjectDetail> {
  return updateProject(storeId, userId, userRole, projectId, {
    status: SmmProjectStatus.ARCHIVED,
  });
}

export async function listMembers(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
): Promise<SmmProjectMemberDto[]> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const members = await prisma.smmProjectMember.findMany({
    where: { projectId },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: 'asc' },
  });
  return members.map(mapProjectMember);
}

export async function upsertMember(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  body: UpsertSmmProjectMemberRequest,
): Promise<SmmProjectMemberDto> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const targetUser = await prisma.user.findFirst({
    where: { id: body.userId, storeId },
    select: userSelect,
  });
  if (!targetUser) throw ApiError.notFound('User not found in this store');

  const member = await prisma.smmProjectMember.upsert({
    where: { projectId_userId: { projectId, userId: body.userId } },
    create: {
      projectId,
      userId: body.userId,
      role: body.role,
      isActive: body.isActive ?? true,
      notes: body.notes ?? null,
    },
    update: {
      role: body.role,
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: { user: { select: userSelect } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PROJECT_MEMBER_UPSERTED,
    entityType: AuditEntityType.SMM_PROJECT_MEMBER,
    entityId: member.id,
    summary: `Member upserted: ${targetUser.fullName} (${body.role})`,
  });

  return mapProjectMember(member);
}

export async function updateMember(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  memberId: string,
  body: {
    role?: SmmProjectMemberRole;
    isActive?: boolean;
    notes?: string | null;
  },
): Promise<SmmProjectMemberDto> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmProjectMember.findFirst({
    where: { id: memberId, projectId },
  });
  if (!existing) throw ApiError.notFound('Member not found');

  const member = await prisma.smmProjectMember.update({
    where: { id: memberId },
    data: {
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: { user: { select: userSelect } },
  });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PROJECT_MEMBER_UPSERTED,
    entityType: AuditEntityType.SMM_PROJECT_MEMBER,
    entityId: member.id,
    summary: `Member updated: ${member.user.fullName}`,
  });

  return mapProjectMember(member);
}

export async function removeMember(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  memberId: string,
): Promise<void> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  assertNotClient(access);

  const existing = await prisma.smmProjectMember.findFirst({
    where: { id: memberId, projectId },
    include: { user: { select: userSelect } },
  });
  if (!existing) throw ApiError.notFound('Member not found');

  if (existing.role === SmmProjectMemberRole.OWNER) {
    const ownerCount = await prisma.smmProjectMember.count({
      where: { projectId, role: SmmProjectMemberRole.OWNER, isActive: true },
    });
    if (ownerCount <= 1) {
      throw ApiError.validation('Cannot remove the last project owner');
    }
  }

  await prisma.smmProjectMember.delete({ where: { id: memberId } });

  await writeSmmActivity({
    storeId,
    projectId,
    actorUserId: userId,
    eventType: AuditEventType.SMM_PROJECT_MEMBER_UPSERTED,
    entityType: AuditEntityType.SMM_PROJECT_MEMBER,
    entityId: memberId,
    summary: `Member removed: ${existing.user.fullName}`,
  });
}

export async function getProjectProgress(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
): Promise<SmmProgressStats> {
  await resolveProjectAccess({ storeId, userId, userRole, projectId });

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - 30);

  const [statusGroups, overdueAssignments, overdueTasks, pendingApprovals, publishedThisPeriod, costAgg] =
    await Promise.all([
      prisma.smmContentItem.groupBy({
        by: ['status'],
        where: { projectId, archivedAt: null },
        _count: { _all: true },
      }),
      prisma.smmContentAssignment.count({
        where: {
          contentItem: { projectId, archivedAt: null },
          deadline: { lt: now },
          status: { in: [SmmAssignmentStatus.PENDING, SmmAssignmentStatus.IN_PROGRESS] },
        },
      }),
      prisma.smmContentTask.count({
        where: {
          projectId,
          deadline: { lt: now },
          status: { in: [SmmTaskStatus.PENDING, SmmTaskStatus.IN_PROGRESS] },
        },
      }),
      prisma.smmContentApproval.count({
        where: {
          contentItem: { projectId, archivedAt: null },
          decision: SmmApprovalDecision.PENDING,
        },
      }),
      prisma.smmContentItem.count({
        where: {
          projectId,
          archivedAt: null,
          status: { in: ['PUBLISHED', 'ANALYZED'] },
          publishAt: { gte: periodStart, lte: now },
        },
      }),
      prisma.smmContentCost.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
    ]);

  const byGroup = emptyProgressByGroup();
  const byStatus: SmmProgressStatusBucket[] = [];
  let totalContent = 0;

  const counted = new Set<string>();
  for (const row of statusGroups) {
    const status = row.status as SmmContentStatus;
    const count = row._count._all;
    totalContent += count;
    counted.add(status);
    const group = smmProgressGroupForStatus(status);
    byGroup[group] += count;
    byStatus.push({ status, group, count });
  }

  for (const status of SMM_CONTENT_STATUSES) {
    if (counted.has(status)) continue;
    byStatus.push({
      status,
      group: smmProgressGroupForStatus(status),
      count: 0,
    });
  }

  return {
    projectId,
    totalContent,
    byStatus,
    byGroup,
    overdueAssignments,
    overdueTasks,
    pendingApprovals,
    publishedThisPeriod,
    totalCost: fromDbMoneySum(costAgg._sum.amount),
  };
}

export async function listActivity(
  storeId: string,
  userId: string,
  userRole: string,
  projectId: string,
  query: SmmActivityListQuery,
): Promise<PaginatedResult<SmmActivityListItem>> {
  const { access } = await resolveProjectAccess({ storeId, userId, userRole, projectId });
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);

  const where: Prisma.SmmActivityWhereInput = { projectId };
  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;
  if (query.eventType) where.eventType = query.eventType;

  if (shouldRestrictActivityFeed(access)) {
    where.OR = [
      { eventType: { contains: 'APPROVAL' } },
      { eventType: { contains: 'STATUS' } },
    ];
  }

  const [totalItems, rows] = await Promise.all([
    prisma.smmActivity.count({ where }),
    prisma.smmActivity.findMany({
      where,
      include: { actor: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map((row) => {
      const mapped = mapActivity(row);
      if (access.isClient) {
        mapped.metadata = null;
      }
      return mapped;
    }),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

/** Exported for tests — money helpers stay consistent. */
export { fromDbMoney, toDbMoney };
