import type { AuditListQuery, AuditListResponse } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/** Read-only store audit trail — ADMIN / PLATFORM_ADMIN. */
export const auditService = {
  async list(query: AuditListQuery = {}, signal?: AbortSignal): Promise<AuditListResponse> {
    return apiClient.get<AuditListResponse>('/audit', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        from: query.from,
        to: query.to,
        actorUserId: query.actorUserId,
        eventType: query.eventType,
        entityType: query.entityType,
        search: query.search,
      },
      signal,
    });
  },
};
