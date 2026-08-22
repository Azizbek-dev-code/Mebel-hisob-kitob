import type { AuditEntityType, AuditEventType } from '../constants/audit.js';
import type { IsoDateString, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Audit trail API contract.
 *
 * Read-only by design: the API exposes no create, update or delete endpoint for
 * an audit row. Rows are written by the services that perform the mutation, and
 * `storeId` always comes from the authenticated session.
 */

export interface AuditActorSummary {
  id: string;
  fullName: string;
}

export interface AuditLogItem {
  id: string;
  /**
   * Free-form on purpose: an old row keeps the event name it was written with
   * even after that name leaves `AuditEventType`.
   */
  eventType: AuditEventType | string;
  entityType: AuditEntityType | string;
  entityId: string | null;
  summary: string;
  /** Sanitised context; never contains passwords, hashes or secrets. */
  metadata: Record<string, unknown> | null;
  /** Null when the actor's account has since been deleted, or for system events. */
  actor: AuditActorSummary | null;
  createdAt: IsoDateString;
}

export interface AuditListQuery extends PaginationQuery {
  /** Inclusive calendar date YYYY-MM-DD. */
  from?: string;
  /** Inclusive calendar date YYYY-MM-DD. */
  to?: string;
  actorUserId?: string;
  eventType?: string;
  entityType?: string;
  /** Case-insensitive match against the summary line. */
  search?: string;
}

export type AuditListResponse = PaginatedResult<AuditLogItem>;
