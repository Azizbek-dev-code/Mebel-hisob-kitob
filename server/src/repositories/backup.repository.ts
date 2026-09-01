import { BackupJobStatus, type BackupFormat } from '@furniture-erp/shared';
import { Prisma, type PrismaClient } from '@prisma/client';

import type { BackupStoreProfile, DecodedBackupDocument } from '../lib/backup/document.js';
import {
  BACKUP_DELETE_ORDER,
  BACKUP_INSERT_ORDER,
  type BackupModel,
} from '../lib/backup/models.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

/**
 * Rows per `createMany` statement.
 *
 * Postgres caps a statement at 65535 bind parameters. The widest table here has
 * roughly forty columns, so 500 rows leaves an order of magnitude of headroom
 * while still keeping the number of round trips small.
 */
const INSERT_CHUNK_SIZE = 500;

/**
 * Ceiling for the whole restore transaction.
 *
 * A restore deletes and re-inserts every store-scoped row, so it is far slower
 * than any request Prisma's five-second default was chosen for.
 */
const RESTORE_TRANSACTION_TIMEOUT_MS = 120_000;
const RESTORE_TRANSACTION_MAX_WAIT_MS = 15_000;

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface AnyDelegate {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  createMany: (args: unknown) => Promise<{ count: number }>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
}

function delegateFor(client: PrismaClient | TransactionClient, model: BackupModel): AnyDelegate {
  const delegate = (client as unknown as Record<string, AnyDelegate | undefined>)[model.delegate];
  if (!delegate) {
    throw new Error(`Prisma client has no delegate "${model.delegate}"`);
  }
  return delegate;
}

/**
 * Columns Prisma will accept for each model, taken from the generated data
 * model rather than hand-listed.
 *
 * Used to narrow rows read out of an uploaded file. Without it, one unexpected
 * key — an older export, a hand-edited file — makes Prisma reject the whole
 * insert with an error that says nothing useful to an administrator.
 */
const scalarFieldsByDelegate = new Map<string, Set<string>>();
for (const model of Prisma.dmmf.datamodel.models) {
  const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
  const fields = model.fields
    .filter((field) => field.kind === 'scalar' || field.kind === 'enum')
    .map((field) => field.name);
  scalarFieldsByDelegate.set(delegateName, new Set(fields));
}

export interface BackupJobRecord {
  id: string;
  storeId: string;
  status: string;
  format: string;
  filename: string;
  sizeBytes: bigint | null;
  checksumSha256: string | null;
  errorMessage: string | null;
  isAutomatic: boolean;
  createdAt: Date;
  completedAt: Date | null;
  createdBy: { fullName: string } | null;
}

const jobSelect = {
  id: true,
  storeId: true,
  status: true,
  format: true,
  filename: true,
  sizeBytes: true,
  checksumSha256: true,
  errorMessage: true,
  isAutomatic: true,
  createdAt: true,
  completedAt: true,
  createdBy: { select: { fullName: true } },
} as const;

export interface CreateBackupJobData {
  storeId: string;
  createdById: string | null;
  filename: string;
  format: BackupFormat;
  isAutomatic: boolean;
}

export async function createBackupJob(data: CreateBackupJobData): Promise<BackupJobRecord> {
  return prisma.backupJob.create({
    data: {
      storeId: data.storeId,
      createdById: data.createdById,
      filename: data.filename,
      format: data.format,
      isAutomatic: data.isAutomatic,
      status: BackupJobStatus.RUNNING,
    },
    select: jobSelect,
  });
}

export async function markBackupJobSucceeded(
  id: string,
  artefact: { sizeBytes: number; checksumSha256: string },
): Promise<BackupJobRecord> {
  return prisma.backupJob.update({
    where: { id },
    data: {
      status: BackupJobStatus.SUCCEEDED,
      sizeBytes: BigInt(artefact.sizeBytes),
      checksumSha256: artefact.checksumSha256,
      completedAt: new Date(),
    },
    select: jobSelect,
  });
}

export async function markBackupJobFailed(
  id: string,
  errorMessage: string,
): Promise<BackupJobRecord> {
  return prisma.backupJob.update({
    where: { id },
    data: {
      status: BackupJobStatus.FAILED,
      // Truncated: the full failure is in the server log, and this string is
      // shown verbatim to an administrator.
      errorMessage: errorMessage.slice(0, 500),
      completedAt: new Date(),
    },
    select: jobSelect,
  });
}

