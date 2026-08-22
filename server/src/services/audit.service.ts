import {
  AUDIT_REDACTED,
  AUDIT_SENSITIVE_KEY_EXACT,
  AUDIT_SENSITIVE_KEY_PATTERNS,
  UserRole,
  type AuditEntityType,
  type AuditEventType,
  type AuditListQuery,
  type AuditLogItem,
  type PaginatedResult,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import * as auditRepository from '../repositories/audit.repository.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

/**
 * The audit trail.
 *
 * Two rules shape this module:
 *
 * 1. **An audit write must never break the mutation it describes.** A failed
 *    insert is logged and swallowed — refusing a sale because the trail is
 *    unavailable would be a worse outcome than a gap in the trail. `recordAudit`
 *    is therefore awaited (so tests can assert on it) but never rejects.
 * 2. **Secrets never reach the table.** Metadata is walked before it is written
 *    and any key that looks like a credential is replaced, not stored.
 */

const AUDIT_READERS: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.PLATFORM_ADMIN]);

/** How deep the sanitiser descends before collapsing a branch. */
const MAX_METADATA_DEPTH = 4;
/** Arrays longer than this are truncated; audit metadata is context, not a payload dump. */
const MAX_METADATA_ARRAY_LENGTH = 50;
const MAX_METADATA_STRING_LENGTH = 500;

export interface RecordAuditInput {
  /** Null for platform-level events that do not yet belong to a store. */
  storeId?: string | null;
  actorUserId?: string | null;
  eventType: AuditEventType | string;
  entityType: AuditEntityType | string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

export function canReadAuditLog(role: string): boolean {
  return AUDIT_READERS.has(role);
}

export function assertCanReadAuditLog(role: string): void {
  if (!canReadAuditLog(role)) {
    throw ApiError.forbidden('Only store administrators can view the audit log');
  }
}

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    AUDIT_SENSITIVE_KEY_EXACT.includes(normalised) ||
    AUDIT_SENSITIVE_KEY_PATTERNS.some((pattern) => normalised.includes(pattern))
  );
}

function sanitiseValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'bigint') return value.toString();

  if (typeof value === 'string') {
    return value.length > MAX_METADATA_STRING_LENGTH
      ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}…`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (depth >= MAX_METADATA_DEPTH) return `[array(${value.length})]`;
    return value
      .slice(0, MAX_METADATA_ARRAY_LENGTH)
      .map((entry) => sanitiseValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_METADATA_DEPTH) return '[object]';
    return sanitiseObject(value as Record<string, unknown>, depth);
  }

  // Functions, symbols and anything else a caller passed by mistake.
  return null;
}

function sanitiseObject(source: Record<string, unknown>, depth: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = isSensitiveKey(key) ? AUDIT_REDACTED : sanitiseValue(value, depth + 1);
  }
  return result;
}

/**
 * Strip credentials out of audit metadata.
 *
 * Exported so the rule can be tested directly, and so a caller that builds
 * metadata from untrusted input can check what will actually be persisted.
 */
export function sanitiseAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const sanitised = sanitiseObject(metadata, 0);
  return Object.keys(sanitised).length > 0 ? sanitised : null;
}

/**
 * Append one row to the trail.
 *
 * Resolves even when the insert fails — callers are business mutations that have
 * already committed, and there is nothing useful they could do with the error.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await auditRepository.insertAuditLog({
      storeId: input.storeId ?? null,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: sanitiseAuditMetadata(input.metadata) as Prisma.InputJsonValue | null,
    });
  } catch (error) {
    logger.error('Failed to write audit log entry', {
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      storeId: input.storeId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listAuditLogs(options: {
  storeId: string;
  actorRole: string;
  query?: AuditListQuery;
}): Promise<PaginatedResult<AuditLogItem>> {
  assertCanReadAuditLog(options.actorRole);

  const query = options.query ?? {};
  return auditRepository.listAuditLogs({
    // Always the session's store: an admin cannot read another store's trail.
    storeId: options.storeId,
    page: query.page,
    pageSize: query.pageSize,
    from: query.from,
    to: query.to,
    actorUserId: query.actorUserId,
    eventType: query.eventType,
    entityType: query.entityType,
    search: query.search,
  });
}
