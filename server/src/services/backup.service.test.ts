import {
  AuditEventType,
  BACKUP_LOGICAL_FORMAT,
  BACKUP_LOGICAL_VERSION,
  BACKUP_RESTORE_CONFIRMATION,
  BackupFormat,
  BackupJobStatus,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { backupRepoMock, storageMock, recordAuditMock } = vi.hoisted(() => ({
  recordAuditMock: vi.fn(async () => undefined),
  backupRepoMock: {
    createBackupJob: vi.fn(),
    markBackupJobSucceeded: vi.fn(),
    markBackupJobFailed: vi.fn(),
    findBackupJob: vi.fn(),
    listBackupJobs: vi.fn(),
    findStoreProfileForBackup: vi.fn(),
    dumpStoreData: vi.fn(),
    restoreStoreData: vi.fn(),
  },
  storageMock: {
    BackupTooLargeError: class BackupTooLargeError extends Error {},
    backupArtefactExists: vi.fn(),
    buildBackupFilename: vi.fn(() => 'furniture-erp-backup-test.json.gz'),
    openBackupArtefact: vi.fn(() => ({ pipe: vi.fn() })),
    writeBackupArtefact: vi.fn(),
    // Faithful to the real helper's plain-JSON branch; the gzip branch is
    // covered in the storage unit test.
    readUploadedDocument: vi.fn((buffer: Buffer) => buffer.toString('utf8')),
  },
}));

vi.mock('../repositories/backup.repository.js', () => backupRepoMock);
vi.mock('../lib/backup/storage.js', () => storageMock);
vi.mock('./audit.service.js', () => ({ recordAudit: recordAuditMock }));

const {
  assertCanManageBackups,
  canManageBackups,
  createBackup,
  getBackup,
  listBackups,
  openBackupDownload,
  restoreBackup,
} = await import('./backup.service.js');

const STORE_ID = 'store_1';
const ADMIN = { id: 'user_admin', storeId: STORE_ID, role: UserRole.ADMIN };
const EMPLOYEE = { id: 'user_ali', storeId: STORE_ID, role: UserRole.EMPLOYEE };

function jobRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'backup_1',
    storeId: STORE_ID,
    status: BackupJobStatus.SUCCEEDED,
    format: BackupFormat.LOGICAL_JSON,
    filename: 'furniture-erp-backup-test.json.gz',
    sizeBytes: 2048n,
    checksumSha256: 'abc123',
    errorMessage: null,
    isAutomatic: false,
    createdAt: new Date('2026-08-20T09:00:00.000Z'),
    completedAt: new Date('2026-08-20T09:00:05.000Z'),
    createdBy: { fullName: 'Store Administrator' },
    ...overrides,
  };
}

function backupFile(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      version: BACKUP_LOGICAL_VERSION,
      format: BACKUP_LOGICAL_FORMAT,
      createdAt: '2026-08-20T09:00:00.000Z',
      storeId: STORE_ID,
      store: {
        id: STORE_ID,
        name: 'Mebel Savdo',
        phone: null,
        address: null,
        currency: 'UZS',
        timezone: 'Asia/Tashkent',
      },
      data: { users: [{ id: 'user_admin', storeId: STORE_ID }] },
      ...overrides,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  backupRepoMock.createBackupJob.mockResolvedValue(jobRecord({ status: BackupJobStatus.RUNNING }));
  backupRepoMock.markBackupJobSucceeded.mockResolvedValue(jobRecord());
  backupRepoMock.markBackupJobFailed.mockResolvedValue(jobRecord({ status: BackupJobStatus.FAILED }));
  backupRepoMock.dumpStoreData.mockResolvedValue({
    store: { id: STORE_ID, name: 'Mebel Savdo', phone: null, address: null, currency: 'UZS', timezone: 'Asia/Tashkent' },
    data: { users: [{ id: 'user_admin', storeId: STORE_ID, createdAt: new Date(0) }] },
  });
  backupRepoMock.restoreStoreData.mockResolvedValue({
    counts: { users: 1 },
    totalRows: 1,
    actorReinstated: false,
  });
  storageMock.writeBackupArtefact.mockResolvedValue({ sizeBytes: 2048, checksumSha256: 'abc123' });
  storageMock.backupArtefactExists.mockResolvedValue(true);
});

