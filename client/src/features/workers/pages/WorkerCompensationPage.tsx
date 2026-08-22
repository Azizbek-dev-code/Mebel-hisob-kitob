import type { WorkerCompensationRule } from '@furniture-erp/shared';
import { Percent, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddWorkerCompensationRuleDialog } from '@/features/workers/components/AddWorkerCompensationRuleDialog';
import { DeactivateWorkerCompensationRuleDialog } from '@/features/workers/components/DeactivateWorkerCompensationRuleDialog';
import { EditWorkerCompensationRuleDialog } from '@/features/workers/components/EditWorkerCompensationRuleDialog';
import {
  useUpdateWorkerCompensationRule,
  useWorkerCompensationRules,
} from '@/features/workers/hooks/use-worker-compensation';
import { useWorker } from '@/features/workers/hooks/use-workers';
import {
  COMPENSATION_RESPONSIBILITY_LABELS,
  COMPENSATION_TYPE_LABELS,
  formatCompensationRuleValue,
} from '@/features/workers/utils/compensation-labels';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

const SUCCESS_CLEAR_MS = 4000;

function RuleStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge tone={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Faol' : 'Faol emas'}
    </Badge>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDeactivate,
  onActivate,
  activatePending,
}: {
  rule: WorkerCompensationRule;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  activatePending?: boolean;
}) {
  return (
    <article
      data-testid={`compensation-rule-${rule.id}`}
      className="rounded-panel border border-line bg-surface px-4 py-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">
              {COMPENSATION_RESPONSIBILITY_LABELS[rule.responsibility]}
            </p>
            <RuleStatusBadge isActive={rule.isActive} />
          </div>
          <p className="text-sm text-ink">{COMPENSATION_TYPE_LABELS[rule.type]}</p>
          <p className="text-base font-semibold tracking-tight text-ink">
            {formatCompensationRuleValue(rule)}
          </p>
          <p className="text-xs text-ink-muted">
            {formatDate(rule.effectiveFrom)}
            {rule.effectiveTo ? ` — ${formatDate(rule.effectiveTo)}` : ' — …'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-input border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover"
          >
            Tahrirlash
          </button>
          {rule.isActive ? (
            <button
              type="button"
              onClick={onDeactivate}
              className="rounded-input border border-line px-3 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-50"
            >
              Faolsizlantirish
            </button>
          ) : (
            <button
              type="button"
              disabled={activatePending}
              onClick={onActivate}
              className="rounded-input border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
            >
              Faollashtirish
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Admin configuration screen for how a worker is normally compensated.
 * Does not post WorkerFinancialTransaction rows.
 */
export function WorkerCompensationPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);
  const rules = useWorkerCompensationRules(id, {}, Boolean(id));
  const updateRule = useUpdateWorkerCompensationRule(id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<WorkerCompensationRule | null>(null);
  const [deactivateRule, setDeactivateRule] = useState<WorkerCompensationRule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function activateRule(rule: WorkerCompensationRule) {
    setActivateError(null);
    setActivatingId(rule.id);
    try {
      await updateRule.mutateAsync({ ruleId: rule.id, body: { isActive: true } });
      setSuccessMessage('Hisoblash qoidasi faollashtirildi.');
    } catch (error) {
      setActivateError(
        error instanceof ApiClientError
          ? error.message
          : "Qoidani faollashtirib bo'lmadi.",
      );
    } finally {
      setActivatingId(null);
    }
  }

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
  const items = rules.data ?? [];

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.workerDetail(detail.id)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ← {detail.fullName}
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {detail.fullName} — Hisoblash qoidalari
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            @{detail.username ?? detail.email}
            {' · '}
            <Badge tone={detail.isActive ? 'success' : 'neutral'} className="align-middle">
              {detail.isActive ? 'Faol' : 'Faol emas'}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.workerCompensationPreview(detail.id)}
            className="inline-flex items-center justify-center rounded-input border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            Hisob-kitob ko&apos;rinishi
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Qoida qo&apos;shish
          </button>
        </div>
      </div>

      {successMessage ? (
        <p
          role="status"
          className="rounded-input border border-success-500/30 bg-success-50 px-3 py-2 text-sm text-success-700"
        >
          {successMessage}
        </p>
      ) : null}

      {activateError ? (
        <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {activateError}
        </p>
      ) : null}

      <SectionCard title="Qoidalar" description="Konfiguratsiya — avtomatik to'lov yaratilmaydi.">
        {rules.isError ? (
          <ErrorState
            title="Qoidalarni yuklab bo'lmadi"
            message={
              rules.error instanceof Error ? rules.error.message : 'Qayta urinib ko‘ring.'
            }
            onRetry={() => void rules.refetch()}
          />
        ) : rules.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="Hisoblash qoidalari mavjud emas."
            description="Ishchi uchun foiz yoki belgilangan summa qoidasini qo'shing."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Qoida qo&apos;shish
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => setEditRule(rule)}
                onDeactivate={() => setDeactivateRule(rule)}
                onActivate={() => void activateRule(rule)}
                activatePending={activatingId === rule.id}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <AddWorkerCompensationRuleDialog
        open={createOpen}
        workerId={detail.id}
        responsibilities={detail.responsibilities}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setSuccessMessage("Hisoblash qoidasi qo'shildi.")}
      />

      <EditWorkerCompensationRuleDialog
        open={Boolean(editRule)}
        workerId={detail.id}
        rule={editRule}
        onClose={() => setEditRule(null)}
        onUpdated={() => setSuccessMessage('Hisoblash qoidasi yangilandi.')}
      />

      <DeactivateWorkerCompensationRuleDialog
        open={Boolean(deactivateRule)}
        workerId={detail.id}
        rule={deactivateRule}
        onClose={() => setDeactivateRule(null)}
        onDeactivated={() => setSuccessMessage('Hisoblash qoidasi faolsizlantirildi.')}
      />
    </PageContainer>
  );
}
