import {
  FeatureKey,
  SMM_CONTENT_TYPE_LABELS,
  SMM_CONTENT_TYPES,
  SMM_PLATFORM_LABELS,
  SMM_PLATFORMS,
  type SmmContentReferenceListItem,
  type SmmContentType,
  type SmmPlatform,
} from '@furniture-erp/shared';
import { Bookmark, Copy, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

import { ReferenceFormDialog } from '../../components/ReferenceFormDialog';
import {
  useDuplicateReferenceIdea,
  useSmmReferences,
  useUpdateSmmReference,
} from '../../hooks/use-smm';
import { BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function SimilarContentTab() {
  const projectId = useSmmProjectId();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<SmmPlatform | 'ALL'>('ALL');
  const [contentType, setContentType] = useState<SmmContentType | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SmmContentReferenceListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const list = useSmmReferences(projectId, {
    search: search || undefined,
    platform,
    contentType,
    pageSize: 50,
  });
  const update = useUpdateSmmReference(projectId);
  const duplicate = useDuplicateReferenceIdea(projectId);

  async function handleDuplicate(item: SmmContentReferenceListItem) {
    try {
      const content = await duplicate.mutateAsync(item.id);
      setMessage('G‘oya yaratildi');
      navigate(ROUTES.smmContentDetail(projectId, content.id));
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : 'Nusxa olinmadi');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={FIELD_CLASS}
            placeholder="Qidirish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={FIELD_CLASS}
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
          >
            <option value="ALL">Barcha platformalar</option>
            {SMM_PLATFORMS.map((p) => (
              <option key={p} value={p}>{SMM_PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <select
            className={FIELD_CLASS}
            value={contentType}
            onChange={(e) => setContentType(e.target.value as typeof contentType)}
          >
            <option value="ALL">Barcha turlar</option>
            {SMM_CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{SMM_CONTENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Referens
        </WriteGuard>
      </div>

      {message ? (
        <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm">{message}</p>
      ) : null}

      {list.isError ? (
        <ErrorState
          title="Yuklanmadi"
          message={list.error instanceof ApiClientError ? list.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Bookmark} title="Referens yo‘q" description="O‘xshash kontent kutubxonasini to‘ldiring" />
      ) : (
        <SectionCard title="Referenslar">
          <ul className="divide-y divide-line">
            {(list.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-ink-muted">
                    {SMM_PLATFORM_LABELS[item.platform]} · {SMM_CONTENT_TYPE_LABELS[item.contentType]}
                    {item.creatorName ? ` · ${item.creatorName}` : ''}
                  </p>
                  {item.tags.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-ink-soft">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => void handleDuplicate(item)}
                  >
                    <Copy className="size-4" />
                    G‘oyaga
                  </WriteGuard>
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                  >
                    Tahrirlash
                  </WriteGuard>
                  {!item.archivedAt ? (
                    <WriteGuard
                      feature={FeatureKey.SMM_PROJECTS}
                      className={BTN_SECONDARY}
                      onClick={() =>
                        void update.mutateAsync({
                          referenceId: item.id,
                          body: { archivedAt: new Date().toISOString() },
                        })
                      }
                    >
                      Arxivlash
                    </WriteGuard>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <ReferenceFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        reference={editing}
      />
    </div>
  );
}
