import {
  FeatureKey,
  SMM_CONTENT_STATUS_LABELS,
  SMM_CONTENT_STATUSES,
  SMM_CONTENT_TYPE_LABELS,
  SMM_CONTENT_TYPES,
  SMM_PLATFORM_LABELS,
  SMM_PLATFORMS,
  type SmmContentItemSort,
  type SmmContentStatus,
  type SmmContentType,
  type SmmPlatform,
} from '@furniture-erp/shared';
import { Clapperboard, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

import { ContentFormDialog } from '../../components/ContentFormDialog';
import { ContentStatusBadge } from '../../components/ContentStatusBadge';
import { useSmmContentList } from '../../hooks/use-smm';
import { BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

const SORT_OPTIONS: { value: SmmContentItemSort; label: string }[] = [
  { value: 'updatedAt_desc', label: 'Yangilangan (yangi)' },
  { value: 'publishAt_asc', label: 'Nashr sanasi' },
  { value: 'title_asc', label: 'Sarlavha' },
  { value: 'status_asc', label: 'Holat' },
];

export function ContentTab() {
  const projectId = useSmmProjectId();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SmmContentStatus | 'ALL'>('ALL');
  const [platform, setPlatform] = useState<SmmPlatform | 'ALL'>('ALL');
  const [contentType, setContentType] = useState<SmmContentType | 'ALL'>('ALL');
  const [sort, setSort] = useState<SmmContentItemSort>('updatedAt_desc');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      status,
      platform,
      contentType,
      sort,
    }),
    [page, search, status, platform, contentType, sort],
  );

  const list = useSmmContentList(projectId, query);
  const meta = list.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className={FIELD_CLASS}
            placeholder="Qidirish…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select className={FIELD_CLASS} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
            <option value="ALL">Barcha holatlar</option>
            {SMM_CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>{SMM_CONTENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select className={FIELD_CLASS} value={platform} onChange={(e) => { setPlatform(e.target.value as typeof platform); setPage(1); }}>
            <option value="ALL">Platforma</option>
            {SMM_PLATFORMS.map((p) => (
              <option key={p} value={p}>{SMM_PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <select className={FIELD_CLASS} value={contentType} onChange={(e) => { setContentType(e.target.value as typeof contentType); setPage(1); }}>
            <option value="ALL">Tur</option>
            {SMM_CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{SMM_CONTENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select className={FIELD_CLASS} value={sort} onChange={(e) => { setSort(e.target.value as SmmContentItemSort); setPage(1); }}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Kontent
        </WriteGuard>
      </div>

      {list.isError ? (
        <ErrorState
          title="Kontent yuklanmadi"
          message={list.error instanceof ApiClientError ? list.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Clapperboard} title="Kontent yo‘q" description="Birinchi Reels, Story yoki Postni yarating" />
      ) : (
        <SectionCard title="Kontent ro‘yxati">
          <ul className="divide-y divide-line">
            {(list.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    to={ROUTES.smmContentDetail(projectId, item.id)}
                    className="truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {SMM_CONTENT_TYPE_LABELS[item.contentType]} · {SMM_PLATFORM_LABELS[item.platform]}
                    {item.publishAt ? ` · ${item.publishAt.slice(0, 10)}` : ''}
                  </p>
                </div>
                <ContentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button type="button" className={BTN_SECONDARY} disabled={!meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
            Oldingi
          </button>
          <span className="text-sm text-ink-muted">{meta.page} / {meta.totalPages}</span>
          <button type="button" className={BTN_SECONDARY} disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            Keyingi
          </button>
        </div>
      ) : null}

      <ContentFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        onCreated={(item) => navigate(ROUTES.smmContentDetail(projectId, item.id))}
      />
    </div>
  );
}
