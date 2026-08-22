import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditListQuery } from '@furniture-erp/shared';

import { auditService } from '@/services/audit.service';

export const auditKeys = {
  all: ['audit'] as const,
  list: (query: AuditListQuery) => [...auditKeys.all, 'list', query] as const,
};

export function useAuditList(query: AuditListQuery, enabled = true) {
  return useQuery({
    queryKey: auditKeys.list(query),
    queryFn: ({ signal }) => auditService.list(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}
