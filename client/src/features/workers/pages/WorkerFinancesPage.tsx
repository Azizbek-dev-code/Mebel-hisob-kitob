import {
  signedWorkerTransactionAmount,
  WorkerFinancialTransactionType,
  WORKER_RESPONSIBILITY_LABELS,
  type WorkerFinancialTransaction,
  type WorkerFinancialTransactionType as WorkerFinancialType,
} from '@furniture-erp/shared';
import {
  Banknote,
  Gift,
  HandCoins,
  Percent,
  Plus,
  Scale,
  Search,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
import { AddWorkerFinancialTransactionDialog } from '@/features/workers/components/AddWorkerFinancialTransactionDialog';
import { ReverseWorkerFinancialTransactionDialog } from '@/features/workers/components/ReverseWorkerFinancialTransactionDialog';
import {
  useWorkerFinanceSummary,
  useWorkerFinanceTransactions,
} from '@/features/workers/hooks/use-worker-finances';
import { useWorker } from '@/features/workers/hooks/use-workers';
import {
  canReverseWorkerFinancialTransaction,
  collectReversedOriginalIds,
  workerFinanceTypeDisplayLabel,
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

function ReverseActionButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-input border border-line px-2 py-1 text-xs font-medium text-danger-700 hover:bg-danger-50"
    >
      Qaytarish
    </button>
  );
}

