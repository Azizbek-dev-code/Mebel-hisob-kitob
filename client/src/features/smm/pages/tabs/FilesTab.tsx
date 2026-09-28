import { FeatureKey, SMM_FILE_KIND_LABELS } from '@furniture-erp/shared';
import { FileIcon, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { formatDateTime } from '@/utils/format';

import { useDeleteSmmFile, useSmmFiles, useUploadSmmFile } from '../../hooks/use-smm';
import { BTN_SECONDARY } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function FilesTab() {
  const projectId = useSmmProjectId();
  const files = useSmmFiles(projectId);
  const upload = useUploadSmmFile(projectId);
  const remove = useDeleteSmmFile(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ file });
      setMessage('Fayl yuklandi');
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : 'Yuklab bo‘lmadi');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onFileChange(e.target.files)}
        />
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Upload className="size-4" />
          Yuklash
        </WriteGuard>
      </div>

      {message ? (
        <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm">{message}</p>
      ) : null}

      {files.isError ? (
        <ErrorState
          title="Fayllar yuklanmadi"
          message={files.error instanceof ApiClientError ? files.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void files.refetch()}
        />
      ) : files.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (files.data ?? []).length === 0 ? (
        <EmptyState icon={FileIcon} title="Fayl yo‘q" description="Video, rasm yoki skript yuklang" />
      ) : (
        <SectionCard title="Fayllar">
          <ul className="divide-y divide-line">
            {(files.data ?? []).map((file) => (
              <li key={file.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {file.fileName}
                  </a>
                  <p className="text-xs text-ink-muted">
                    {SMM_FILE_KIND_LABELS[file.kind]} · {formatDateTime(file.createdAt)}
                    {file.uploadedBy ? ` · ${file.uploadedBy.fullName}` : ''}
                  </p>
                </div>
                <WriteGuard
                  feature={FeatureKey.SMM_PROJECTS}
                  className={BTN_SECONDARY}
                  onClick={() => {
                    if (window.confirm('Faylni o‘chirasizmi?')) void remove.mutateAsync(file.id);
                  }}
                >
                  O‘chirish
                </WriteGuard>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
