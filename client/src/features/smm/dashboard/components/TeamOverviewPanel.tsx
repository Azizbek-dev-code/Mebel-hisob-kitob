import type { SmmDashboardTeam } from '@furniture-erp/shared';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';

export interface TeamOverviewPanelProps {
  team?: SmmDashboardTeam | null;
  isLoading: boolean;
  /** Hidden entirely for client members. */
  hidden?: boolean;
}

export function TeamOverviewPanel({
  team,
  isLoading,
  hidden = false,
}: TeamOverviewPanelProps) {
  const { t } = useTranslation();

  if (hidden) return null;

  return (
    <SectionCard
      title={t('smm.teamTitle')}
      description={t('smm.teamHint')}
      action={
        <Link
          to={ROUTES.smmAgency}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          {t('smm.teamAgencyLink')}
        </Link>
      }
      padded={false}
    >
      {isLoading && !team ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !team || team.employeeCount === 0 ? (
        <EmptyState
          icon={Users}
          title={t('smm.teamEmptyTitle')}
          description={t('smm.teamEmptyHint')}
          action={
            <Link
              to={ROUTES.smmAgency}
              className="inline-flex items-center rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {t('smm.agencyAddEmployee')}
            </Link>
          }
        />
      ) : (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={t('smm.teamEmployees')} value={team.employeeCount} />
            <Stat label={t('smm.teamWorking')} value={team.working} />
            <Stat label={t('smm.teamPending')} value={team.pending} />
            <Stat label={t('smm.teamCompleted')} value={team.completedRecently} />
          </div>

          {team.members.length > 0 ? (
            <ul className="mt-4 divide-y divide-line rounded-input border border-line">
              {team.members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{member.fullName}</p>
                    <p className="text-xs text-ink-muted">
                      {member.workloadPct === null
                        ? t('smm.teamActiveAssignments', {
                            count: member.activeAssignments,
                          })
                        : t('smm.teamWorkload', { pct: member.workloadPct })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-ink-subtle">
                    <p>
                      {member.inProgressCount} {t('smm.teamInProgress')}
                    </p>
                    <p>
                      {member.pendingCount} {t('smm.teamPendingShort')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-input border border-line bg-surface-muted px-2.5 py-2">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
