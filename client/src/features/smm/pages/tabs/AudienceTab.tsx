import { FeatureKey, type SmmAudienceSegmentDetail, type SmmAudienceSegmentListItem } from '@furniture-erp/shared';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';

import { AudienceSegmentFormDialog } from '../../components/AudienceSegmentFormDialog';
import { PersonaFormDialog } from '../../components/PersonaFormDialog';
import {
  useArchiveSmmAudience,
  useSmmAudience,
  useSmmAudienceSegment,
  useSmmPersonas,
} from '../../hooks/use-smm';
import { BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function AudienceTab() {
  const projectId = useSmmProjectId();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [editing, setEditing] = useState<SmmAudienceSegmentListItem | SmmAudienceSegmentDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useSmmAudience(projectId, { search: search || undefined, pageSize: 50 });
  const detail = useSmmAudienceSegment(projectId, selectedId, Boolean(selectedId));
  const archive = useArchiveSmmAudience(projectId);
  const personas = useSmmPersonas(
    projectId,
    { segmentId: selectedId ?? undefined, pageSize: 50 },
    Boolean(selectedId),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${FIELD_CLASS} sm:max-w-xs`}
          placeholder="Segment qidirish…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <WriteGuard
            feature={FeatureKey.SMM_PROJECTS}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Segment
          </WriteGuard>
          <WriteGuard
            feature={FeatureKey.SMM_PROJECTS}
            className={BTN_SECONDARY}
            onClick={() => setPersonaOpen(true)}
          >
            <Plus className="size-4" />
            Persona
          </WriteGuard>
        </div>
      </div>

      {list.isError ? (
        <ErrorState
          title="Auditoriya yuklanmadi"
          message={list.error instanceof ApiClientError ? list.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Segment yo‘q" description="Maqsadli auditoriyani qo‘shing" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard title="Segmentlar">
            <ul className="divide-y divide-line">
              {(list.data?.items ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-1 py-2.5 text-left hover:bg-surface-hover ${
                      selectedId === item.id ? 'bg-brand-50/60' : ''
                    }`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    <span className="text-xs text-ink-muted">
                      {[item.ageRange, item.gender, item.location].filter(Boolean).join(' · ') || '—'}
                      {` · ${item.personaCount} persona`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Tafsilot"
            action={
              selectedId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={() => {
                      const item = (list.data?.items ?? []).find((s) => s.id === selectedId);
                      if (item) {
                        setEditing(detail.data ?? item);
                        setFormOpen(true);
                      }
                    }}
                  >
                    Tahrirlash
                  </button>
                  {detail.data && !detail.data.archivedAt ? (
                    <WriteGuard
                      feature={FeatureKey.SMM_PROJECTS}
                      className={BTN_SECONDARY}
                      onClick={() => {
                        if (window.confirm('Segment arxivlansinmi?')) {
                          void archive.mutateAsync(selectedId).then(() => {
                            void list.refetch();
                            setSelectedId(null);
                          });
                        }
                      }}
                    >
                      Arxivlash
                    </WriteGuard>
                  ) : null}
                </div>
              ) : null
            }
          >
            {!selectedId ? (
              <p className="text-sm text-ink-muted">Segmentni tanlang</p>
            ) : detail.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : detail.data ? (
              <div className="space-y-3 text-sm">
                <p className="text-ink-soft">{detail.data.painPoints || 'Muammolar kiritilmagan'}</p>
                <p className="text-ink-soft">{detail.data.needs || 'Ehtiyojlar kiritilmagan'}</p>
                {detail.data.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {detail.data.interests.map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-soft">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-muted">Personalar</p>
                  {(personas.data?.items ?? []).length === 0 ? (
                    <p className="text-xs text-ink-soft">Persona yo‘q</p>
                  ) : (
                    <ul className="space-y-1">
                      {(personas.data?.items ?? []).map((p) => (
                        <li key={p.id} className="text-sm text-ink">
                          {p.name}
                          {p.occupation ? ` · ${p.occupation}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-danger-700">Tafsilot yuklanmadi</p>
            )}
          </SectionCard>
        </div>
      )}

      <AudienceSegmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        segment={editing ?? (detail.data && selectedId === detail.data.id ? detail.data : null)}
      />
      <PersonaFormDialog
        open={personaOpen}
        onClose={() => setPersonaOpen(false)}
        projectId={projectId}
        defaultSegmentId={selectedId}
      />
    </div>
  );
}
