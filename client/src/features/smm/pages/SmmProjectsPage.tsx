import {
  FeatureKey,
  SMM_PROJECT_STATUS_LABELS,
  SmmProjectStatus,
  type SmmProjectListItem,
  type SmmProjectStatus as SmmProjectStatusType,
} from '@furniture-erp/shared';
import { Clapperboard, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

import { SmmProjectFormDialog } from '../components/SmmProjectFormDialog';
import { useArchiveSmmProject, useSmmProjectsList } from '../hooks/use-smm';
import { BTN_SECONDARY, FIELD_CLASS, projectStatusTone } from '../utils/ui';

const PAGE_SIZE = 20;

type StatusFilter = SmmProjectStatusType | 'ALL';

export function SmmProjectsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SmmProjectListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const archive = useArchiveSmmProject();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, status]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debounced || undefined,
      status,
    }),
    [page, debounced, status],
  );

  const list = useSmmProjectsList(query);
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  async function handleArchive(project: SmmProjectListItem) {
    if (!window.confirm(`“${project.name}” arxivlansinmi?`)) return;
    try {
      await archive.mutateAsync(project.id);
      setMessage('Loyiha arxivlandi');
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : 'Arxivlab bo‘lmadi');
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">SMM loyihalar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Mijoz loyihalari, kontent kalendari va jamoa ishi
          </p>
        </div>
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          Yangi loyiha
        </WriteGuard>
      </div>

      {message ? (
        <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
          {message}
        </p>
      ) : null}

      <SectionCard title="Filtr">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-soft" />
            <input
              className={`${FIELD_CLASS} pl-9`}
              placeholder="Qidirish…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={`${FIELD_CLASS} sm:w-48`}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="ALL">Barcha holatlar</option>
            {Object.values(SmmProjectStatus).map((s) => (
              <option key={s} value={s}>
                {SMM_PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {list.isError ? (
        <ErrorState
          title="Yuklab bo‘lmadi"
          message={
            list.error instanceof ApiClientError
              ? list.error.isForbidden
                ? 'Ruxsat yo‘q'
                : list.error.message
              : 'Qayta urinib ko‘ring'
          }
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Loyiha yo‘q"
          description="Birinchi SMM loyihangizni yarating"
          action={
            <WriteGuard
              feature={FeatureKey.SMM_PROJECTS}
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
            >
              <Plus className="size-4" />
              Yangi loyiha
            </WriteGuard>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((project) => (
            <li key={project.id}>
              <div className="rounded-panel border border-line bg-surface p-4 shadow-card hover:border-brand-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={ROUTES.smmProjectDetail(project.id)}
                        className="truncate text-base font-semibold text-brand-700 hover:underline"
                      >
                        {project.name}
                      </Link>
                      <Badge tone={projectStatusTone(project.status)}>
                        {SMM_PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {project.clientName || 'Mijoz ko‘rsatilmagan'}
                      {project.budgetPlanned != null
                        ? ` · Byudjet ${formatMoney(project.budgetPlanned)}`
                        : ''}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {project.memberCount} a’zo · {project.contentCount} kontent ·{' '}
                      {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={ROUTES.smmProjectDetail(project.id)} className={BTN_SECONDARY}>
                      Ochish
                    </Link>
                    <WriteGuard
                      feature={FeatureKey.SMM_PROJECTS}
                      className={BTN_SECONDARY}
                      onClick={() => {
                        setEditing(project);
                        setFormOpen(true);
                      }}
                    >
                      Tahrirlash
                    </WriteGuard>
                    {project.status !== SmmProjectStatus.ARCHIVED ? (
                      <WriteGuard
                        feature={FeatureKey.SMM_PROJECTS}
                        className={BTN_SECONDARY}
                        onClick={() => void handleArchive(project)}
                      >
                        Arxivlash
                      </WriteGuard>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={!meta.hasPreviousPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Oldingi
          </button>
          <span className="text-sm text-ink-muted">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={!meta.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </button>
        </div>
      ) : null}

      <SmmProjectFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={editing}
        onSaved={() => setMessage(editing ? 'Loyiha yangilandi' : 'Loyiha yaratildi')}
      />
    </PageContainer>
  );
}
