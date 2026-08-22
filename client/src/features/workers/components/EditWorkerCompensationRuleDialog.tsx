import {
  type UpdateWorkerCompensationRuleRequest,
  type WorkerCompensationRule,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { useUpdateWorkerCompensationRule } from '@/features/workers/hooks/use-worker-compensation';
import {
  COMPENSATION_RESPONSIBILITY_LABELS,
  COMPENSATION_TYPE_LABELS,
  basisPointsToPercentInput,
  isFixedCompensationType,
  isPercentCompensationType,
  isValidCompensationPercentInput,
  percentInputToBasisPoints,
  toCompensationDateInputValue,
} from '@/features/workers/utils/compensation-labels';
import { ApiClientError } from '@/lib/api-client';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface EditWorkerCompensationRuleDialogProps {
  open: boolean;
  workerId: string;
  rule: WorkerCompensationRule | null;
  onClose: () => void;
  onUpdated?: () => void;
}

interface FieldErrors {
  value?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Iltimos, qayta kiring.';
    if (error.isForbidden) return "Bu amalni bajarish uchun ruxsatingiz yo'q.";
    if (error.status === 404) return 'Qoida topilmadi.';
    if (error.status === 409) {
      return 'Bu davr uchun shu turdagi faol qoida allaqachon mavjud.';
    }
    if (error.isValidationError) {
      return error.message || "Ma'lumotlarni tekshirib, qayta urinib ko'ring.";
    }
    if (error.status === 0) return error.message;
    if (error.status >= 500) {
      return "Qoidani yangilab bo'lmadi. Qayta urinib ko'ring.";
    }
    return error.message || "Qoidani yangilab bo'lmadi. Qayta urinib ko'ring.";
  }
  return "Qoidani yangilab bo'lmadi. Qayta urinib ko'ring.";
}

function mapServerFieldErrors(details: { field?: string; message: string }[]): FieldErrors {
  const next: FieldErrors = {};
  for (const detail of details) {
    const field = detail.field;
    if (field === 'value') next.value = detail.message;
    else if (field === 'effectiveFrom') next.effectiveFrom = detail.message;
    else if (field === 'effectiveTo') next.effectiveTo = detail.message;
  }
  return next;
}

/**
 * Edit value / dates only. Responsibility and type are immutable on the backend.
 */
