import {
  BACKUP_RESTORE_CONFIRMATION,
  BackupJobStatus,
  type BackupJobSummary,
  type RestoreBackupResponse,
} from '@furniture-erp/shared';
import { AlertTriangle, ArrowLeft, DatabaseBackup, Download, Upload } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { canManageBackups } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';
import { backupsService } from '@/services/backups.service';
import { formatDateTime } from '@/utils/format';

import { useBackups, useCreateBackup, useRestoreBackup } from '../hooks/use-backups';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, string> = {
  [BackupJobStatus.PENDING]: 'Navbatda',
  [BackupJobStatus.RUNNING]: 'Bajarilmoqda',
  [BackupJobStatus.SUCCEEDED]: 'Tayyor',
  [BackupJobStatus.FAILED]: 'Xatolik',
};

function statusClass(status: string): string {
  if (status === BackupJobStatus.SUCCEEDED) return 'bg-success-50 text-success-700';
  if (status === BackupJobStatus.FAILED) return 'bg-danger-50 text-danger-700';
  return 'bg-surface-muted text-ink-muted';
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const detail = error.details?.[0]?.message;
    return detail ?? error.message ?? fallback;
  }
  return fallback;
}

function BackupRow({ backup }: { backup: BackupJobSummary }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-3 py-2.5 text-sm text-ink">
        {formatDateTime(backup.createdAt)}
        {backup.isAutomatic ? (
          <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
            Avtomatik
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            statusClass(backup.status),
          )}
        >
          {STATUS_LABELS[backup.status] ?? backup.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-ink-muted">{formatBytes(backup.sizeBytes)}</td>
      <td className="px-3 py-2.5 text-sm text-ink-muted">{backup.createdByName ?? '—'}</td>
      <td className="px-3 py-2.5 text-right">
        {backup.isDownloadable ? (
          <a
            className="inline-flex items-center gap-1.5 rounded-input border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface-muted"
            href={backupsService.downloadUrl(backup.id)}
            download={backup.filename}
          >
            <Download className="size-4" aria-hidden="true" />
            Yuklab olish
          </a>
        ) : (
          <span className="text-xs text-ink-subtle">
            {backup.status === BackupJobStatus.FAILED
              ? (backup.errorMessage ?? 'Xatolik')
              : 'Fayl serverda yo‘q'}
          </span>
        )}
      </td>
    </tr>
  );
}

