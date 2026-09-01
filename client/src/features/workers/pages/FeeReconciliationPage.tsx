import { Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFeeReconciliation } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

/**
 * Admin read-only P&L vs worker ledger fee reconciliation.
 */
export function FeeReconciliationPage() {
  const query = useFeeReconciliation();

  if (query.isError && !query.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Solishtirish yuklanmadi"
          message={
            query.error instanceof Error
              ? query.error.message
              : "Haqlar solishtirishini yuklab bo'lmadi."
          }
          retryLabel="Qayta urinish"
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  const reconciliation = query.data;
  const rows = reconciliation.rows;

  return (
    <PageContainer className="space-y-6">
      <div className="space-y-3">
        <Link
          to={ROUTES.workers}
          className="inline-flex text-sm font-medium text-ink-soft hover:text-ink"
        >
          ← Ishchilar
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Haqlar solishtirishi
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              P&amp;L xarajatlari va ishchi daftaridagi ochiq komissiyalar (faqat o‘qish).
            </p>
          </div>
          {reconciliation.hasDifferences ? (
            <Badge tone="danger">Farqlar bor</Badge>
          ) : (
            <Badge tone="success">Mos keladi</Badge>
          )}
        </div>
      </div>

      {reconciliation.hasDifferences ? (
        <p
          role="alert"
          className="rounded-input border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-800"
        >
          Ba’zi qatorlarda P&amp;L va ledger farqi 0 emas. Farqlarni tekshiring.
        </p>
      ) : null}

      <SectionCard title="Solishtirish qatorlari">
        {rows.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Solishtirish ma’lumoti yo‘q"
            description="Hali solishtirish uchun haq yozuvlari topilmadi."
          />
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {rows.map((row) => {
                const diff = row.difference;
                const mismatched = diff !== 0;
                return (
                  <li
                    key={row.kind}
                    className="rounded-panel border border-line bg-surface p-3 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink">{row.label}</p>
                      {mismatched ? (
                        <Badge tone="danger">Farq</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-ink-muted">P&amp;L</dt>
                        <dd className="tabular-money font-medium">{formatMoney(row.pnlTotal)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-muted">Ledger</dt>
                        <dd className="tabular-money font-medium">
                          {formatMoney(row.ledgerTotal)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-ink-muted">Farq</dt>
                        <dd
                          className={`tabular-money font-semibold ${
                            mismatched ? 'text-danger-700' : 'text-success-700'
                          }`}
                        >
                          {formatMoney(diff)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Turi</th>
                    <th className="px-3 py-2 font-medium">P&amp;L</th>
                    <th className="px-3 py-2 font-medium">Ledger</th>
                    <th className="px-3 py-2 font-medium">Farq</th>
                    <th className="px-3 py-2 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const diff = row.difference;
                    const mismatched = diff !== 0;
                    return (
                      <tr key={row.kind} className="border-b border-line/70 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-ink">{row.label}</td>
                        <td className="tabular-money px-3 py-2.5">
                          {formatMoney(row.pnlTotal)}
                        </td>
                        <td className="tabular-money px-3 py-2.5">
                          {formatMoney(row.ledgerTotal)}
                        </td>
                        <td
                          className={`tabular-money px-3 py-2.5 font-medium ${
                            mismatched ? 'text-danger-700' : 'text-success-700'
                          }`}
                        >
                          {formatMoney(diff)}
                        </td>
                        <td className="px-3 py-2.5">
                          {mismatched ? (
                            <Badge tone="danger">Farq ≠ 0</Badge>
                          ) : (
                            <Badge tone="success">Mos</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </PageContainer>
  );
}
