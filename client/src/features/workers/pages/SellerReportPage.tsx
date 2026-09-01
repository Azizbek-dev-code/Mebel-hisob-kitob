import { DateRangePreset } from '@furniture-erp/shared';
import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector';
import {
  DEFAULT_PERIOD,
  isPeriodRequestable,
  type DashboardPeriod,
} from '@/features/dashboard/period';
import { SellerSalesTable } from '@/features/workers/components/SellerSalesTable';
import { useMySellerReport } from '@/features/workers/hooks/use-workers';
import { formatDate, formatMoney } from '@/utils/format';

function KpiMini({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={
          emphasize
            ? 'tabular-money mt-1 text-lg font-semibold text-brand-800'
            : 'tabular-money mt-1 text-lg font-semibold text-ink'
        }
      >
        {value}
      </p>
    </div>
  );
}

export function SellerReportPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const requestable = isPeriodRequestable(period);
  const query = useMemo(
    () =>
      requestable
        ? {
            preset: period.preset,
            from: period.preset === DateRangePreset.CUSTOM ? period.from : undefined,
            to: period.preset === DateRangePreset.CUSTOM ? period.to : undefined,
          }
        : { preset: DateRangePreset.THIS_MONTH },
    [period, requestable],
  );
  const reportQuery = useMySellerReport(query);
  const report = reportQuery.data;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Hisobot</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sotuvlar, sof foyda va commission — faqat o‘z savdolaringiz.
        </p>
      </div>

      <PeriodSelector period={period} onChange={setPeriod} />

      {reportQuery.isError && !report ? (
        <ErrorState
          title="Hisobot yuklanmadi"
          message={
            reportQuery.error instanceof Error ? reportQuery.error.message : 'Qayta urinib ko‘ring.'
          }
          retryLabel="Qayta urinish"
          onRetry={() => void reportQuery.refetch()}
        />
      ) : null}

      {reportQuery.isLoading && !report ? <Skeleton className="h-40 w-full" /> : null}

      {report ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <KpiMini label="Sotuvlar" value={`${report.summary.salesCount} ta`} />
            <KpiMini label="Sotuv summasi" value={formatMoney(report.summary.salesAmount)} />
            <KpiMini label="Yalpi foyda" value={formatMoney(report.summary.grossProfit ?? report.summary.netProfit)} />
            <KpiMini label="Commission" value={formatMoney(report.summary.earned)} emphasize />
            <KpiMini label="To‘langan" value={formatMoney(report.summary.paid)} />
            <KpiMini
              label="Qolgan"
              value={formatMoney(report.summary.outstanding)}
              emphasize
            />
          </div>

          {report.summary.bonus > 0 ? (
            <p className="text-sm text-ink-soft">
              Bonus (alohida): {formatMoney(report.summary.bonus)}
            </p>
          ) : null}

          <SectionCard
            title="Commission taqsimoti"
            description={`${report.period.from} — ${report.period.to}`}
          >
            {report.sales.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Bu davrda sotuv yo‘q"
                description="Boshqa sana oralig‘ini tanlang."
              />
            ) : (
              <>
                <SellerSalesTable items={report.sales} />
                <p className="mt-4 text-sm font-semibold text-ink">
                  Jami commission: {formatMoney(report.summary.earned)}
                </p>
              </>
            )}
          </SectionCard>

          <SectionCard title="To‘lovlar">
            {report.payments.length === 0 ? (
              <p className="text-sm text-ink-muted">Bu davrda to‘lov yo‘q.</p>
            ) : (
              <ul className="divide-y divide-line">
                {report.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {payment.type === 'PAYMENT' ? 'To‘lov' : 'Qaytarish'}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(payment.transactionDate)}
                        {payment.description ? ` · ${payment.description}` : ''}
                      </p>
                    </div>
                    <p className="tabular-money font-semibold">{formatMoney(payment.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