export function WorkerFinancesPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);

  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const [typeFilter, setTypeFilter] = useState<'' | WorkerFinancialType>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [reversingTransaction, setReversingTransaction] =
    useState<WorkerFinancialTransaction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const range = useMemo(
    () => (isPeriodRequestable(period) ? periodToInclusiveRange(period) : null),
    [period],
  );
  const periodLabel = periodContextLabel(period);
  const queriesEnabled = Boolean(id) && range !== null;

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

  const summary = useWorkerFinanceSummary(id, summaryParams, queriesEnabled);
  const transactions = useWorkerFinanceTransactions(id, listParams, queriesEnabled);

  const items = transactions.data?.items;
  const reversedOriginalIds = useMemo(
    () => collectReversedOriginalIds(items ?? []),
    [items],
  );
  const displayItems = items ?? [];

  function onPeriodChange(next: DashboardPeriod) {
    setPeriod(next);
    setPage(1);
  }

  function onTypeChange(value: string) {
    setTypeFilter(value as '' | WorkerFinancialType);
    setPage(1);
  }

  if (worker.isError) {
    const notFound =
      worker.error instanceof Error && /not found/i.test(worker.error.message);
    return (
      <PageContainer>
        <ErrorState
          title={notFound ? 'Ishchi topilmadi' : "Ishchini yuklab bo'lmadi"}
          message={
            notFound
              ? "Bu ishchi mavjud emas yoki boshqa do'konga tegishli."
              : "Moliyaviy ma'lumotlarni yuklab bo'lmadi."
          }
          retryLabel="Qayta urinish"
          onRetry={() => void worker.refetch()}
        />
      </PageContainer>
    );
  }

  if (worker.isLoading || !worker.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  const detail = worker.data;
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
          to={ROUTES.workers}
          className="inline-flex text-sm font-medium text-ink-soft hover:text-ink"
        >
          ← Ishchilar
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {detail.fullName} — Moliyaviy hisob
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span>@{detail.username ?? detail.email}</span>
              <Badge tone={detail.isActive ? 'success' : 'neutral'}>
                {detail.isActive ? 'Faol' : 'Nofaol'}
              </Badge>
              <span className="text-ink-subtle">
                {detail.responsibilities
                  .map((item) => WORKER_RESPONSIBILITY_LABELS[item])
                  .join(' · ') || '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Moliyaviy operatsiya
          </button>
        </div>
      </div>

      {successMessage ? (
        <p
          role="status"
          className="rounded-input border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700"
        >
          {successMessage}
        </p>
      ) : null}

      <SectionCard title="Davr" description="Moliyaviy yig'indilar tanlangan davr bo'yicha.">
        <PeriodSelector period={period} onChange={onPeriodChange} />
      </SectionCard>

      {showSummaryError ? (
        <ErrorState
          title="Yig'indi yuklanmadi"
          message="Moliyaviy ma'lumotlarni yuklab bo'lmadi."
          retryLabel="Qayta urinish"
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title="Bonus"
            context={periodLabel}
            value={formatMoney(summary.data?.totalBonuses ?? 0)}
            icon={Gift}
            tone="success"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={(summary.data?.totalBonuses ?? 0) === 0}
          />
          <KpiCard
            title="Komissiya"
            context={periodLabel}
            value={formatMoney(summary.data?.totalCommissions ?? 0)}
            icon={Percent}
            tone="info"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={(summary.data?.totalCommissions ?? 0) === 0}
          />
          <KpiCard
            title="Avans"
            context={periodLabel}
            value={formatMoney(summary.data?.totalAdvances ?? 0)}
            icon={HandCoins}
            tone="warning"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={(summary.data?.totalAdvances ?? 0) === 0}
          />
          <KpiCard
            title="Qarz"
            context={periodLabel}
            value={formatMoney(summary.data?.totalDebt ?? 0)}
            icon={Scale}
            tone="danger"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={(summary.data?.totalDebt ?? 0) === 0}
          />
          <KpiCard
            title="To'lov"
            context={periodLabel}
            value={formatMoney(summary.data?.totalPayments ?? 0)}
            icon={Banknote}
            tone="brand"
            isLoading={summary.isLoading && !summary.data}
            isEmpty={(summary.data?.totalPayments ?? 0) === 0}
          />
          <KpiCard
            title="Sof hisob"
            context={periodLabel}
            value={formatSignedMoney(summary.data?.netFinancialPosition ?? 0)}
            icon={Wallet}
            tone={(summary.data?.netFinancialPosition ?? 0) < 0 ? 'danger' : 'success'}
            isLoading={summary.isLoading && !summary.data}
            footnote="Bu ish haqi emas — faqat daftar yig'indisi."
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
                placeholder="Tavsif bo'yicha qidirish"
                className={cn(fieldClass, 'pl-9')}
                aria-label="Tavsif bo'yicha qidirish"
              />
            </span>
          </label>
        </div>

        {showListError ? (
          <ErrorState
            title="Ro'yxat yuklanmadi"
            message="Moliyaviy ma'lumotlarni yuklab bo'lmadi."
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
            title="Hozircha moliyaviy operatsiyalar yo'q"
            description="Bu ishchi uchun hali bonus, qarz, avans yoki boshqa moliyaviy operatsiya kiritilmagan."
          />
        ) : null}

        {!showListError && displayItems.length > 0 ? (
          <>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {displayItems.map((tx) => {
                const signed = transactionSignedAmount(tx);
                const isReversedOriginal = reversedOriginalIds.has(tx.id);
                const canReverse = canReverseWorkerFinancialTransaction(
                  tx,
                  reversedOriginalIds,
                );
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
                    <p className="mt-2 text-sm text-ink-soft">
                      {tx.description?.trim() || '—'}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <TransactionStatus
                        type={tx.type}
                        isReversedOriginal={isReversedOriginal}
                      />
                      {canReverse ? (
                        <ReverseActionButton onClick={() => setReversingTransaction(tx)} />
                      ) : isReversedOriginal ? (
                        <span className="text-xs text-ink-subtle">Qaytarilgan</span>
                      ) : (
                        <span className="text-xs text-ink-subtle">—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sana</th>
                    <th className="px-3 py-2 font-medium">Turi</th>
                    <th className="px-3 py-2 font-medium">Summa</th>
                    <th className="px-3 py-2 font-medium">Tavsif</th>
                    <th className="px-3 py-2 font-medium">Holati</th>
                    <th className="px-3 py-2 font-medium">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((tx) => {
                    const signed = transactionSignedAmount(tx);
                    const isReversedOriginal = reversedOriginalIds.has(tx.id);
                    const canReverse = canReverseWorkerFinancialTransaction(
                      tx,
                      reversedOriginalIds,
                    );
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
                        <td className="px-3 py-2.5">
                          {canReverse ? (
                            <ReverseActionButton onClick={() => setReversingTransaction(tx)} />
                          ) : isReversedOriginal ? (
                            <span className="text-xs text-ink-subtle">Qaytarilgan</span>
                          ) : (
                            <span className="text-xs text-ink-subtle">—</span>
                          )}
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

      <AddWorkerFinancialTransactionDialog
        open={createOpen}
        workerId={id}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setSuccessMessage("Moliyaviy operatsiya qo'shildi.")}
      />

      <ReverseWorkerFinancialTransactionDialog
        open={Boolean(reversingTransaction)}
        transaction={reversingTransaction}
        onClose={() => setReversingTransaction(null)}
        onReversed={() => setSuccessMessage('Operatsiya qaytarildi.')}
      />
    </PageContainer>
  );
}
