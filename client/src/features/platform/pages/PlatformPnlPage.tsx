import { PlatformDatePreset, formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

import { PlatformBarChart } from '../components/PlatformBarChart';
import { PlatformDateFilter } from '../components/PlatformDateFilter';
import { usePlatformPnl } from '../hooks/use-platform-billing';

export function PlatformPnlPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<string>(PlatformDatePreset.THIS_MONTH);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = preset === PlatformDatePreset.CUSTOM ? custom : undefined;
  const pnl = usePlatformPnl(preset, true, range);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.hub.pnl')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.finance.pnlHint')}</p>
      </div>
      <PlatformDateFilter
        preset={preset}
        onPresetChange={setPreset}
        from={custom.from}
        to={custom.to}
        onCustomChange={setCustom}
      />

      {pnl.isPending && !pnl.data ? (
        <Skeleton className="h-32 w-full" />
      ) : pnl.isError ? (
        <ErrorState
          title={t('platformAdmin.finance.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void pnl.refetch()}
        />
      ) : pnl.data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi label={t('platformAdmin.finance.revenue')} value={formatMoney(pnl.data.revenue)} />
            <Kpi label={t('platformAdmin.finance.expenses')} value={formatMoney(pnl.data.expenses)} />
            <Kpi label={t('platformAdmin.finance.net')} value={formatMoney(pnl.data.netProfit)} />
          </div>
          <PlatformBarChart
            title={t('platformAdmin.finance.trendTitle')}
            emptyLabel={t('platformAdmin.finance.trendEmpty')}
            series={pnl.data.series}
            keys={[
              { key: 'revenue', label: t('platformAdmin.finance.revenue'), className: 'bg-success-500' },
              { key: 'expenses', label: t('platformAdmin.finance.expenses'), className: 'bg-danger-400' },
              { key: 'netProfit', label: t('platformAdmin.finance.net'), className: 'bg-brand-500' },
            ]}
          />
          <SectionCard title={t('platformAdmin.dates.period')}>
            <p className="text-sm text-ink-muted">{pnl.data.period.label}</p>
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
