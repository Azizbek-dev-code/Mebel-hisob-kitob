import {
  type DebtListFilter,
  type DebtListItem,
} from '@furniture-erp/shared';
import { CircleDollarSign, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import { paymentStatusLabel, paymentStatusTone, paymentTypeLabel } from '@/utils/sales';

import { CollectDebtPaymentDialog } from '../components/CollectDebtPaymentDialog';
import { useDebtsList } from '../hooks/use-debts';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const FILTERS: Array<{ id: DebtListFilter; label: string }> = [
  { id: 'ALL', label: 'Hammasi' },
  { id: 'OVERDUE', label: 'Muddati o‘tgan' },
  { id: 'UNPAID', label: 'To‘lanmagan' },
  { id: 'PARTIALLY_PAID', label: 'Qisman' },
];

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Qarzlar sahifasini ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

export function DebtsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<DebtListFilter>('ALL');
  const [paying, setPaying] = useState<DebtListItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const list = useDebtsList({
    page: 1,
    pageSize: 50,
    search: debouncedSearch || undefined,
    filter,
  });

  const summary = list.data?.summary;
  const items = list.data?.items ?? [];

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Qarzlar</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Mijozlardan olinadigan qoldiq, muddati o‘tgan to‘lovlar va qabul.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-input border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami qarz"
          context="Hozir"
          value={formatMoney(summary?.totalOutstanding ?? 0)}
          icon={CircleDollarSign}
          tone="danger"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Qarzdor mijozlar"
          context="Faol"
          value={String(summary?.customersInDebt ?? 0)}
          icon={CircleDollarSign}
          tone="brand"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Ochiq sotuvlar"
          context="Qoldiq > 0"
          value={String(summary?.openSaleCount ?? 0)}
          icon={CircleDollarSign}
          tone="info"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Muddati o‘tgan"
          context={formatMoney(summary?.overdueAmount ?? 0)}
          value={String(summary?.overdueInstallmentCount ?? 0)}
          icon={CircleDollarSign}
          tone="warning"
          isLoading={list.isLoading}
        />
      </div>

      <SectionCard title="Qidiruv va filtr">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Mijoz, telefon yoki sotuv №"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-input px-3 py-2 text-xs font-medium',
                  filter === item.id
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'border border-line text-ink-muted hover:bg-surface-hover',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Qarzlar ro‘yxati">
        {list.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : list.isError ? (
          <ErrorState title="Qarzlar yuklanmadi" message={listErrorMessage(list.error)} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="Qarz yo‘q"
            description="Tanlangan filtr bo‘yicha ochiq qarz topilmadi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-2 py-2 font-medium">Sotuv</th>
                  <th className="px-2 py-2 font-medium">Mijoz</th>
                  <th className="px-2 py-2 font-medium">Turi</th>
                  <th className="px-2 py-2 font-medium">Holat</th>
                  <th className="px-2 py-2 font-medium">Qolgan</th>
                  <th className="px-2 py-2 font-medium">Muddat</th>
                  <th className="px-2 py-2 font-medium">Amal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.saleId} className="border-b border-line/70">
                    <td className="px-2 py-3">
                      <Link
                        to={ROUTES.saleDetail(item.saleId)}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        #{item.saleNumber}
                      </Link>
                      <div className="text-xs text-ink-muted">{formatDate(item.saleDate)}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium text-ink">{item.customerName}</div>
                      <div className="text-xs text-ink-muted">{item.customerPhone}</div>
                    </td>
                    <td className="px-2 py-3 text-ink-muted">{paymentTypeLabel(item.paymentType)}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={paymentStatusTone(item.paymentStatus)}>
                          {paymentStatusLabel(item.paymentStatus)}
                        </Badge>
                        {item.hasOverdueInstallment ? (
                          <Badge tone="warning">Muddati o‘tgan</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3 font-semibold text-danger-700 tabular-money">
                      {formatMoney(item.remainingAmount)}
                    </td>
                    <td className="px-2 py-3 text-xs text-ink-muted">
                      {item.nextDueDate ? formatDate(item.nextDueDate) : '—'}
                      {item.hasOverdueInstallment
                        ? ` · ${formatMoney(item.overdueAmount)}`
                        : ''}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => setPaying(item)}
                        className="rounded-input border border-line px-2 py-1 text-xs font-medium hover:bg-surface-hover"
                      >
                        To‘lov
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {paying ? (
        <CollectDebtPaymentDialog
          debt={paying}
          onClose={() => setPaying(null)}
          onSuccess={setSuccessMessage}
        />
      ) : null}
    </PageContainer>
  );
}
