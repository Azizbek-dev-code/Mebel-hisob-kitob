import {
  SmmProjectHealth,
  type SmmDashboardProjectCard,
} from '@furniture-erp/shared';
import { FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

export interface ProjectOverviewPanelProps {
  projects?: SmmDashboardProjectCard[];
  isLoading: boolean;
  onCreateProject?: () => void;
}

export function ProjectOverviewPanel({
  projects,
  isLoading,
  onCreateProject,
}: ProjectOverviewPanelProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('smm.projectsOverviewTitle')}
      description={t('smm.projectsOverviewHint')}
      action={
        <Link
          to={ROUTES.smmProjects}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          {t('smm.allProjectsLink')}
        </Link>
      }
      padded={false}
    >
      {isLoading && !projects ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t('smm.dashboardEmptyTitle')}
          description={t('smm.dashboardEmptyHint')}
          action={
            onCreateProject ? (
              <button
                type="button"
                onClick={onCreateProject}
                className="inline-flex items-center rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {t('smm.newProject')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={ROUTES.smmProjectDetail(project.id)}
                className="block px-4 py-3.5 transition-colors hover:bg-surface-hover/60 sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                    {project.clientName ? (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{project.clientName}</p>
                    ) : null}
                  </div>
                  <Badge tone={healthTone(project.health)}>
                    {t(`smm.health.${project.health}`)}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  <ProgressRow
                    label={t('smm.contentProgress')}
                    value={project.contentProgressPct}
                  />
                  <ProgressRow label={t('smm.taskProgress')} value={project.taskProgressPct} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-subtle">
                  {project.deadline ? (
                    <span>
                      {t('smm.deadline')}: {formatDate(project.deadline)}
                    </span>
                  ) : null}
                  <span>
                    {t('smm.teamCount', { count: project.teamCount })}
                  </span>
                  {project.overdueTasks > 0 ? (
                    <span className="text-danger-600">
                      {t('smm.overdueTasksCount', { count: project.overdueTasks })}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-ink-muted">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            pct >= 70 ? 'bg-success-500' : pct >= 40 ? 'bg-brand-500' : 'bg-warning-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function healthTone(health: SmmDashboardProjectCard['health']) {
  if (health === SmmProjectHealth.ON_TRACK) return 'success' as const;
  if (health === SmmProjectHealth.NEEDS_ATTENTION) return 'warning' as const;
  return 'danger' as const;
}