describe('backup.service permissions', () => {
  it('allows admins and platform admins', () => {
    expect(canManageBackups(UserRole.ADMIN)).toBe(true);
    expect(canManageBackups(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(() => assertCanManageBackups(UserRole.ADMIN)).not.toThrow();
  });

  it('denies cashiers and employees', () => {
    expect(canManageBackups(UserRole.CASHIER)).toBe(false);
    expect(canManageBackups(UserRole.EMPLOYEE)).toBe(false);
    expect(() => assertCanManageBackups(UserRole.EMPLOYEE)).toThrow(ApiError);
  });

  it('refuses to list for a non-admin', async () => {
    await expect(listBackups(STORE_ID, UserRole.EMPLOYEE)).rejects.toThrow(ApiError);
    expect(backupRepoMock.listBackupJobs).not.toHaveBeenCalled();
  });

  it('refuses to create for a non-admin', async () => {
    await expect(createBackup(EMPLOYEE)).rejects.toThrow(ApiError);
    expect(backupRepoMock.createBackupJob).not.toHaveBeenCalled();
  });

  it('refuses to download for a non-admin', async () => {
    await expect(openBackupDownload(STORE_ID, UserRole.CASHIER, 'backup_1')).rejects.toThrow(
      ApiError,
    );
    expect(backupRepoMock.findBackupJob).not.toHaveBeenCalled();
  });

  it('refuses to restore for a non-admin before reading the file', async () => {
    await expect(
      restoreBackup({
        actor: EMPLOYEE,
        confirmation: BACKUP_RESTORE_CONFIRMATION,
        file: backupFile(),
      }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });
});

describe('backup.service create', () => {
  it('writes an artefact and marks the job succeeded', async () => {
    const summary = await createBackup(ADMIN);

    expect(backupRepoMock.createBackupJob).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: STORE_ID,
        createdById: 'user_admin',
        format: BackupFormat.LOGICAL_JSON,
        isAutomatic: false,
      }),
    );

    const [storeId, backupId, json] = storageMock.writeBackupArtefact.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(storeId).toBe(STORE_ID);
    expect(backupId).toBe('backup_1');

    const document = JSON.parse(json) as Record<string, unknown>;
    expect(document.format).toBe(BACKUP_LOGICAL_FORMAT);
    expect(document.version).toBe(BACKUP_LOGICAL_VERSION);
    expect(document.storeId).toBe(STORE_ID);

    expect(backupRepoMock.markBackupJobSucceeded).toHaveBeenCalledWith('backup_1', {
      sizeBytes: 2048,
      checksumSha256: 'abc123',
    });
    expect(summary.sizeBytes).toBe(2048);
    expect(summary.isDownloadable).toBe(true);
  });

  it('encodes BigInt and Date so the document survives JSON', async () => {
    backupRepoMock.dumpStoreData.mockResolvedValue({
      store: { id: STORE_ID, name: 'Mebel Savdo', phone: null, address: null, currency: 'UZS', timezone: 'Asia/Tashkent' },
      data: {
        sales: [{ id: 'sale_1', storeId: STORE_ID, totalSalePrice: 1_500_000n, saleDate: new Date('2026-08-01T00:00:00.000Z') }],
      },
    });

    await createBackup(ADMIN);

    const json = storageMock.writeBackupArtefact.mock.calls[0]![2] as string;
    const document = JSON.parse(json) as { data: { sales: Record<string, unknown>[] } };
    expect(document.data.sales[0]).toMatchObject({
      totalSalePrice: { $bigint: '1500000' },
      saleDate: { $date: '2026-08-01T00:00:00.000Z' },
    });
  });

  it('marks the job failed and reports a generic error when the dump throws', async () => {
    backupRepoMock.dumpStoreData.mockRejectedValue(new Error('connection reset'));

    await expect(createBackup(ADMIN)).rejects.toThrow(ApiError);
    expect(backupRepoMock.markBackupJobFailed).toHaveBeenCalledWith('backup_1', 'connection reset');
  });

  it('rejects the pg_dump format while it is unimplemented', async () => {
    await expect(createBackup(ADMIN, { format: BackupFormat.PG_CUSTOM })).rejects.toThrow(ApiError);
    expect(backupRepoMock.createBackupJob).not.toHaveBeenCalled();
  });
});

describe('backup.service read', () => {
  it('returns metadata scoped to the caller\'s store', async () => {
    backupRepoMock.findBackupJob.mockResolvedValue(jobRecord());

    const summary = await getBackup(STORE_ID, UserRole.ADMIN, 'backup_1');

    expect(backupRepoMock.findBackupJob).toHaveBeenCalledWith(STORE_ID, 'backup_1');
    expect(summary).toMatchObject({
      id: 'backup_1',
      status: BackupJobStatus.SUCCEEDED,
      createdByName: 'Store Administrator',
      createdAt: '2026-08-20T09:00:00.000Z',
    });
  });

  it('marks a job whose file has been evicted as not downloadable', async () => {
    backupRepoMock.listBackupJobs.mockResolvedValue([jobRecord()]);
    storageMock.backupArtefactExists.mockResolvedValue(false);

    const [summary] = await listBackups(STORE_ID, UserRole.ADMIN);

    expect(summary!.isDownloadable).toBe(false);
  });

  it('404s for an id from another store', async () => {
    backupRepoMock.findBackupJob.mockResolvedValue(null);

    await expect(getBackup(STORE_ID, UserRole.ADMIN, 'backup_9')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('backup.service download', () => {
  it('reports 410 once the artefact has left the disk', async () => {
    backupRepoMock.findBackupJob.mockResolvedValue(jobRecord());
    storageMock.backupArtefactExists.mockResolvedValue(false);

    await expect(openBackupDownload(STORE_ID, UserRole.ADMIN, 'backup_1')).rejects.toMatchObject({
      statusCode: 410,
    });
  });

  it('refuses to download a failed job', async () => {
    backupRepoMock.findBackupJob.mockResolvedValue(
      jobRecord({ status: BackupJobStatus.FAILED }),
    );

    await expect(openBackupDownload(STORE_ID, UserRole.ADMIN, 'backup_1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('404s for a backup belonging to another store', async () => {
    backupRepoMock.findBackupJob.mockResolvedValue(null);

    await expect(openBackupDownload(STORE_ID, UserRole.ADMIN, 'backup_9')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(backupRepoMock.findBackupJob).toHaveBeenCalledWith(STORE_ID, 'backup_9');
  });
});

describe('backup.service restore', () => {
  it('rejects a wrong confirmation phrase', async () => {
    await expect(
      restoreBackup({ actor: ADMIN, confirmation: 'restore', file: backupFile() }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });

  it('rejects an empty confirmation', async () => {
    await expect(
      restoreBackup({ actor: ADMIN, confirmation: '', file: backupFile() }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });

  it('rejects a backup taken from another store', async () => {
    await expect(
      restoreBackup({
        actor: ADMIN,
        confirmation: BACKUP_RESTORE_CONFIRMATION,
        file: backupFile({ storeId: 'store_2' }),
      }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });

  it('rejects an unrecognised format', async () => {
    await expect(
      restoreBackup({
        actor: ADMIN,
        confirmation: BACKUP_RESTORE_CONFIRMATION,
        file: backupFile({ format: 'some-other-tool-v3' }),
      }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });

  it('rejects a future document version', async () => {
    await expect(
      restoreBackup({
        actor: ADMIN,
        confirmation: BACKUP_RESTORE_CONFIRMATION,
        file: backupFile({ version: 99 }),
      }),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.restoreStoreData).not.toHaveBeenCalled();
  });

  it('rejects an empty upload', async () => {
    await expect(
      restoreBackup({
        actor: ADMIN,
        confirmation: BACKUP_RESTORE_CONFIRMATION,
        file: Buffer.alloc(0),
      }),
    ).rejects.toThrow(ApiError);
  });

  it('takes a safety backup before restoring and reports its id', async () => {
    const response = await restoreBackup({
      actor: ADMIN,
      confirmation: BACKUP_RESTORE_CONFIRMATION,
      file: backupFile(),
    });

    expect(backupRepoMock.createBackupJob).toHaveBeenCalledWith(
      expect.objectContaining({ isAutomatic: true }),
    );
    expect(response.safetyBackupId).toBe('backup_1');
    expect(response.totalRestoredRows).toBe(1);
    expect(backupRepoMock.restoreStoreData).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: STORE_ID, actorId: 'user_admin' }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.BACKUP_RESTORED,
        entityId: 'backup_1',
      }),
    );
  });

  it('still restores when the safety backup cannot be written, and says so', async () => {
    storageMock.writeBackupArtefact.mockRejectedValue(new Error('disk full'));

    const response = await restoreBackup({
      actor: ADMIN,
      confirmation: BACKUP_RESTORE_CONFIRMATION,
      file: backupFile(),
    });

    expect(response.safetyBackupId).toBeNull();
    expect(backupRepoMock.restoreStoreData).toHaveBeenCalledOnce();
  });

  it('decodes tagged BigInt and Date values before handing rows to the repository', async () => {
    await restoreBackup({
      actor: ADMIN,
      confirmation: BACKUP_RESTORE_CONFIRMATION,
      file: backupFile({
        data: {
          sales: [
            {
              id: 'sale_1',
              storeId: STORE_ID,
              totalSalePrice: { $bigint: '1500000' },
              saleDate: { $date: '2026-08-01T00:00:00.000Z' },
            },
          ],
        },
      }),
    });

    const input = backupRepoMock.restoreStoreData.mock.calls[0]![0] as {
      document: { data: Record<string, Record<string, unknown>[]> };
    };
    const sale = input.document.data.sales![0]!;
    expect(sale.totalSalePrice).toBe(1_500_000n);
    expect(sale.saleDate).toBeInstanceOf(Date);
  });
});
