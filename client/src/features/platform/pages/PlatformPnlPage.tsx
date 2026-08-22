import { formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

import { PlatformBarChart } from '../components/PlatformBarChart';
import { usePlatformPnl } from '../hooks/use-platform-billing';

const PRESETS = [
  { id: 'THIS_MONTH', label: 'Shu oy' },
  { id: 'LAST_MONTH', label: "O'tgan oy" },
  { id: 'THIS_YEAR', label: 'Shu yil' },
];

export function PlatformPnlPage() {
  const [preset, setPreset] = useState('THIS_MONTH');
  const pnl = usePlatformPnl(preset);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Daromad / P&amp;L</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Daromad = to&apos;langan obuna to&apos;lovlari. Sof foyda = daromad − platforma xarajatlari.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreset(item.id)}
            className={`rounded-input px-3 py-1.5 text-sm ${
              preset === item.id ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-hover'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {pnl.isPending && !pnl.data ? (
        <Skeleton className="h-32 w-full" />
      ) : pnl.isError ? (
        <ErrorState
          title="P&L yuklanmadi"
          message="Qayta urinib ko'ring."
          onRetry={() => void pnl.refetch()}
        />
      ) : pnl.data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi label="Daromad" value={formatMoney(pnl.data.revenue)} />
            <Kpi label="Xarajat" value={formatMoney(pnl.data.expenses)} />
            <Kpi label="Sof foyda" value={formatMoney(pnl.data.netProfit)} />
          </div>
          <PlatformBarChart
            title="Oylik P&L"
            emptyLabel="Bu davrda yozuv yo'q."
            series={pnl.data.series}
            keys={[
              { key: 'revenue', label: 'Daromad', className: 'bg-success-500' },
              { key: 'expenses', label: 'Xarajat', className: 'bg-danger-400' },
              { key: 'netProfit', label: 'Sof foyda', className: 'bg-brand-500' },
            ]}
          />
          <SectionCard title="Davr">
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
