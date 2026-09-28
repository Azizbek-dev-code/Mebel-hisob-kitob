import {
  SmmContentStatus,
  SmmProjectMemberRole,
  UserRole,
} from '@furniture-erp/shared';

import { ApiError } from '../../utils/api-error.js';

/** Content statuses a project CLIENT member may see. */
export const CLIENT_VISIBLE_CONTENT_STATUSES: readonly SmmContentStatus[] = [
  SmmContentStatus.CLIENT_REVIEW,
  SmmContentStatus.APPROVED,
  SmmContentStatus.REVISION,
  SmmContentStatus.SCHEDULED,
  SmmContentStatus.PUBLISHED,
];

const CLIENT_VISIBLE_SET = new Set<string>(CLIENT_VISIBLE_CONTENT_STATUSES);

export function isStoreSmmAdmin(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function isClientMemberRole(
  role: SmmProjectMemberRole | string | null | undefined,
): boolean {
  return role === SmmProjectMemberRole.CLIENT;
}

export function canClientSeeContentStatus(status: SmmContentStatus | string): boolean {
  return CLIENT_VISIBLE_SET.has(status);
}

export type SmmProjectAccess = {
  storeId: string;
  userId: string;
  userRole: string;
  projectId: string;
  memberRole: SmmProjectMemberRole | null;
  isAdmin: boolean;
  isClient: boolean;
};

export function buildProjectAccess(input: {
  storeId: string;
  userId: string;
  userRole: string;
  projectId: string;
  memberRole: SmmProjectMemberRole | string | null | undefined;
}): SmmProjectAccess {
  const isAdmin = isStoreSmmAdmin(input.userRole);
  const memberRole = (input.memberRole as SmmProjectMemberRole | null) ?? null;
  return {
    storeId: input.storeId,
    userId: input.userId,
    userRole: input.userRole,
    projectId: input.projectId,
    memberRole,
    isAdmin,
    isClient: isClientMemberRole(memberRole),
  };
}

/** Store admins always pass; otherwise an active membership is required. */
export function assertCanAccessProject(
  access: SmmProjectAccess,
  hasMembership: boolean,
): void {
  if (access.isAdmin) return;
  if (!hasMembership) {
    throw ApiError.forbidden('You do not have access to this SMM project');
  }
}

export function assertNotClient(
  access: SmmProjectAccess,
  message = 'Clients cannot perform this action',
): void {
  if (access.isClient) throw ApiError.forbidden(message);
}

/** Clients may not create agency-scoped templates. */
export function assertCanManageAgencyTemplates(access: SmmProjectAccess): void {
  assertNotClient(access, 'Clients cannot manage agency templates');
}

/** Clients cannot view competitor research. */
export function assertCanViewCompetitors(access: SmmProjectAccess): void {
  assertNotClient(access, 'Clients cannot view competitor research');
}

/** Clients cannot view or mutate costs. */
export function assertCanViewCosts(access: SmmProjectAccess): void {
  assertNotClient(access, 'Clients cannot view project costs');
}

/**
 * Clients get a filtered activity feed (approvals / status only).
 * Returns true when the feed should be restricted.
 */
export function shouldRestrictActivityFeed(access: SmmProjectAccess): boolean {
  return access.isClient;
}

/** Prisma `status: { in }` filter for client-visible content lists. */
export function clientContentStatusWhere(): { status: { in: SmmContentStatus[] } } {
  return { status: { in: [...CLIENT_VISIBLE_CONTENT_STATUSES] } };
}

/**
 * Clients may only submit approval decisions — not mutate internal content fields.
 */
export function assertClientCanApprove(access: SmmProjectAccess): void {
  if (!access.isClient && !access.isAdmin && !access.memberRole) {
    throw ApiError.forbidden('You do not have access to this SMM project');
  }
}
