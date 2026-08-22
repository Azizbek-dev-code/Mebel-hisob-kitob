import {
  BACKUP_RESTORE_CONFIRMATION,
  BackupFormat,
  BackupJobStatus,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import { Readable } from 'node:stream';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, backupServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  backupServiceMock: {
    listBackups: vi.fn(),
    createBackup: vi.fn(),
    getBackup: vi.fn(),
    openBackupDownload: vi.fn(),
    restoreBackup: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/backup.service.js', () => backupServiceMock);

const app = createApp();
const PASSWORD = 'Admin123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const ADMIN_RECORD = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: UserRole.ADMIN,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const EMPLOYEE_RECORD = { ...ADMIN_RECORD, id: 'user_ali', username: 'ali', role: UserRole.EMPLOYEE };

const BACKUP = {
  id: 'ckv1234567890abcdefghijkl',
  status: BackupJobStatus.SUCCEEDED,
  format: BackupFormat.LOGICAL_JSON,
  filename: 'furniture-erp-backup-test.json.gz',
  sizeBytes: 2048,
  checksumSha256: 'abc123',
  errorMessage: null,
  isAutomatic: false,
  isDownloadable: true,
  createdByName: 'Store Administrator',
  createdAt: '2026-08-20T09:00:00.000Z',
  completedAt: '2026-08-20T09:00:05.000Z',
};

async function loginAs(user: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(user);
  prismaMock.user.update.mockResolvedValue(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: user.username, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'] as string[];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('backups.routes auth', () => {
  it('requires auth to list', async () => {
    const res = await request(app).get('/api/backups');
    expect(res.status).toBe(401);
    expect(backupServiceMock.listBackups).not.toHaveBeenCalled();
  });

  it('requires auth to create', async () => {
    const res = await request(app).post('/api/backups').send({});
    expect(res.status).toBe(401);
  });

  it('requires auth to restore', async () => {
    const res = await request(app)
      .post('/api/backups/restore')
      .field('confirmation', BACKUP_RESTORE_CONFIRMATION)
      .attach('file', Buffer.from('{}'), 'backup.json');
    expect(res.status).toBe(401);
  });

  it('surfaces the service forbidden for a non-admin', async () => {
    const cookie = await loginAs(EMPLOYEE_RECORD);
    const { ApiError } = await import('../utils/api-error.js');
    backupServiceMock.listBackups.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage backups'),
    );

    const res = await request(app).get('/api/backups').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});

describe('backups.routes list and create', () => {
  it('lists backups for an admin', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    backupServiceMock.listBackups.mockResolvedValue([BACKUP]);

    const res = await request(app).get('/api/backups').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.backups).toEqual([BACKUP]);
    expect(backupServiceMock.listBackups).toHaveBeenCalledWith('store_1', UserRole.ADMIN);
  });

  it('creates a backup and answers 201', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    backupServiceMock.createBackup.mockResolvedValue(BACKUP);

    const res = await request(app).post('/api/backups').set('Cookie', cookie).send({});

    expect(res.status).toBe(201);
    expect(res.body.data.backup.id).toBe(BACKUP.id);
    expect(backupServiceMock.createBackup).toHaveBeenCalledWith(
      { id: 'user_admin', storeId: 'store_1', role: UserRole.ADMIN },
      { format: undefined },
    );
  });

  it('rejects an unknown format', async () => {
    const cookie = await loginAs(ADMIN_RECORD);

    const res = await request(app)
      .post('/api/backups')
      .set('Cookie', cookie)
      .send({ format: 'ZIP' });

    expect(res.status).toBe(422);
    expect(backupServiceMock.createBackup).not.toHaveBeenCalled();
  });

  it('returns metadata for one backup', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    backupServiceMock.getBackup.mockResolvedValue(BACKUP);

    const res = await request(app).get(`/api/backups/${BACKUP.id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(backupServiceMock.getBackup).toHaveBeenCalledWith('store_1', UserRole.ADMIN, BACKUP.id);
  });

  it('rejects an id that is not a cuid, so no path can be smuggled through', async () => {
    const cookie = await loginAs(ADMIN_RECORD);

    const res = await request(app)
      .get('/api/backups/..%2F..%2Fetc%2Fpasswd/download')
      .set('Cookie', cookie);

    expect(res.status).toBe(422);
    expect(backupServiceMock.openBackupDownload).not.toHaveBeenCalled();
  });
});

describe('backups.routes download', () => {
  it('streams the artefact as an attachment', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    const payload = Buffer.from('gzipped-bytes');
    backupServiceMock.openBackupDownload.mockResolvedValue({
      filename: BACKUP.filename,
      stream: Readable.from([payload]),
      sizeBytes: payload.length,
    });

    const res = await request(app)
      .get(`/api/backups/${BACKUP.id}/download`)
      .set('Cookie', cookie)
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${BACKUP.filename}"`,
    );
    expect(res.headers['content-type']).toContain('application/gzip');
    expect(res.headers['cache-control']).toBe('no-store');
    // The bytes must arrive untouched: a download that silently loses or
    // re-encodes part of the stream produces a backup that cannot be restored.
    expect(Buffer.from(res.body as Buffer).equals(payload)).toBe(true);
  });
});

