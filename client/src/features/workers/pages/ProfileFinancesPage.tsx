import {
  computeWorkerEarnedTotal,
  computeWorkerPaidTotal,
  signedWorkerTransactionAmount,
  WorkerFinancialTransactionType,
  type WorkerFinancialTransaction,
  type WorkerFinancialTransactionType as WorkerFinancialType,
} from '@furniture-erp/shared';
import { Banknote, Search, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector';
import {
  DEFAULT_PERIOD,
  isPeriodRequestable,
  type DashboardPeriod,
} from '@/features/dashboard/period';
import {
  useMyFinanceSummary,
  useMyFinanceTransactions,
} from '@/features/workers/hooks/use-worker-finances';
import {
  collectReversedOriginalIds,
  workerFinanceTypeDisplayLabel,
  WORKER_FINANCE_SOURCE_FILTER_OPTIONS,
  WORKER_FINANCE_TYPE_FILTER_OPTIONS,
} from '@/features/workers/utils/finance-labels';
import {
  periodContextLabel,
  periodToInclusiveRange,
} from '@/features/workers/utils/period-range';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function formatSignedMoney(amount: number): string {
  const abs = formatMoney(Math.abs(amount));
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `−${abs}`;
  return abs;
}

function transactionSignedAmount(tx: WorkerFinancialTransaction): number {
  return signedWorkerTransactionAmount(
    tx.type,
    tx.amount,
    tx.reversesType ?? undefined,
  );
}

function TransactionStatus({
  type,
  isReversedOriginal,
}: {
  type: WorkerFinancialType;
  isReversedOriginal?: boolean;
}) {
  if (type === WorkerFinancialTransactionType.REVERSAL || isReversedOriginal) {
    return <Badge tone="warning">Qaytarilgan</Badge>;
  }
  return <Badge tone="success">Faol</Badge>;
}

/**
 * Read-only self ledger for the signed-in worker.
 * Uses /me/finances/* only — no create/reverse/edit.
 */
export function ProfileFinancesPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const [typeFilter, setTypeFilter] = useState<'' | WorkerFinancialType>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const range = useMemo(
    () => (isPeriodRequestable(period) ? periodToInclusiveRange(period) : null),
    [period],
  );
  const periodLabel = periodContextLabel(period);
  const queriesEnabled = range !== null;

  const summaryParams = useMemo(
    () => ({
      from: range?.from,
      to: range?.to,
    }),
    [range],
  );

  const listParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      from: range?.from,
      to: range?.to,
      type: typeFilter || undefined,
      search: debouncedSearch || undefined,
    }),
    [page, range, typeFilter, debouncedSearch],
  );

  const summary = useMyFinanceSummary(summaryParams, queriesEnabled);
  const transactions = useMyFinanceTransactions(listParams, queriesEnabled);

  const items = transactions.data?.items;
  const reversedOriginalIds = useMemo(
    () => collectReversedOriginalIds(items ?? []),
    [items],
  );
  const displayItems = items ?? [];

  const earned = summary.data
    ? computeWorkerEarnedTotal({
        totalBonuses: summary.data.totalBonuses,
        totalCommissions: summary.data.totalCommissions,
        totalAdvances: summary.data.totalAdvances,
        totalDebt: summary.data.totalDebt,
        totalPayments: summary.data.totalPayments,
        totalAdjustments: summary.data.totalAdjustments,
        reversalsByOriginalType: summary.data.reversalsByOriginalType,
      })
    : 0;
  const paid = summary.data ? computeWorkerPaidTotal(summary.data) : 0;
  const outstanding = earned - paid;

  function onPeriodChange(next: DashboardPeriod) {
    setPeriod(next);
    setPage(1);
  }

  function onTypeChange(value: string) {
    setTypeFilter(value as '' | WorkerFinancialType);
    setPage(1);
  }

  const meta = transactions.data?.meta;
  const totalPages = Math.max(meta?.totalPages ?? 0, 1);
  const showListError = transactions.isError && !transactions.data;
  const showSummaryError = summary.isError && !summary.data;
  const isEmpty =
    !transactions.isLoading && !transactions.isError && displayItems.length === 0;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="space-y-3">
        <Link
          to={ROUTES.profile}
          className="inline-flex text-sm font-medium text-ink-soft hover:text-ink"
        >
          ← Profil
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Mening moliyaviy hisobim</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Faqat o‘qish uchun — o‘z daftaringizdagi yozuvlar.
          </p>
        </div>
      </div>

      <SectionCard title="Davr" description="Yig‘indilar tanlangan davr bo‘yicha.">
        <PeriodSelector period={period} onChange={onPeriodChange} />
      </SectionCard>

      {showSummaryError ? (
        <ErrorState
          title="Yig‘indi yuklanmadi"
          message="Moliyaviy ma’lumotlarni yuklab bo‘lmadi."
          retryLabel="Qayta urinish"
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            title="Hisoblangan"
            context={periodLabel}
            value={formatMoney(earned)}
            icon={Wallet}
            tone="success"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={earned === 0}
          />
          <KpiCard
            title="To‘langan"
            context={periodLabel}
            value={formatMoney(paid)}
            icon={Banknote}
            tone="brand"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={paid === 0}
          />
          <KpiCard
            title="Qolgan"
            context={periodLabel}
            value={formatMoney(outstanding)}
            icon={Wallet}
            tone={outstanding < 0 ? 'danger' : 'info'}
            isLoading={summary.isLoading && !summary.data}
            footnote="Bu ish haqi emas — faqat daftar yig‘indisi."
          />
        </div>
      )}

      <SectionCard title="Operatsiyalar">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Turi</span>
            <select
              className={fieldClass}
              value={typeFilter}
              onChange={(event) => onTypeChange(event.target.value)}
              aria-label="Turi"
            >
              {WORKER_FINANCE_TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Qidiruv</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tavsif bo‘yicha qidirish"
                className={cn(fieldClass, 'pl-9')}
                aria-label="Tavsif bo‘yicha qidirish"
              />
            </span>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Manba filtri">
          {WORKER_FINANCE_SOURCE_FILTER_OPTIONS.map((option) => {
            const active =
              option.value === ''
                ? searchInput.trim() === ''
                : searchInput.trim() === option.value;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setSearchInput(option.value);
                  setPage(1);
                }}
                className={cn(
                  'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-soft hover:bg-surface-hover',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {showListError ? (
          <ErrorState
            title="Ro‘yxat yuklanmadi"
            message="Moliyaviy ma’lumotlarni yuklab bo‘lmadi."
            retryLabel="Qayta urinish"
            onRetry={() => void transactions.refetch()}
          />
        ) : null}

        {transactions.isLoading && !transactions.data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon={Wallet}
            title="Hozircha moliyaviy operatsiyalar yo‘q"
            description="Bonus, komissiya, avans yoki to‘lovlar shu yerda ko‘rinadi."
          />
        ) : null}

        {!showListError && displayItems.length > 0 ? (
          <>
            <ul className="space-y-3 md:hidden">
              {displayItems.map((tx) => {
                const signed = transactionSignedAmount(tx);
                const isReversedOriginal = reversedOriginalIds.has(tx.id);
                return (
                  <li
                    key={tx.id}
                    className="rounded-panel border border-line bg-surface p-3 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {workerFinanceTypeDisplayLabel(tx.type, tx.reversesType)}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {formatDate(tx.transactionDate)}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'tabular-money shrink-0 text-sm font-semibold',
                          signed < 0 ? 'text-danger-600' : 'text-success-700',
                        )}
                      >
                        {formatSignedMoney(signed)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">{tx.description?.trim() || '—'}</p>
                    <div className="mt-2">
                      <TransactionStatus
                        type={tx.type}
                        isReversedOriginal={isReversedOriginal}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sana</th>
                    <th className="px-3 py-2 font-medium">Turi</th>
                    <th className="px-3 py-2 font-medium">Summa</th>
                    <th className="px-3 py-2 font-medium">Tavsif</th>
                    <th className="px-3 py-2 font-medium">Holati</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((tx) => {
                    const signed = transactionSignedAmount(tx);
                    const isReversedOriginal = reversedOriginalIds.has(tx.id);
                    return (
                      <tr key={tx.id} className="border-b border-line/70 last:border-0">
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="px-3 py-2.5 text-ink">
                          {workerFinanceTypeDisplayLabel(tx.type, tx.reversesType)}
                        </td>
                        <td
                          className={cn(
                            'tabular-money whitespace-nowrap px-3 py-2.5 font-medium',
                            signed < 0 ? 'text-danger-600' : 'text-success-700',
                          )}
                        >
                          {formatSignedMoney(signed)}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2.5 text-ink-soft">
                          {tx.description?.trim() || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <TransactionStatus
                            type={tx.type}
                            isReversedOriginal={isReversedOriginal}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!meta.hasPreviousPage || transactions.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Oldingi
                </button>
                <p className="text-sm text-ink-muted">
                  Sahifa {meta.page} / {totalPages}
                </p>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!meta.hasNextPage || transactions.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Keyingi
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