export async function findBackupJob(
  storeId: string,
  id: string,
): Promise<BackupJobRecord | null> {
  return prisma.backupJob.findFirst({ where: { id, storeId }, select: jobSelect });
}

export async function listBackupJobs(storeId: string, limit: number): Promise<BackupJobRecord[]> {
  return prisma.backupJob.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: jobSelect,
  });
}

export async function findStoreProfileForBackup(
  storeId: string,
): Promise<BackupStoreProfile | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      currency: true,
      timezone: true,
    },
  });
}

export interface StoreDump {
  store: BackupStoreProfile;
  data: Record<string, Record<string, unknown>[]>;
}

/**
 * Reads every store-scoped table for one store.
 *
 * Ordered by `id` so two dumps of unchanged data produce byte-identical files,
 * which makes checksums comparable and diffs meaningful.
 *
 * Not wrapped in a transaction: a snapshot isolation level would be the right
 * tool, but holding one open across twenty-odd full table scans on the request
 * path costs more than it buys here. A backup taken while a sale is being
 * written can therefore capture the sale without its payment row. Restoring
 * such a file is still internally consistent as far as the foreign keys are
 * concerned — the missing row is simply absent.
 */
export async function dumpStoreData(storeId: string): Promise<StoreDump> {
  const store = await findStoreProfileForBackup(storeId);
  if (!store) throw ApiError.notFound('Store not found');

  const data: Record<string, Record<string, unknown>[]> = {};

  for (const model of BACKUP_INSERT_ORDER) {
    data[model.key] = await delegateFor(prisma, model).findMany({
      where: { storeId },
      orderBy: { id: 'asc' },
    });
  }

  return { store, data };
}

function narrowRow(
  delegateName: string,
  row: Record<string, unknown>,
  storeId: string,
): Record<string, unknown> {
  const allowed = scalarFieldsByDelegate.get(delegateName);
  const narrowed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (!allowed || allowed.has(key)) {
      narrowed[key] = value;
    }
  }

  // The tenant column is taken from the session, never from the file, so a
  // document carrying another store's ids cannot write across the boundary.
  narrowed.storeId = storeId;
  return narrowed;
}

export interface RestoreStoreDataInput {
  storeId: string;
  /** The signed-in administrator; their row is preserved so the session survives. */
  actorId: string;
  document: DecodedBackupDocument;
}

export interface RestoreStoreDataResult {
  counts: Record<string, number>;
  totalRows: number;
  /** True when the acting administrator had to be re-created after the wipe. */
  actorReinstated: boolean;
}

/**
 * Replaces one store's data with the contents of a backup document.
 *
 * Runs as a single interactive transaction: either every table ends up matching
 * the file, or nothing changes. That guarantee covers the database only. The
 * artefacts under `BACKUP_DIR` and any uploaded product images are outside it,
 * so a failed restore can still leave a stale file behind — it just never
 * leaves the database half-restored.
 *
 * The `Store` row itself is updated, not deleted, and no other store is
 * touched: every statement is scoped by `storeId`.
 */
export async function restoreStoreData(
  input: RestoreStoreDataInput,
): Promise<RestoreStoreDataResult> {
  const { storeId, actorId, document } = input;

  // Captured before the wipe so the acting administrator can be put back if the
  // backup predates their account.
  const actorSnapshot = await prisma.user.findFirst({ where: { id: actorId, storeId } });

  return prisma.$transaction(
    async (tx) => {
      for (const model of BACKUP_DELETE_ORDER) {
        await delegateFor(tx, model).deleteMany({ where: { storeId } });
      }

      const counts: Record<string, number> = {};
      let totalRows = 0;

      for (const model of BACKUP_INSERT_ORDER) {
        const rows = document.data[model.key] ?? [];
        counts[model.key] = rows.length;
        totalRows += rows.length;
        if (rows.length === 0) continue;

        const delegate = delegateFor(tx, model);
        for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
          const chunk = rows
            .slice(offset, offset + INSERT_CHUNK_SIZE)
            .map((row) => narrowRow(model.delegate, row, storeId));
          await delegate.createMany({ data: chunk });
        }
      }

      const actorReinstated = await reinstateActor(tx, storeId, actorId, actorSnapshot);

      await tx.store.update({
        where: { id: storeId },
        data: {
          name: document.store.name,
          phone: document.store.phone ?? null,
          address: document.store.address ?? null,
          currency: document.store.currency,
          timezone: document.store.timezone,
        },
      });

      return { counts, totalRows, actorReinstated };
    },
    {
      timeout: RESTORE_TRANSACTION_TIMEOUT_MS,
      maxWait: RESTORE_TRANSACTION_MAX_WAIT_MS,
    },
  );
}

