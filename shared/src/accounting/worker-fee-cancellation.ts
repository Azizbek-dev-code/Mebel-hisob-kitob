import {
  WorkerResponsibility,
  type WorkerResponsibility as WorkerResponsibilityValue,
} from '../constants/enums.js';

/**
 * Cancellation rule for worker operational fees.
 *
 * Work completed = earning earned. A sale / purchase cancelled afterwards
 * removes revenue, customer debt and stock, but must not take back the fee of a
 * worker who already performed the physical service (usta, o'rnatuvchi, shopir).
 *
 * Seller commission is deliberately NOT protected here: it is compensation for
 * the sale result, so it keeps following the existing accounting rule and is
 * reversed with the sale.
 *
 * Pure module — ledger IO lives in the server services.
 */

export type SaleWorkerFeeKind = 'ASSEMBLY' | 'INSTALLER' | 'DELIVERY' | 'SELLER' | 'OTHER';

/** Which physical services on a sale actually reached COMPLETED. */
export interface SaleWorkCompletion {
  assemblyCompleted: boolean;
  installationCompleted: boolean;
  deliveryCompleted: boolean;
}

/**
 * Ref suffixes per fee kind. Covers current refs, the interim `:X:FEE` refs and
 * the legacy `:INSTALLATION_COST` / `:DELIVERY_COST` refs, plus compensation
 * settle refs (`:MANUAL:<role>`, `:FIXED_PER_*`) that pay the same work.
 */
const FEE_REF_SUFFIXES: ReadonlyArray<{ kind: SaleWorkerFeeKind; suffixes: readonly string[] }> = [
  {
    kind: 'SELLER',
    suffixes: [
      ':MANUAL:SELLER',
      ':PERCENT_OF_SALE',
      ':PERCENT_OF_GROSS_PROFIT',
      ':FIXED_PER_SALE',
    ],
  },
  {
    kind: 'INSTALLER',
    suffixes: [':INSTALLER_FEE', ':INSTALLATION:FEE', ':FIXED_PER_INSTALLATION'],
  },
  {
    kind: 'ASSEMBLY',
    suffixes: [
      ':ASSEMBLY_FEE',
      ':ASSEMBLY:FEE',
      ':INSTALLATION_COST',
      ':MANUAL:ASSEMBLER',
      ':FIXED_PER_ASSEMBLY',
    ],
  },
  {
    kind: 'DELIVERY',
    suffixes: [
      ':DELIVERY_FEE',
      ':DELIVERY:FEE',
      ':DELIVERY_COST',
      ':MANUAL:SHOPIR',
      ':MANUAL:DASTAFCHI',
      ':FIXED_PER_DELIVERY',
    ],
  },
];

const RESPONSIBILITY_FEE_KIND: Partial<Record<WorkerResponsibilityValue, SaleWorkerFeeKind>> = {
  [WorkerResponsibility.ASSEMBLER]: 'ASSEMBLY',
  [WorkerResponsibility.INSTALLER]: 'INSTALLER',
  [WorkerResponsibility.DELIVERY]: 'DELIVERY',
  [WorkerResponsibility.SELLER]: 'SELLER',
};

/**
 * Classify a worker COMMISSION reference id posted from a sale.
 *
 * Matching is suffix based so per-task refs (`${assemblyTaskId}:FIXED_PER_ASSEMBLY`)
 * classify the same way as per-sale refs. `responsibility` is only a fallback for
 * rows whose ref shape is unknown.
 */
export function classifySaleWorkerFeeRef(
  referenceId: string | null | undefined,
  responsibility?: WorkerResponsibilityValue | null,
): SaleWorkerFeeKind {
  const ref = referenceId ?? '';
  for (const entry of FEE_REF_SUFFIXES) {
    for (const suffix of entry.suffixes) {
      if (ref.endsWith(suffix) || ref.includes(`${suffix}:`)) return entry.kind;
    }
  }
  if (responsibility) return RESPONSIBILITY_FEE_KIND[responsibility] ?? 'OTHER';
  return 'OTHER';
}

/**
 * True when the fee pays for physical work that is already COMPLETED, so sale
 * cancellation must leave both the ledger row and the worker balance untouched.
 */
export function isEarnedSaleWorkerFee(input: {
  referenceId: string | null | undefined;
  responsibility?: WorkerResponsibilityValue | null;
  completion: SaleWorkCompletion;
}): boolean {
  switch (classifySaleWorkerFeeRef(input.referenceId, input.responsibility)) {
    case 'ASSEMBLY':
      return input.completion.assemblyCompleted;
    case 'INSTALLER':
      return input.completion.installationCompleted;
    case 'DELIVERY':
      return input.completion.deliveryCompleted;
    default:
      return false;
  }
}

/**
 * Purchase shopir: the transport is done once the goods arrived at the store
 * (`deliveredAt` set). Cancelling the purchase later does not undo the trip.
 */
export function isEarnedPurchaseDriverFee(input: {
  deliveredAt: Date | string | null | undefined;
}): boolean {
  return input.deliveredAt !== null && input.deliveredAt !== undefined;
}