describe('backups.routes restore', () => {
  it('passes the uploaded file and confirmation to the service', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    backupServiceMock.restoreBackup.mockResolvedValue({
      backupCreatedAt: '2026-08-20T09:00:00.000Z',
      restoredCounts: { users: 1 },
      totalRestoredRows: 1,
      safetyBackupId: 'backup_safety',
    });

    const res = await request(app)
      .post('/api/backups/restore')
      .set('Cookie', cookie)
      .field('confirmation', BACKUP_RESTORE_CONFIRMATION)
      .attach('file', Buffer.from('{"format":"furniture-erp-logical-v1"}'), 'backup.json');

    expect(res.status).toBe(200);
    expect(res.body.data.totalRestoredRows).toBe(1);

    const call = backupServiceMock.restoreBackup.mock.calls[0]![0] as {
      confirmation: string;
      file: Buffer;
      actor: { id: string; storeId: string };
    };
    expect(call.confirmation).toBe(BACKUP_RESTORE_CONFIRMATION);
    expect(call.actor).toEqual({ id: 'user_admin', storeId: 'store_1', role: UserRole.ADMIN });
    expect(call.file.toString('utf8')).toContain('furniture-erp-logical-v1');
  });

  it('422s when no file is attached', async () => {
    const cookie = await loginAs(ADMIN_RECORD);

    const res = await request(app)
      .post('/api/backups/restore')
      .set('Cookie', cookie)
      .field('confirmation', BACKUP_RESTORE_CONFIRMATION);

    expect(res.status).toBe(422);
    expect(backupServiceMock.restoreBackup).not.toHaveBeenCalled();
  });

  it('422s when the confirmation field is missing', async () => {
    const cookie = await loginAs(ADMIN_RECORD);

    const res = await request(app)
      .post('/api/backups/restore')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('{}'), 'backup.json');

    expect(res.status).toBe(422);
    expect(backupServiceMock.restoreBackup).not.toHaveBeenCalled();
  });

  it('does not treat /restore as a backup id', async () => {
    const cookie = await loginAs(ADMIN_RECORD);
    backupServiceMock.restoreBackup.mockResolvedValue({
      backupCreatedAt: '2026-08-20T09:00:00.000Z',
      restoredCounts: {},
      totalRestoredRows: 0,
      safetyBackupId: null,
    });

    const res = await request(app)
      .post('/api/backups/restore')
      .set('Cookie', cookie)
      .field('confirmation', BACKUP_RESTORE_CONFIRMATION)
      .attach('file', Buffer.from('{}'), 'backup.json');

    expect(res.status).toBe(200);
    expect(backupServiceMock.getBackup).not.toHaveBeenCalled();
  });
});