export interface ResetStoreDataInput {
  storeId: string;
  actorId: string;
}

export interface ResetStoreDataResult {
  deletedCounts: Record<string, number>;
  totalDeletedRows: number;
  retainedUserId: string;
}

/**
 * Factory-reset one store: wipe all business rows while keeping the acting
 * administrator so the session stays valid. Billing (subscription / invoices),
 * audit trail, and backup job records are intentionally left untouched.
 */
export async function resetStoreData(
  input: ResetStoreDataInput,
): Promise<ResetStoreDataResult> {
  const { storeId, actorId } = input;

  const actor = await prisma.user.findFirst({
    where: { id: actorId, storeId },
    select: { id: true },
  });
  if (!actor) {
    throw ApiError.internal('Could not identify the administrator performing the reset');
  }

  return prisma.$transaction(
    async (tx) => {
      const deletedCounts: Record<string, number> = {};
      let totalDeletedRows = 0;

      for (const model of BACKUP_DELETE_ORDER) {
        if (model.delegate === 'user' || model.delegate === 'userResponsibility') {
          continue;
        }
        const result = await delegateFor(tx, model).deleteMany({ where: { storeId } });
        deletedCounts[model.key] = result.count;
        totalDeletedRows += result.count;
      }

      const otherUsers = await tx.user.findMany({
        where: { storeId, id: { not: actorId } },
        select: { id: true },
      });
      const otherIds = otherUsers.map((u) => u.id);

      if (otherIds.length > 0) {
        const resp = await tx.userResponsibility.deleteMany({
          where: { storeId, userId: { in: otherIds } },
        });
        deletedCounts.userResponsibilities =
          (deletedCounts.userResponsibilities ?? 0) + resp.count;
        totalDeletedRows += resp.count;

        const users = await tx.user.deleteMany({
          where: { storeId, id: { in: otherIds } },
        });
        deletedCounts.users = users.count;
        totalDeletedRows += users.count;
      } else {
        deletedCounts.userResponsibilities = deletedCounts.userResponsibilities ?? 0;
        deletedCounts.users = 0;
      }

      return {
        deletedCounts,
        totalDeletedRows,
        retainedUserId: actorId,
      };
    },
    {
      timeout: RESTORE_TRANSACTION_TIMEOUT_MS,
      maxWait: RESTORE_TRANSACTION_MAX_WAIT_MS,
    },
  );
}

/**
 * Puts the acting administrator back if the backup did not contain them.
 *
 * Restoring a backup taken before your own account existed would otherwise
 * delete you mid-request: the transaction commits, and the next call fails
 * authentication against a user id that no longer exists. Re-creating the row
 * verbatim keeps the session valid.
 *
 * If the restored data already claims that email or username, the row cannot be
 * re-created without violating the per-store uniqueness, so the whole restore
 * is rolled back and the administrator is told what collided. Silently renaming
 * an account to force the restore through would be worse.
 */
async function reinstateActor(
  tx: TransactionClient,
  storeId: string,
  actorId: string,
  snapshot: Awaited<ReturnType<typeof prisma.user.findFirst>>,
): Promise<boolean> {
  const restored = await tx.user.findUnique({ where: { id: actorId } });
  if (restored) return false;

  if (!snapshot) {
    throw ApiError.internal('Could not identify the administrator performing the restore');
  }

  const emailTaken = await tx.user.findFirst({
    where: { storeId, email: snapshot.email },
    select: { id: true },
  });
  const usernameTaken = snapshot.username
    ? await tx.user.findFirst({
        where: { storeId, username: snapshot.username },
        select: { id: true },
      })
    : null;

  if (emailTaken || usernameTaken) {
    throw ApiError.conflict(
      'This backup does not contain your account, and the account it restores in its place uses ' +
        'the same email or username. Sign in as an administrator that exists in the backup, or ' +
        'restore a newer backup.',
    );
  }

  await tx.user.create({ data: snapshot });
  logger.warn('Restore reinstated the acting administrator', { storeId, actorId });
  return true;
}
