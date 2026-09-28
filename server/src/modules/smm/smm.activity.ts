import {
  AuditEntityType,
  AuditEventType,
  type AuditEntityType as AuditEntityTypeValue,
  type AuditEventType as AuditEventTypeValue,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../services/audit.service.js';

export type WriteSmmActivityInput = {
  storeId: string;
  projectId: string;
  actorUserId?: string | null;
  eventType: AuditEventTypeValue | string;
  entityType: AuditEntityTypeValue | string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  /** When false, skip the global audit trail (still writes SmmActivity). Default true. */
  withAudit?: boolean;
};

/**
 * Writes a project activity row and optionally mirrors it into the store audit log.
 * Never throws — activity/audit must not break the mutation.
 */
export async function writeSmmActivity(input: WriteSmmActivityInput): Promise<void> {
  try {
    await prisma.smmActivity.create({
      data: {
        projectId: input.projectId,
        actorUserId: input.actorUserId ?? null,
        eventType: String(input.eventType),
        entityType: String(input.entityType),
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Swallow — activity is best-effort.
  }

  if (input.withAudit === false) return;

  await recordAudit({
    storeId: input.storeId,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? null,
  });
}

export { AuditEntityType, AuditEventType };
