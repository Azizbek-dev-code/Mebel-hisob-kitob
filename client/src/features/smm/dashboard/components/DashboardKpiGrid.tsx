import type { SmmDashboardKpis } from '@furniture-erp/shared';
import {
  AlertTriangle,
  Clapperboard,
  FolderKanban,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/Skeleton';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

export interface DashboardKpiGridProps {
  kpis?: SmmDashboardKpis;
  isClientView?: boolean;
  periodLabel?: string;
  isLoading: boolean;
}

export function DashboardKpiGrid({
  kpis,
  isClientView = false,
  periodLabel,
  isLoading,
}: DashboardKpiGridProps) {
  const { t } = useTranslation();
  const context = periodLabel ?? t('smm.dashPeriodSelected');

  if (isLoading && !kpis) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: isClientView ? 3 : 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link to={ROUTES.smmProjects} className="block transition-opacity hover:opacity-90">
        <KpiCard
          title={t('smm.kpiActiveProjects')}
          context={context}
          value={String(kpis.activeProjects)}
          icon={FolderKanban}
          tone="brand"
          isEmpty={kpis.activeProjects === 0}
          footnote={
            kpis.activeProjectsOpenedInPeriod > 0
              ? t('smm.kpiOpenedInPeriod', { count: kpis.activeProjectsOpenedInPeriod })
              : undefined
          }
        />
      </Link>

      <KpiCard
        title={t('smm.kpiTodayWork')}
        context={context}
        value={String(kpis.todayWorkCount)}
        icon={AlertTriangle}
        tone={kpis.todayOverdueCount > 0 ? 'danger' : 'warning'}
        isEmpty={kpis.todayWorkCount === 0}
        footnote={
          kpis.todayOverdueCount > 0
            ? t('smm.kpiOverdueFootnote', { count: kpis.todayOverdueCount })
            : t('smm.kpiNoOverdue')
        }
      />

      <KpiCard
        title={t('smm.kpiWeekContent')}
        context={context}
        value={String(kpis.weekContentPlanned)}
        icon={Clapperboard}
        tone="info"
        isEmpty={kpis.weekContentPlanned === 0}
        footnote={t('smm.kpiWeekReadyPct', { pct: kpis.weekContentReadyPct })}
      />

      {!isClientView ? (
        <>
          <KpiCard
            title={t('smm.kpiRevenue')}
            context={context}
            value={formatMoney(kpis.revenue)}
            icon={TrendingUp}
            tone="success"
            isEmpty={kpis.revenue === 0}
          />

          <Link to={ROUTES.smmExpenses} className="block transition-opacity hover:opacity-90">
            <KpiCard
              title={t('smm.kpiExpenses')}
              context={context}
              value={formatMoney(kpis.expenses)}
              icon={Wallet}
              tone="warning"
              isEmpty={kpis.expenses === 0}
            />
          </Link>

          <KpiCard
            title={t('smm.kpiProfit')}
            context={context}
            value={formatMoney(kpis.profit)}
            icon={TrendingDown}
            tone={kpis.profit >= 0 ? 'success' : 'danger'}
            isEmpty={kpis.profit === 0}
          />
        </>
      ) : null}
    </div>
  );
}
