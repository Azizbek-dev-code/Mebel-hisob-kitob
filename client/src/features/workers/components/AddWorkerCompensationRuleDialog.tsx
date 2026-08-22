import {
  WorkerResponsibility,
  type CreateWorkerCompensationRuleRequest,
  type WorkerCompensationType as WorkerCompensationTypeValue,
  type WorkerResponsibility as WorkerResponsibilityValue,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { useCreateWorkerCompensationRule } from '@/features/workers/hooks/use-worker-compensation';
import {
  COMPENSATION_RESPONSIBILITY_LABELS,
  COMPENSATION_TYPE_LABELS,
  compensationTypesForResponsibility,
  isFixedCompensationType,
  isPercentCompensationType,
  isValidCompensationPercentInput,
  percentInputToBasisPoints,
} from '@/features/workers/utils/compensation-labels';
import { todayStoreInputDate } from '@/features/workers/utils/period-range';
import { ApiClientError } from '@/lib/api-client';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface AddWorkerCompensationRuleDialogProps {
  open: boolean;
  workerId: string;
  /** Responsibilities the worker actually holds. */
  responsibilities: WorkerResponsibilityValue[];
  onClose: () => void;
  onCreated?: () => void;
}

interface FieldErrors {
  responsibility?: string;
  type?: string;
  value?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Iltimos, qayta kiring.';
    if (error.isForbidden) return "Bu amalni bajarish uchun ruxsatingiz yo'q.";
    if (error.status === 404) return 'Xodim topilmadi.';
    if (error.status === 409) {
      return 'Bu davr uchun shu turdagi faol qoida allaqachon mavjud.';
    }
    if (error.isValidationError) {
      return error.message || "Ma'lumotlarni tekshirib, qayta urinib ko'ring.";
    }
    if (error.status === 0) return error.message;
    if (error.status >= 500) {
      return "Qoidani saqlab bo'lmadi. Qayta urinib ko'ring.";
    }
    return error.message || "Qoidani saqlab bo'lmadi. Qayta urinib ko'ring.";
  }
  return "Qoidani saqlab bo'lmadi. Qayta urinib ko'ring.";
}

function mapServerFieldErrors(details: { field?: string; message: string }[]): FieldErrors {
  const next: FieldErrors = {};
  for (const detail of details) {
    const field = detail.field;
    if (field === 'responsibility') next.responsibility = detail.message;
    else if (field === 'type') next.type = detail.message;
    else if (field === 'value') next.value = detail.message;
    else if (field === 'effectiveFrom') next.effectiveFrom = detail.message;
    else if (field === 'effectiveTo') next.effectiveTo = detail.message;
  }
  return next;
}

/**
 * Admin dialog to create a compensation rule (configuration only — no ledger post).
 */