export function EditWorkerCompensationRuleDialog({
  open,
  workerId,
  rule,
  onClose,
  onUpdated,
}: EditWorkerCompensationRuleDialogProps) {
  const updateRule = useUpdateWorkerCompensationRule(workerId);
  const isPending = updateRule.isPending;

  const [percentText, setPercentText] = useState('');
  const [fixedAmount, setFixedAmount] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !rule) return;
    if (isPercentCompensationType(rule.type)) {
      setPercentText(basisPointsToPercentInput(rule.value));
      setFixedAmount(0);
    } else {
      setFixedAmount(rule.value);
      setPercentText('');
    }
    setEffectiveFrom(toCompensationDateInputValue(rule.effectiveFrom));
    setEffectiveTo(toCompensationDateInputValue(rule.effectiveTo));
    setFieldErrors({});
    setFormError(null);
  }, [open, rule]);

  function validate(): FieldErrors {
    if (!rule) return {};
    const next: FieldErrors = {};

    if (isPercentCompensationType(rule.type)) {
      if (!percentText.trim()) next.value = 'Foizni kiriting';
      else if (!isValidCompensationPercentInput(percentText)) {
        next.value = "Foiz 0 dan katta va 100 dan oshmasligi kerak (masalan 10 yoki 2.5)";
      }
    } else if (isFixedCompensationType(rule.type)) {
      if (!(fixedAmount > 0)) next.value = "Summa 0 dan katta bo'lishi kerak";
    }

    if (!effectiveFrom) next.effectiveFrom = 'Boshlanish sanasini tanlang';
    else if (!DATE_PATTERN.test(effectiveFrom)) next.effectiveFrom = "Sana noto'g'ri";

    if (effectiveTo) {
      if (!DATE_PATTERN.test(effectiveTo)) next.effectiveTo = "Sana noto'g'ri";
      else if (effectiveFrom && effectiveTo < effectiveFrom) {
        next.effectiveTo = 'Tugash sanasi boshlanishidan oldin bo‘lmasligi kerak';
      }
    }

    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rule || isPending) return;

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    let value: number;
    if (isPercentCompensationType(rule.type)) {
      const bp = percentInputToBasisPoints(percentText);
      if (bp === null) return;
      value = bp;
    } else {
      value = fixedAmount;
    }

    const body: UpdateWorkerCompensationRuleRequest = {
      value,
      effectiveFrom,
      effectiveTo: effectiveTo ? effectiveTo : null,
    };

    try {
      await updateRule.mutateAsync({ ruleId: rule.id, body });
      onUpdated?.();
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.isValidationError && error.details?.length) {
        setFieldErrors(mapServerFieldErrors(error.details));
      }
      setFormError(toFriendlyError(error));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title="Hisoblash qoidasini tahrirlash"
      description="Mas'uliyat va tur o'zgartirilmaydi. Yangi tur uchun eski qoidani faolsizlantiring."
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {formError ? (
          <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {formError}
          </p>
        ) : null}

        {rule ? (
          <dl className="grid gap-2 rounded-input border border-line bg-canvas/50 px-3 py-2.5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Mas&apos;uliyat</dt>
              <dd className="font-medium text-ink">
                {COMPENSATION_RESPONSIBILITY_LABELS[rule.responsibility]}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Tur</dt>
              <dd className="font-medium text-ink">{COMPENSATION_TYPE_LABELS[rule.type]}</dd>
            </div>
          </dl>
        ) : null}

        {rule && isPercentCompensationType(rule.type) ? (
          <div>
            <label htmlFor="edit-comp-percent" className="mb-1 block text-sm font-medium text-ink">
              Foiz
            </label>
            <div className="relative">
              <input
                id="edit-comp-percent"
                type="text"
                inputMode="decimal"
                className={`${fieldClass} pr-10`}
                value={percentText}
                disabled={isPending}
                onChange={(event) => {
                  setPercentText(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, value: undefined }));
                }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
                %
              </span>
            </div>
            {fieldErrors.value ? (
              <p className="mt-1 text-xs text-danger-700">{fieldErrors.value}</p>
            ) : null}
          </div>
        ) : null}

        {rule && isFixedCompensationType(rule.type) ? (
          <MoneyField
            label="Summa"
            value={fixedAmount}
            onChange={(next) => {
              setFixedAmount(next);
              setFieldErrors((prev) => ({ ...prev, value: undefined }));
            }}
            disabled={isPending}
            error={fieldErrors.value}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-comp-from" className="mb-1 block text-sm font-medium text-ink">
              Boshlanish sanasi
            </label>
            <input
              id="edit-comp-from"
              type="date"
              className={fieldClass}
              value={effectiveFrom}
              disabled={isPending}
              onChange={(event) => {
                setEffectiveFrom(event.target.value);
                setFieldErrors((prev) => ({ ...prev, effectiveFrom: undefined }));
              }}
            />
            {fieldErrors.effectiveFrom ? (
              <p className="mt-1 text-xs text-danger-700">{fieldErrors.effectiveFrom}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="edit-comp-to" className="mb-1 block text-sm font-medium text-ink">
              Tugash sanasi <span className="font-normal text-ink-muted">(ixtiyoriy)</span>
            </label>
            <input
              id="edit-comp-to"
              type="date"
              className={fieldClass}
              value={effectiveTo}
              disabled={isPending}
              onChange={(event) => {
                setEffectiveTo(event.target.value);
                setFieldErrors((prev) => ({ ...prev, effectiveTo: undefined }));
              }}
            />
            {fieldErrors.effectiveTo ? (
              <p className="mt-1 text-xs text-danger-700">{fieldErrors.effectiveTo}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isPending || !rule}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
