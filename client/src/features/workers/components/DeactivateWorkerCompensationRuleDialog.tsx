import type { WorkerCompensationRule } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { useUpdateWorkerCompensationRule } from '@/features/workers/hooks/use-worker-compensation';
import {
  COMPENSATION_RESPONSIBILITY_LABELS,
  COMPENSATION_TYPE_LABELS,
  formatCompensationRuleValue,
} from '@/features/workers/utils/compensation-labels';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

interface DeactivateWorkerCompensationRuleDialogProps {
  open: boolean;
  workerId: string;
  rule: WorkerCompensationRule | null;
  onClose: () => void;
  onDeactivated?: () => void;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Iltimos, qayta kiring.';
    if (error.isForbidden) return "Bu amalni bajarish uchun ruxsatingiz yo'q.";
    if (error.status === 404) return 'Qoida topilmadi.';
    if (error.status === 0) return error.message;
    if (error.status >= 500) return "Qoidani faolsizlantirib bo'lmadi. Qayta urinib ko'ring.";
    return error.message || "Qoidani faolsizlantirib bo'lmadi.";
  }
  return "Qoidani faolsizlantirib bo'lmadi.";
}

/**
 * Soft-deactivate confirmation. There is no DELETE endpoint by design.
 */
export function DeactivateWorkerCompensationRuleDialog({
  open,
  workerId,
  rule,
  onClose,
  onDeactivated,
}: DeactivateWorkerCompensationRuleDialogProps) {
  const updateRule = useUpdateWorkerCompensationRule(workerId);

  useEffect(() => {
    if (open) updateRule.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only reset
  }, [open]);

  async function handleDeactivate() {
    if (!rule || updateRule.isPending) return;
    try {
      await updateRule.mutateAsync({ ruleId: rule.id, body: { isActive: false } });
      onDeactivated?.();
      onClose();
    } catch {
      // Error shown below; keep dialog open.
    }
  }

  const errorMessage = updateRule.isError ? toFriendlyError(updateRule.error) : null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!updateRule.isPending) onClose();
      }}
      title="Qoidani faolsizlantirish?"
      description="Bu qoida yangi hisob-kitoblarda ishlatilmaydi. Oldingi ma'lumotlar o'zgarmaydi."
    >
      <div className="space-y-4">
        {rule ? (
          <div className="rounded-input border border-line bg-canvas/50 px-3 py-2.5 text-sm">
            <p className="font-medium text-ink">
              {COMPENSATION_RESPONSIBILITY_LABELS[rule.responsibility]} ·{' '}
              {COMPENSATION_TYPE_LABELS[rule.type]}
            </p>
            <p className="mt-0.5 text-ink-muted">
              {formatCompensationRuleValue(rule)} · {formatDate(rule.effectiveFrom)}
              {rule.effectiveTo ? ` — ${formatDate(rule.effectiveTo)}` : ''}
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={updateRule.isPending}
            onClick={onClose}
            className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            disabled={updateRule.isPending || !rule}
            onClick={() => void handleDeactivate()}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-danger-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-60"
          >
            {updateRule.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Faolsizlantirish
          </button>
        </div>
      </div>
    </Dialog>
  );
}