export function AddWorkerCompensationRuleDialog({
  open,
  workerId,
  responsibilities,
  onClose,
  onCreated,
}: AddWorkerCompensationRuleDialogProps) {
  const createRule = useCreateWorkerCompensationRule(workerId);
  const isPending = createRule.isPending;

  const availableResponsibilities = useMemo(
    () =>
      (
        [
          WorkerResponsibility.SELLER,
          WorkerResponsibility.ASSEMBLER,
          WorkerResponsibility.DELIVERY,
          WorkerResponsibility.INSTALLER,
          WorkerResponsibility.SMM,
          WorkerResponsibility.OTHER,
        ] as const
      ).filter((item) => responsibilities.includes(item)),
    [responsibilities],
  );

  const [responsibility, setResponsibility] = useState<WorkerResponsibilityValue | ''>('');
  const [type, setType] = useState<WorkerCompensationTypeValue | ''>('');
  const [percentText, setPercentText] = useState('');
  const [fixedAmount, setFixedAmount] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(todayStoreInputDate);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const typeOptions = responsibility
    ? compensationTypesForResponsibility(responsibility)
    : [];

  useEffect(() => {
    if (!open) return;
    const initial = availableResponsibilities[0] ?? '';
    setResponsibility(initial);
    const types = initial ? compensationTypesForResponsibility(initial) : [];
    setType(types[0] ?? '');
    setPercentText('');
    setFixedAmount(0);
    setEffectiveFrom(todayStoreInputDate());
    setEffectiveTo('');
    setFieldErrors({});
    setFormError(null);
  }, [open, availableResponsibilities]);

  function onResponsibilityChange(next: WorkerResponsibilityValue) {
    setResponsibility(next);
    const types = compensationTypesForResponsibility(next);
    setType(types[0] ?? '');
    setPercentText('');
    setFixedAmount(0);
    setFieldErrors((prev) => ({
      ...prev,
      responsibility: undefined,
      type: undefined,
      value: undefined,
    }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!responsibility) next.responsibility = "Mas'uliyatni tanlang";
    if (!type) next.type = 'Hisoblash turini tanlang';

    if (type && isPercentCompensationType(type)) {
      if (!percentText.trim()) next.value = 'Foizni kiriting';
      else if (!isValidCompensationPercentInput(percentText)) {
        next.value = "Foiz 0 dan katta va 100 dan oshmasligi kerak (masalan 10 yoki 2.5)";
      }
    } else if (type && isFixedCompensationType(type)) {
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
    if (isPending) return;

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (!responsibility || !type) return;

    let value: number;
    if (isPercentCompensationType(type)) {
      const bp = percentInputToBasisPoints(percentText);
      if (bp === null) return;
      value = bp;
    } else {
      value = fixedAmount;
    }

    const body: CreateWorkerCompensationRuleRequest = {
      responsibility,
      type,
      value,
      effectiveFrom,
      ...(effectiveTo ? { effectiveTo } : { effectiveTo: null }),
    };

    try {
      await createRule.mutateAsync(body);
      onCreated?.();
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.isValidationError && error.details?.length) {
        setFieldErrors(mapServerFieldErrors(error.details));
      }
      setFormError(toFriendlyError(error));
    }
  }

  const noTypesForResponsibility =
    Boolean(responsibility) && typeOptions.length === 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title="Hisoblash qoidasi qo'shish"
      description="Bu sozlama. Ledger operatsiyasi yaratilmaydi."
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {formError ? (
          <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="comp-responsibility" className="mb-1 block text-sm font-medium text-ink">
            Mas&apos;uliyat
          </label>
          <select
            id="comp-responsibility"
            className={fieldClass}
            value={responsibility}
            disabled={isPending || availableResponsibilities.length === 0}
            onChange={(event) =>
              onResponsibilityChange(event.target.value as WorkerResponsibilityValue)
            }
          >
            {availableResponsibilities.length === 0 ? (
              <option value="">Mas&apos;uliyat yo&apos;q</option>
            ) : null}
            {availableResponsibilities.map((item) => (
              <option key={item} value={item}>
                {COMPENSATION_RESPONSIBILITY_LABELS[item]}
              </option>
            ))}
          </select>
          {fieldErrors.responsibility ? (
            <p className="mt-1 text-xs text-danger-700">{fieldErrors.responsibility}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="comp-type" className="mb-1 block text-sm font-medium text-ink">
            Hisoblash turi
          </label>
          {noTypesForResponsibility ? (
            <p className="rounded-input border border-line bg-canvas/60 px-3 py-2 text-sm text-ink-muted">
              Bu mas&apos;uliyat uchun hozircha hisoblash turi mavjud emas.
            </p>
          ) : (
            <select
              id="comp-type"
              className={fieldClass}
              value={type}
              disabled={isPending || !responsibility}
              onChange={(event) => {
                setType(event.target.value as WorkerCompensationTypeValue);
                setPercentText('');
                setFixedAmount(0);
                setFieldErrors((prev) => ({ ...prev, type: undefined, value: undefined }));
              }}
            >
              {typeOptions.map((item) => (
                <option key={item} value={item}>
                  {COMPENSATION_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.type ? (
            <p className="mt-1 text-xs text-danger-700">{fieldErrors.type}</p>
          ) : null}
        </div>

        {type && isPercentCompensationType(type) ? (
          <div>
            <label htmlFor="comp-percent" className="mb-1 block text-sm font-medium text-ink">
              Foiz
            </label>
            <div className="relative">
              <input
                id="comp-percent"
                type="text"
                inputMode="decimal"
                className={`${fieldClass} pr-10`}
                value={percentText}
                disabled={isPending}
                placeholder="masalan 10 yoki 2.5"
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

        {type && isFixedCompensationType(type) ? (
          <div>
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
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="comp-from" className="mb-1 block text-sm font-medium text-ink">
              Boshlanish sanasi
            </label>
            <input
              id="comp-from"
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
            <label htmlFor="comp-to" className="mb-1 block text-sm font-medium text-ink">
              Tugash sanasi <span className="font-normal text-ink-muted">(ixtiyoriy)</span>
            </label>
            <input
              id="comp-to"
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
            disabled={isPending || noTypesForResponsibility || availableResponsibilities.length === 0}
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
