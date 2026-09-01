import {
  WORKER_FINANCIAL_CREATABLE_TYPES,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  type WorkerFinancialCreatableType,
  type WorkerFinancialTransaction,
  type WorkerFinancialTransactionType as WorkerFinancialType,
} from '@furniture-erp/shared';

/** Uzbek labels for ledger transaction types (admin UI). */
export const WORKER_FINANCE_TYPE_LABELS: Record<WorkerFinancialType, string> = {
  [WorkerFinancialTransactionType.BONUS]: 'Bonus',
  [WorkerFinancialTransactionType.COMMISSION]: 'Komissiya',
  [WorkerFinancialTransactionType.ADVANCE]: 'Avans',
  [WorkerFinancialTransactionType.DEBT]: 'Qarz',
  [WorkerFinancialTransactionType.PAYMENT]: "To'lov",
  [WorkerFinancialTransactionType.ADJUSTMENT]: 'Tuzatish',
  [WorkerFinancialTransactionType.REVERSAL]: 'Qaytarilgan',
};

/** Create-dialog options — REVERSAL is reverse-endpoint only. */
export const WORKER_FINANCE_CREATE_TYPE_OPTIONS: ReadonlyArray<{
  value: WorkerFinancialCreatableType;
  label: string;
}> = WORKER_FINANCIAL_CREATABLE_TYPES.map((value) => ({
  value,
  label: WORKER_FINANCE_TYPE_LABELS[value],
}));

/** Subtle help under the type select in the create dialog. */
export const WORKER_FINANCE_CREATE_TYPE_HELP: Record<WorkerFinancialCreatableType, string> = {
  [WorkerFinancialTransactionType.BONUS]: 'Xodimga beriladigan bonus.',
  [WorkerFinancialTransactionType.COMMISSION]: 'Sotuv yoki boshqa faoliyat uchun komissiya.',
  [WorkerFinancialTransactionType.ADVANCE]: 'Xodimga oldindan berilgan pul.',
  [WorkerFinancialTransactionType.DEBT]: 'Xodim zimmasiga yozilgan qarz.',
  [WorkerFinancialTransactionType.PAYMENT]: "Xodimga amalga oshirilgan to'lov.",
  [WorkerFinancialTransactionType.ADJUSTMENT]: 'Moliyaviy hisobdagi kredit tuzatmasi.',
};

export const WORKER_FINANCE_TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: '' | WorkerFinancialType;
  label: string;
}> = [
  { value: '', label: 'Barchasi' },
  { value: WorkerFinancialTransactionType.BONUS, label: 'Bonus' },
  { value: WorkerFinancialTransactionType.COMMISSION, label: 'Komissiya / haqlar' },
  { value: WorkerFinancialTransactionType.ADVANCE, label: 'Avans' },
  { value: WorkerFinancialTransactionType.DEBT, label: 'Qarz' },
  { value: WorkerFinancialTransactionType.PAYMENT, label: "To'lov" },
  { value: WorkerFinancialTransactionType.ADJUSTMENT, label: 'Tuzatish' },
  { value: WorkerFinancialTransactionType.REVERSAL, label: 'Qaytarilgan' },
];

/** Quick description filters for operational fee sources on the ledger. */
export const WORKER_FINANCE_SOURCE_FILTER_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: '', label: 'Barcha manbalar' },
  { value: 'Komissiya', label: 'Sotuvchi komissiyasi' },
  { value: 'Usta haqqi', label: 'Usta' },
  { value: 'Yetkazib berish haqi', label: 'Yetkazib berish' },
  { value: 'Kirim shopir haqqi', label: 'Kirim shopir' },
  { value: 'Installer haqqi', label: 'Installer' },
];

/** Display label for a row — includes original type when reversing. */
export function workerFinanceTypeDisplayLabel(
  type: WorkerFinancialType,
  reversesType: WorkerFinancialType | null,
): string {
  if (type === WorkerFinancialTransactionType.REVERSAL && reversesType) {
    const original = WORKER_FINANCE_TYPE_LABELS[reversesType] ?? reversesType;
    return `${original} operatsiyasi qaytarildi`;
  }
  if (type === WorkerFinancialTransactionType.REVERSAL) {
    return WORKER_FINANCE_TYPE_LABELS.REVERSAL;
  }
  return WORKER_FINANCE_TYPE_LABELS[type] ?? type;
}

/** Original ids already offset by a REVERSAL row in the loaded list. */
export function collectReversedOriginalIds(
  items: ReadonlyArray<WorkerFinancialTransaction>,
): Set<string> {
  const ids = new Set<string>();
  for (const tx of items) {
    if (
      tx.type === WorkerFinancialTransactionType.REVERSAL &&
      tx.referenceType === WorkerFinancialReferenceType.REVERSAL &&
      tx.referenceId
    ) {
      ids.add(tx.referenceId);
    }
  }
  return ids;
}

/** Whether the admin UI may offer reverse for this row (backend still authoritative). */
export function canReverseWorkerFinancialTransaction(
  tx: WorkerFinancialTransaction,
  reversedOriginalIds: ReadonlySet<string>,
): boolean {
  if (tx.type === WorkerFinancialTransactionType.REVERSAL) return false;
  if (reversedOriginalIds.has(tx.id)) return false;
  return true;
}
