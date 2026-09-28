import type { SmmProjectMemberRole } from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import {
  assertCanAccessProject,
  buildProjectAccess,
  type SmmProjectAccess,
} from './smm.permissions.js';

const userSelect = { id: true, fullName: true } as const;

export async function resolveProjectAccess(input: {
  storeId: string;
  userId: string;
  userRole: string;
  projectId: string;
}): Promise<{ access: SmmProjectAccess; projectExists: true }> {
  const project = await prisma.smmProject.findFirst({
    where: { id: input.projectId, storeId: input.storeId },
    select: {
      id: true,
      members: {
        where: { userId: input.userId, isActive: true },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!project) throw ApiError.notFound('SMM project not found');

  const memberRole = (project.members[0]?.role as SmmProjectMemberRole | undefined) ?? null;
  const access = buildProjectAccess({
    storeId: input.storeId,
    userId: input.userId,
    userRole: input.userRole,
    projectId: input.projectId,
    memberRole,
  });

  assertCanAccessProject(access, project.members.length > 0);
  return { access, projectExists: true };
}

export async function requireProjectInStore(storeId: string, projectId: string) {
  const project = await prisma.smmProject.findFirst({
    where: { id: projectId, storeId },
    select: { id: true, storeId: true, name: true, status: true },
  });
  if (!project) throw ApiError.notFound('SMM project not found');
  return project;
}

export async function requireContentInStore(storeId: string, contentId: string) {
  const item = await prisma.smmContentItem.findFirst({
    where: { id: contentId, project: { storeId } },
    include: {
      project: { select: { id: true, storeId: true, name: true } },
      campaign: { select: { name: true } },
      pillar: { select: { name: true } },
      createdBy: { select: userSelect },
      blocks: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { assignments: true } },
    },
  });
  if (!item) throw ApiError.notFound('Content item not found');
  return item;
}

export { userSelect };
