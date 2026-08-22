import {
  DateRangePreset,
  WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
  WorkerCompensationPreviewEventKind,
  type WorkerCompensationPreviewBreakdownItem,
} from '@furniture-erp/shared';
import { Calculator, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useSettleWorkerCompensation,
  useWorkerCompensationPreview,
} from '@/features/workers/hooks/use-worker-compensation';
import { useWorker } from '@/features/workers/hooks/use-workers';
import {
  COMPENSATION_TYPE_LABELS,
  formatCompensationRuleValue,
} from '@/features/workers/utils/compensation-labels';
import { periodToInclusiveRange } from '@/features/workers/utils/period-range';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const EVENT_LABELS: Record<string, string> = {
  [WorkerCompensationPreviewEventKind.SALE]: 'Sotuv',
  [WorkerCompensationPreviewEventKind.ASSEMBLY]: 'Terlash',
  [WorkerCompensationPreviewEventKind.DELIVERY]: 'Yetkazib berish',
  [WorkerCompensationPreviewEventKind.INSTALLATION]: "O'rnatish",
};

function defaultMonthRange(): { from: string; to: string } {
  return (
    periodToInclusiveRange({ preset: DateRangePreset.THIS_MONTH }) ?? {
      from: '2026-08-01',
      to: '2026-08-31',
    }
  );
}

function formatRuleRate(item: WorkerCompensationPreviewBreakdownItem): string {
  return formatCompensationRuleValue({ type: item.ruleType, value: item.ruleValue });
}

function settleErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Faqat administrator hisoblab yozishi mumkin.';
    if (error.isUnauthorized) return 'Please sign in again.';
    if (error.status === 0) return error.message;
    return error.message || "Hisobni yozib bo'lmadi.";
  }
  return "Hisobni yozib bo'lmadi.";
}

/**
 * Compensation preview + optional settle into COMMISSION ledger rows.
 * Preview itself remains non-mutating until the admin confirms settle.
 */
export function WorkerCompensationPreviewPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);
  const initial = useMemo(() => defaultMonthRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const preview = useWorkerCompensationPreview(id, applied, Boolean(id));
  const settle = useSettleWorkerCompensation(id);

  const rangeValid = Boolean(from && to && from <= to);
  const canSettle =
    Boolean(preview.data) &&
    (preview.data?.summary.totalCompensation ?? 0) > 0 &&
    !preview.isFetching;

  if (worker.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Ishchi topilmadi"
          message={worker.error instanceof Error ? worker.error.message : "Ishchini yuklab bo'lmadi."}
          onRetry={() => void worker.refetch()}
        />
      </PageContainer>
    );
  }

  if (worker.isLoading || !worker.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }

  const detail = worker.data;
  const data = preview.data;

  async function handleSettle() {
    if (!canSettle || settle.isPending) return;
    try {
      const result = await settle.mutateAsync({ from: applied.from, to: applied.to });
      setConfirmOpen(false);
      setSuccessMessage(
        result.createdCount > 0
          ? `${result.createdCount} ta komissiya yozildi` +
              (result.skippedAlreadySettled
                ? ` (${result.skippedAlreadySettled} ta oldin yozilgan).`
                : '.')
          : result.skippedAlreadySettled > 0
            ? 'Barcha qatorlar allaqachon yozilgan.'
            : 'Yoziladigan summa yo‘q.',
      );
    } catch {
      // Error shown via settle.error
    }
  }

  return (
    <PageContainer className="space-y-6" data-testid="compensation-preview-page">
      <div>
        <Link
          to={ROUTES.workerCompensation(detail.id)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Hisoblash qoidalari
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Hisob-kitob ko&apos;rinishi
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{detail.fullName}</p>
      </div>

      <p
        role="note"
        className="rounded-input border border-warning-500/30 bg-warning-50 px-3 py-2 text-sm text-ink"
        data-testid="compensation-preview-disclaimer"
      >
        {WORKER_COMPENSATION_PREVIEW_DISCLAIMER}
      </p>

      {successMessage ? (
        <p
          role="status"
          className="rounded-input border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700"
        >
          {successMessage}{' '}
          <Link to={ROUTES.workerFinances(detail.id)} className="font-medium underline">
            Moliyaga o&apos;tish
          </Link>
        </p>
      ) : null}

      <SectionCard title="Filtrlar" description="Davrni tanlang — avval ko‘rinish, keyin yozish.">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (!rangeValid) return;
            setApplied({ from, to });
            setSuccessMessage(null);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Boshlanish</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
              data-testid="compensation-preview-from"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Tugash</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
              data-testid="compensation-preview-to"
            />
          </label>
          <button
            type="submit"
            disabled={!rangeValid || preview.isFetching}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            data-testid="compensation-preview-apply"
          >
            Ko&apos;rsatish
          </button>
        </form>
        {!rangeValid ? (
          <p className="mt-2 text-sm text-danger-700" role="alert">
            Boshlanish sanasi tugash sanasidan keyin bo&apos;lmasligi kerak.
          </p>
        ) : null}
      </SectionCard>

      {preview.isError ? (
        <ErrorState
          title="Hisob-kitobni yuklab bo'lmadi"
          message={
            preview.error instanceof Error ? preview.error.message : 'Qayta urinib ko‘ring.'
          }
          onRetry={() => void preview.refetch()}
        />
      ) : preview.isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <SectionCard title="Xulosa">
            <div className="space-y-2 text-sm" data-testid="compensation-preview-summary">
              <p className="text-base font-semibold text-ink">{data.worker.fullName}</p>
              <p className="text-ink-muted">
                {formatDate(data.period.from)} — {formatDate(data.period.to)}
              </p>
              <ul className="mt-2 space-y-1 text-ink">
                <li>Sotuvlar: {data.summary.saleEventCount}</li>
                <li>Usta ishlari: {data.summary.assemblyEventCount}</li>
                <li>Yetkazib berish: {data.summary.deliveryEventCount}</li>
                <li>O&apos;rnatish: {data.summary.installationEventCount}</li>
                <li>Qo&apos;llanilgan qoidalar: {data.summary.applicableRuleCount}</li>
                <li className="pt-1 text-base font-semibold">
                  Jami hisoblangan: {formatMoney(data.summary.totalCompensation)}
                </li>
              </ul>
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!canSettle || settle.isPending}
                  onClick={() => {
                    settle.reset();
                    setConfirmOpen(true);
                  }}
                  className="rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  data-testid="compensation-settle-open"
                >
                  Hisobni yozish (komissiya)
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Batafsil">
            {data.breakdown.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="Hisoblangan yozuvlar yo'q"
                description="Tanlangan davrda mos hodisa yoki qoida topilmadi."
              />
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="min-w-full text-left text-sm"
                  data-testid="compensation-preview-table"
                >
                  <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-2 py-2 font-medium">Sana</th>
                      <th className="px-2 py-2 font-medium">Event</th>
                      <th className="px-2 py-2 font-medium">Mahsulot / tavsif</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="px-2 py-2 font-medium">Rule</th>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 text-right font-medium">Rate</th>
                      <th className="px-2 py-2 text-right font-medium">Compensation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((row) => (
                      <tr key={row.id} className="border-b border-line/70">
                        <td className="whitespace-nowrap px-2 py-2">{formatDate(row.eventDate)}</td>
                        <td className="px-2 py-2">
                          {EVENT_LABELS[row.eventKind] ?? row.eventKind}
                        </td>
                        <td className="max-w-[14rem] truncate px-2 py-2" title={row.description}>
                          {row.description}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          {formatMoney(row.eventAmount)}
                        </td>
                        <td className="px-2 py-2">{COMPENSATION_TYPE_LABELS[row.ruleType]}</td>
                        <td className="px-2 py-2 text-ink-muted">{row.ruleType}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          {formatRuleRate(row)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right font-medium">
                          {formatMoney(row.compensationAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!settle.isPending) setConfirmOpen(false);
        }}
        title="Hisobni yozish?"
        description="Tanlangan davrdagi komissiya qatorlari ishchi moliyasiga yoziladi."
      >
        <div className="space-y-4">
          {data ? (
            <div className="rounded-input border border-line bg-canvas/50 px-3 py-2.5 text-sm">
              <p className="font-medium text-ink">{data.worker.fullName}</p>
              <p className="mt-0.5 text-ink-muted">
                {formatDate(data.period.from)} — {formatDate(data.period.to)}
              </p>
              <p className="mt-2 font-semibold text-ink">
                Jami: {formatMoney(data.summary.totalCompensation)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Qayta yozishda allaqachon yozilgan qatorlar o‘tkazib yuboriladi.
              </p>
            </div>
          ) : null}

          {settle.isError ? (
            <p role="alert" className="rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {settleErrorMessage(settle.error)}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={settle.isPending}
              onClick={() => setConfirmOpen(false)}
              className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
            >
              Yopish
            </button>
            <button
              type="button"
              disabled={settle.isPending || !canSettle}
              onClick={() => void handleSettle()}
              className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              data-testid="compensation-settle-confirm"
            >
              {settle.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Yozilmoqda...
                </>
              ) : (
                'Tasdiqlash'
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  );
}
