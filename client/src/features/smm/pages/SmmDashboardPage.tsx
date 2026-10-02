import {
  FeatureKey,
  SmmFinanceChartPreset,
  type SmmFinanceChartPreset as SmmFinanceChartPresetType,
} from '@furniture-erp/shared';
import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { TrialBanner } from '@/features/subscription/TrialBanner';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';

import { SmmProjectFormDialog } from '../components/SmmProjectFormDialog';
import { AgencyFinanceChart } from '../dashboard/components/AgencyFinanceChart';
import { AttentionPanel } from '../dashboard/components/AttentionPanel';
import { ClientApprovalsPanel } from '../dashboard/components/ClientApprovalsPanel';
import { ContentPipelinePanel } from '../dashboard/components/ContentPipelinePanel';
import { DashboardKpiGrid } from '../dashboard/components/DashboardKpiGrid';
import { ProjectOverviewPanel } from '../dashboard/components/ProjectOverviewPanel';
import { QuickActionsBar } from '../dashboard/components/QuickActionsBar';
import { RecentActivityPanel } from '../dashboard/components/RecentActivityPanel';
import { TeamOverviewPanel } from '../dashboard/components/TeamOverviewPanel';
import { TodayWorkPanel } from '../dashboard/components/TodayWorkPanel';
import { WeeklyContentPanel } from '../dashboard/components/WeeklyContentPanel';
import { DEFAULT_SMM_PERIOD, type SmmDashPeriod } from '../dashboard/period';
import { SmmPeriodSelector } from '../dashboard/SmmPeriodSelector';
import { useSmmAgencyDashboard } from '../dashboard/use-smm-dashboard';

export function SmmDashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState<SmmDashPeriod>(DEFAULT_SMM_PERIOD);
  const [financePreset, setFinancePreset] = useState<SmmFinanceChartPresetType>(
    SmmFinanceChartPreset.LAST_30_DAYS,
  );

  const {
    data: dashboard,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useSmmAgencyDashboard(period, financePreset);

  const isLoading = isPending && !dashboard;
  const isClientView = dashboard?.isClientView ?? false;
  const hasNoProjects =
    !isLoading && !isError && Boolean(dashboard) && dashboard!.projects.length === 0;

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {t('smm.dashboardTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {user?.storeName
              ? t('smm.dashboardSubtitleNamed', { name: user.storeName })
              : t('smm.dashboardSubtitle')}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <SmmPeriodSelector
            period={period}
            onChange={setPeriod}
            disabled={isPending && !dashboard}
          />
          <WriteGuard
            feature={FeatureKey.SMM_PROJECTS}
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" />
            {t('smm.newProject')}
          </WriteGuard>
        </div>
      </div>

      <TrialBanner />

      {isError && !dashboard ? (
        <ErrorState
          title={t('smm.dashboardLoadFailed')}
          message={
            error instanceof ApiClientError ? error.message : t('common.retry')
          }
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <QuickActionsBar onNewProject={() => setFormOpen(true)} />

          <DashboardKpiGrid
            kpis={dashboard?.kpis}
            isClientView={isClientView}
            periodLabel={dashboard?.period.label}
            isLoading={isLoading}
          />

          {hasNoProjects ? (
            <EmptyState
              icon={FolderKanban}
              title={t('smm.dashboardEmptyTitle')}
              description={t('smm.dashboardEmptyHint')}
              action={
                <WriteGuard
                  feature={FeatureKey.SMM_PROJECTS}
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Plus className="size-4" />
                  {t('smm.newProject')}
                </WriteGuard>
              }
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <TodayWorkPanel items={dashboard?.todayWork} isLoading={isLoading} />
            <AttentionPanel items={dashboard?.attention} isLoading={isLoading} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {!hasNoProjects ? (
              <ProjectOverviewPanel
                projects={dashboard?.projects}
                isLoading={isLoading}
                onCreateProject={() => setFormOpen(true)}
              />
            ) : null}
            <AgencyFinanceChart
              finance={dashboard?.finance}
              financePreset={financePreset}
              onFinancePresetChange={setFinancePreset}
              isLoading={isLoading}
              hidden={isClientView}
              className={hasNoProjects ? 'lg:col-span-2' : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TeamOverviewPanel
              team={dashboard?.team}
              isLoading={isLoading}
              hidden={isClientView}
            />
            <ContentPipelinePanel
              buckets={dashboard?.contentPipeline}
              isLoading={isLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyContentPanel days={dashboard?.weeklyContent} isLoading={isLoading} />
            <ClientApprovalsPanel
              items={dashboard?.clientApprovals}
              isLoading={isLoading}
            />
          </div>

          <RecentActivityPanel
            items={dashboard?.recentActivity}
            isLoading={isLoading}
          />
        </>
      )}

      <SmmProjectFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={null}
      />
    </PageContainer>
  );
}