function CreateBackupSection({ latest }: { latest: BackupJobSummary | undefined }) {
  const createBackup = useCreateBackup();
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function handleCreate() {
    setMessage(null);
    setFailure(null);
    try {
      await createBackup.mutateAsync({});
      setMessage('Zaxira nusxa tayyor. Uni darhol yuklab oling.');
    } catch (error) {
      setFailure(errorMessage(error, 'Zaxira nusxa yaratib bo‘lmadi.'));
    }
  }

  return (
    <SectionCard
      title="Zaxira nusxa yaratish"
      description="Do‘kon ma’lumotlarining to‘liq JSON nusxasi (gzip)."
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          Oxirgi zaxira nusxa:{' '}
          <span className="font-medium text-ink">
            {latest ? formatDateTime(latest.createdAt) : 'hali yaratilmagan'}
          </span>
        </p>

        <p className="text-xs text-ink-subtle">
          Fayl serverda vaqtincha saqlanadi va server qayta ishga tushganda o‘chib ketishi
          mumkin. Yaratgandan so‘ng darhol yuklab oling va xavfsiz joyda saqlang — faylda
          mijozlar ma’lumotlari va parol xeshlari bor.
        </p>

        {failure ? <p className="text-sm text-danger-700">{failure}</p> : null}
        {message ? <p className="text-sm text-success-700">{message}</p> : null}

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleCreate()}
            disabled={createBackup.isPending}
          >
            <DatabaseBackup className="size-4" aria-hidden="true" />
            {createBackup.isPending ? 'Yaratilmoqda…' : 'Zaxira nusxa yaratish'}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function RestoreSection() {
  const restore = useRestoreBackup();
  const [file, setFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<RestoreBackupResponse | null>(null);

  const confirmed = confirmation === BACKUP_RESTORE_CONFIRMATION;
  const ready = Boolean(file) && confirmed && !restore.isPending;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setFailure(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !confirmed) return;

    setFailure(null);
    setResult(null);

    try {
      const response = await restore.mutateAsync({ file, confirmation });
      setResult(response);
      setConfirmation('');
      setFile(null);
    } catch (error) {
      setFailure(errorMessage(error, 'Tiklashda xatolik yuz berdi.'));
    }
  }

  return (
    <SectionCard
      title="Zaxiradan tiklash"
      description="Diqqat: bu amal joriy ma’lumotlarni butunlay almashtiradi."
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex gap-3 rounded-card border border-danger-100 bg-danger-50 p-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden="true" />
          <div className="space-y-1 text-sm text-danger-700">
            <p className="font-semibold">
              Bu amal qaytarib bo‘lmaydi / This action cannot be undone
            </p>
            <p>
              Joriy do‘konning barcha sotuvlari, mijozlari, mahsulotlari, xarajatlari va
              ishchilari o‘chiriladi va zaxira fayldagi ma’lumotlar bilan almashtiriladi.
              Tiklashdan oldin tizim avtomatik xavfsizlik nusxasini yaratadi.
            </p>
            <p>
              All sales, customers, products, expenses and workers in this store are deleted and
              replaced with the contents of the uploaded file. A safety backup is taken first.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="restore-file">
            Zaxira fayl (.json.gz)
          </label>
          <input
            id="restore-file"
            type="file"
            accept=".gz,.json,application/gzip,application/json"
            className={fieldClass}
            onChange={handleFileChange}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="restore-confirmation">
            Tasdiqlash uchun <span className="font-mono font-semibold">
              {BACKUP_RESTORE_CONFIRMATION}
            </span>{' '}
            deb yozing
          </label>
          <input
            id="restore-confirmation"
            className={fieldClass}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={BACKUP_RESTORE_CONFIRMATION}
            autoComplete="off"
          />
        </div>

        {failure ? <p className="text-sm text-danger-700">{failure}</p> : null}

        {result ? (
          <div className="rounded-card border border-line bg-surface-muted p-3 text-sm text-ink">
            <p className="font-medium text-success-700">
              Tiklandi: {result.totalRestoredRows} ta yozuv.
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Zaxira sanasi: {formatDateTime(result.backupCreatedAt)}
            </p>
            {result.safetyBackupId ? null : (
              <p className="mt-1 text-xs text-danger-700">
                Diqqat: tiklashdan oldingi xavfsizlik nusxasi yaratilmadi.
              </p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-input bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!ready}
          >
            <Upload className="size-4" aria-hidden="true" />
            {restore.isPending ? 'Tiklanmoqda…' : 'Zaxiradan tiklash'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export function BackupPage() {
  const { data: currentUser, isPending } = useCurrentUser();
  const allowed = canManageBackups(currentUser);
  const backups = useBackups(Boolean(currentUser) && allowed);

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  if (!allowed) {
    return (
      <PageContainer>
        <ErrorState
          title="Ruxsat yo‘q"
          message="Zaxira nusxalarni faqat do‘kon administratori boshqaradi."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          to={ROUTES.settings}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Sozlamalar
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Zaxira nusxa va tiklash
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Do‘kon ma’lumotlarini yuklab oling yoki zaxiradan tiklang.
        </p>
      </div>

      <CreateBackupSection latest={backups.data?.[0]} />

      <SectionCard title="Zaxira nusxalar" description="Oxirgi 20 ta nusxa." padded={false}>
        {backups.isError ? (
          <div className="p-4">
            <ErrorState
              title="Ro‘yxatni yuklab bo‘lmadi"
              message={errorMessage(backups.error, 'Qayta urinib ko‘ring.')}
              onRetry={() => void backups.refetch()}
            />
          </div>
        ) : backups.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !backups.data?.length ? (
          <p className="p-4 text-sm text-ink-muted">Hali zaxira nusxa yaratilmagan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-ink-subtle">
                  <th className="px-3 py-2 font-medium">Sana</th>
                  <th className="px-3 py-2 font-medium">Holat</th>
                  <th className="px-3 py-2 font-medium">Hajm</th>
                  <th className="px-3 py-2 font-medium">Kim</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {backups.data.map((backup) => (
                  <BackupRow key={backup.id} backup={backup} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <RestoreSection />
    </PageContainer>
  );
}
