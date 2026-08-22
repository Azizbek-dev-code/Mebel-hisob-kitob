import { BACKUP_RESTORE_CONFIRMATION, BackupFormat, BackupJobStatus } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackupPage } from '@/features/settings/pages/BackupPage';
import { TEST_ADMIN, TEST_EMPLOYEE } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

const BACKUP = {
  id: 'backup_1',
  status: BackupJobStatus.SUCCEEDED,
  format: BackupFormat.LOGICAL_JSON,
  filename: 'furniture-erp-backup-2026-08-20T09-00-00-000Z.json.gz',
  sizeBytes: 2048,
  checksumSha256: 'abc123',
  errorMessage: null,
  isAutomatic: false,
  isDownloadable: true,
  createdByName: 'Store Administrator',
  createdAt: '2026-08-20T09:00:00.000Z',
  completedAt: '2026-08-20T09:00:05.000Z',
};

const BACKUP_LIST = {
  status: 200,
  body: { success: true, data: { backups: [BACKUP] } },
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <BackupPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BackupPage', () => {
  it('shows the last backup and a download link for an admin', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/backups': BACKUP_LIST,
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Zaxira nusxa va tiklash' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /Yuklab olish/ }),
    ).toHaveAttribute('href', '/api/backups/backup_1/download');
    expect(screen.getByRole('button', { name: /Zaxira nusxa yaratish/ })).toBeInTheDocument();
  });

  it('keeps restore disabled until the confirmation phrase is typed', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/backups': BACKUP_LIST,
    });

    const user = userEvent.setup();
    renderPage();

    const restoreButton = await screen.findByRole('button', { name: /Zaxiradan tiklash/ });
    expect(restoreButton).toBeDisabled();

    const file = new File(['{}'], 'backup.json.gz', { type: 'application/gzip' });
    await user.upload(screen.getByLabelText(/Zaxira fayl/), file);

    // A file alone is not enough — the exact phrase is still required.
    expect(restoreButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/deb yozing/),
      BACKUP_RESTORE_CONFIRMATION.toLowerCase(),
    );
    expect(restoreButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/deb yozing/));
    await user.type(screen.getByLabelText(/deb yozing/), BACKUP_RESTORE_CONFIRMATION);
    expect(restoreButton).toBeEnabled();
  });

  it('warns that the restore is destructive', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/backups': BACKUP_LIST,
    });

    renderPage();

    expect(
      await screen.findByText(/Bu amal qaytarib bo‘lmaydi \/ This action cannot be undone/),
    ).toBeInTheDocument();
  });

  it('refuses the screen to a non-admin without calling the API', async () => {
    const fetchMock = mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_EMPLOYEE } } },
    });

    renderPage();

    expect(await screen.findByText('Ruxsat yo‘q')).toBeInTheDocument();
    const backupCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/backups'),
    );
    expect(backupCalls).toHaveLength(0);
  });
});
