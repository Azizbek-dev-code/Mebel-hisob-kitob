import {
  FeatureKey,
  SMM_PLATFORM_LABELS,
  type SmmCompetitorListItem,
} from '@furniture-erp/shared';
import { Plus, Target } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';

import { CompetitorFormDialog } from '../../components/CompetitorFormDialog';
import { useSmmCompetitors, useUpdateSmmCompetitor } from '../../hooks/use-smm';
import { BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function CompetitorsTab() {
  const projectId = useSmmProjectId();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SmmCompetitorListItem | null>(null);
  const list = useSmmCompetitors(projectId, { search: search || undefined, pageSize: 50 });
  const update = useUpdateSmmCompetitor(projectId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${FIELD_CLASS} sm:max-w-xs`}
          placeholder="Qidirish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Raqobatchi
        </WriteGuard>
      </div>

      {list.isError ? (
        list.error instanceof ApiClientError && list.error.isForbidden ? (
          <EmptyState
            icon={Target}
            title="Ruxsat yo‘q"
            description="Raqobatchilar bo‘limiga kirish cheklangan"
          />
        ) : (
          <ErrorState
            title="Yuklanmadi"
            message={list.error instanceof ApiClientError ? list.error.message : 'Qayta urinib ko‘ring'}
            onRetry={() => void list.refetch()}
          />
        )
      ) : list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Target} title="Raqobatchi yo‘q" description="Tadqiqot uchun raqobatchi qo‘shing" />
      ) : (
        <SectionCard title="Raqobatchilar">
          <ul className="divide-y divide-line">
            {(list.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-ink-muted">
                    {SMM_PLATFORM_LABELS[item.platform]}
                    {item.followers != null ? ` · ${item.followers.toLocaleString('uz-UZ')} obunachi` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
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
                          competitorId: item.id,
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

      <CompetitorFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        competitor={editing}
      />
    </div>
  );
}
