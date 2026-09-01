/**
 * Operational worker fees from Sale / Purchase documents.
 *
 * Posts COMMISSION ledger rows (not COMPENSATION settle rows) so seller %
 * settlement and simple fee fields do not collide. Idempotent via stable
 * referenceType + referenceId; reverses on sale/purchase cancel.
 *
 * Ref scheme (per sale / purchase):
 * - `${saleId}:ASSEMBLY_FEE` — usta / assembler (assembly COMPLETED)
 * - `${saleId}:INSTALLER_FEE` — installer (installation COMPLETED)
 * - `${saleId}:DELIVERY_FEE` — sale shopir (delivery COMPLETED)
 * - `${purchaseId}:DRIVER_FEE` — purchase shopir
 * Legacy refs (`:INSTALLATION_COST`, `:DELIVERY_COST`, `:ASSEMBLY:FEE`, …) still reverse/dedupe.
 */
import {
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '@furniture-erp/shared';

import { fromDbMoney } from '../lib/money-mapper.js';
import type { WorkerFinancialTxClient } from '../repositories/worker-financial.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';

/** @deprecated Prefer ASSEMBLY_FEE_REF — kept for reverse/backfill idempotency. */
export const LEGACY_INSTALLATION_COST_REF = (saleId: string) => `${saleId}:INSTALLATION_COST`;
/** @deprecated Prefer DELIVERY_FEE_REF. */
export const LEGACY_DELIVERY_COST_REF = (saleId: string) => `${saleId}:DELIVERY_COST`;
/** Interim refs from the hardening branch. */
export const LEGACY_ASSEMBLY_COLON_FEE_REF = (saleId: string) => `${saleId}:ASSEMBLY:FEE`;
export const LEGACY_INSTALLATION_COLON_FEE_REF = (saleId: string) => `${saleId}:INSTALLATION:FEE`;
export const LEGACY_DELIVERY_COLON_FEE_REF = (saleId: string) => `${saleId}:DELIVERY:FEE`;

export const ASSEMBLY_FEE_REF = (saleId: string) => `${saleId}:ASSEMBLY_FEE`;
export const INSTALLER_FEE_REF = (saleId: string) => `${saleId}:INSTALLER_FEE`;
export const DELIVERY_FEE_REF = (saleId: string) => `${saleId}:DELIVERY_FEE`;
export const PURCHASE_DRIVER_FEE_REF = (purchaseId: string) => `${purchaseId}:DRIVER_FEE`;

/** @deprecated Use ASSEMBLY_FEE_REF / INSTALLER_FEE_REF. */
export const INSTALLATION_COST_REF = LEGACY_INSTALLATION_COST_REF;
export const INSTALLATION_FEE_REF = INSTALLER_FEE_REF;
/** @deprecated Use DELIVERY_FEE_REF. */
export const DELIVERY_COST_REF = LEGACY_DELIVERY_COST_REF;

async function hasAnyOpenCommissionRef(
  storeId: string,
  refs: Array<{
    referenceType:
      | typeof WorkerFinancialReferenceType.SALE
      | typeof WorkerFinancialReferenceType.ASSEMBLY
      | typeof WorkerFinancialReferenceType.PURCHASE;
    referenceId: string;
  }>,
  client: WorkerFinancialTxClient,
): Promise<boolean> {
  for (const ref of refs) {
    const existing = await workerFinancialRepository.findOpenCommissionByRef(
      storeId,
      ref.referenceType,
      ref.referenceId,
      client,
    );
    if (existing) return true;
  }
  return false;
}

async function postCommissionOnce(input: {
  storeId: string;
  workerId: string;
  amount: number;
  transactionDate: Date;
  description: string;
  referenceType:
    | typeof WorkerFinancialReferenceType.SALE
    | typeof WorkerFinancialReferenceType.ASSEMBLY
    | typeof WorkerFinancialReferenceType.PURCHASE;
  referenceId: string;
  responsibility: (typeof WorkerResponsibility)[keyof typeof WorkerResponsibility];
  /** Additional refs that already count as "posted" (legacy + siblings). */
  idempotencyRefs?: Array<{
    referenceType:
      | typeof WorkerFinancialReferenceType.SALE
      | typeof WorkerFinancialReferenceType.ASSEMBLY
      | typeof WorkerFinancialReferenceType.PURCHASE;
    referenceId: string;
  }>;
  createdById: string;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return false;

  const checkRefs = [
    { referenceType: input.referenceType, referenceId: input.referenceId },
    ...(input.idempotencyRefs ?? []),
  ];
  if (await hasAnyOpenCommissionRef(input.storeId, checkRefs, input.client)) {
    return false;
  }

  try {
    await workerFinancialRepository.createTransaction(
      {
        storeId: input.storeId,
        workerId: input.workerId,
        type: WorkerFinancialTransactionType.COMMISSION,
        amount: input.amount,
        transactionDate: input.transactionDate,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        responsibility: input.responsibility,
        createdById: input.createdById,
      },
      input.client,
    );
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return false;
    throw error;
  }
}

async function reverseOpenCommission(
  storeId: string,
  original: {
    id: string;
    workerId: string;
    amount: bigint;
    type: string;
    description: string | null;
    responsibility?: string | null;
  },
  actorId: string,
  reason: string,
  client: WorkerFinancialTxClient,
): Promise<void> {
  const already = await workerFinancialRepository.findReversalOf(storeId, original.id, client);
  if (already) return;

  await workerFinancialRepository.createTransaction(
    {
      storeId,
      workerId: original.workerId,
      type: WorkerFinancialTransactionType.REVERSAL,
      amount: fromDbMoney(original.amount),
      transactionDate: new Date(),
      description: reason,
      referenceType: WorkerFinancialReferenceType.REVERSAL,
      referenceId: original.id,
      reversesType: original.type as 'COMMISSION',
      // Keep responsibility so module-scoped KPI aggregates still net reversals.
      responsibility:
        (original.responsibility as import('@furniture-erp/shared').WorkerResponsibility | null) ??
        null,
      createdById: actorId,
    },
    client,
  );
  await workerFinancialRepository.closeOpenCommission(storeId, original.id, client);
}

function toAmount(value: bigint | number): number {
  return typeof value === 'bigint' ? fromDbMoney(value) : value;
}

/**
 * Credit usta / assembler fee when assembly task becomes COMPLETED.
 * Amount = Sale.installationCost (assemblerFee). Does not collide with installer.
 */
export async function postAssemblyFeeOnComplete(input: {
  storeId: string;
  saleId: string;
  saleNumber: number;
  workerId: string | null | undefined;
  assemblyFee: bigint | number;
  productSummary?: string | null;
  actorId: string;
  occurredAt?: Date;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (!input.workerId) return false;
  const amount = toAmount(input.assemblyFee);
  if (amount <= 0) return false;

  const product = input.productSummary?.trim() || 'Mebel';
  return postCommissionOnce({
    storeId: input.storeId,
    workerId: input.workerId,
    amount,
    transactionDate: input.occurredAt ?? new Date(),
    description: `Usta haqqi · Sotuv #${input.saleNumber} · ${product} · Assembly completed`,
    referenceType: WorkerFinancialReferenceType.ASSEMBLY,
    referenceId: ASSEMBLY_FEE_REF(input.saleId),
    responsibility: WorkerResponsibility.ASSEMBLER,
    idempotencyRefs: [
      {
        referenceType: WorkerFinancialReferenceType.ASSEMBLY,
        referenceId: LEGACY_INSTALLATION_COST_REF(input.saleId),
      },
      {
        referenceType: WorkerFinancialReferenceType.ASSEMBLY,
        referenceId: LEGACY_ASSEMBLY_COLON_FEE_REF(input.saleId),
      },
    ],
    createdById: input.actorId,
    client: input.client,
  });
}

/**
 * Credit installer fee when installationStatus becomes COMPLETED.
 * Amount = Sale.installerFee. Separate ref from assembly so both can post.
 */
export async function postInstallerFeeOnComplete(input: {
  storeId: string;
  saleId: string;
  saleNumber: number;
  workerId: string | null | undefined;
  installerFee: bigint | number;
  productSummary?: string | null;
  actorId: string;
  occurredAt?: Date;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (!input.workerId) return false;
  const amount = toAmount(input.installerFee);
  if (amount <= 0) return false;

  const product = input.productSummary?.trim() || 'Mebel';
  return postCommissionOnce({
    storeId: input.storeId,
    workerId: input.workerId,
    amount,
    transactionDate: input.occurredAt ?? new Date(),
    description: `Installer haqqi · Sotuv #${input.saleNumber} · ${product} · Installation completed`,
    referenceType: WorkerFinancialReferenceType.ASSEMBLY,
    referenceId: INSTALLER_FEE_REF(input.saleId),
    responsibility: WorkerResponsibility.INSTALLER,
    idempotencyRefs: [
      {
        referenceType: WorkerFinancialReferenceType.ASSEMBLY,
        referenceId: LEGACY_INSTALLATION_COLON_FEE_REF(input.saleId),
      },
    ],
    createdById: input.actorId,
    client: input.client,
  });
}

/**
 * @deprecated Use postAssemblyFeeOnComplete / postInstallerFeeOnComplete.
 * Kept for call-site migration; routes by `asInstaller`.
 */
export async function postInstallationFeeOnComplete(input: {
  storeId: string;
  saleId: string;
  saleNumber: number;
  workerId: string | null | undefined;
  installationCost: bigint | number;
  productSummary?: string | null;
  actorId: string;
  occurredAt?: Date;
  asInstaller?: boolean;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (input.asInstaller) {
    return postInstallerFeeOnComplete({
      storeId: input.storeId,
      saleId: input.saleId,
      saleNumber: input.saleNumber,
      workerId: input.workerId,
      installerFee: input.installationCost,
      productSummary: input.productSummary,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      client: input.client,
    });
  }
  return postAssemblyFeeOnComplete({
    storeId: input.storeId,
    saleId: input.saleId,
    saleNumber: input.saleNumber,
    workerId: input.workerId,
    assemblyFee: input.installationCost,
    productSummary: input.productSummary,
    actorId: input.actorId,
    occurredAt: input.occurredAt,
    client: input.client,
  });
}

/**
 * Credit sale shopir / delivery fee when deliveryStatus becomes COMPLETED.
 */
export async function postDeliveryFeeOnComplete(input: {
  storeId: string;
  saleId: string;
  saleNumber: number;
  workerId: string | null | undefined;
  deliveryCost: bigint | number;
  productSummary?: string | null;
  actorId: string;
  occurredAt?: Date;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (!input.workerId) return false;
  const amount = toAmount(input.deliveryCost);
  if (amount <= 0) return false;

  const product = input.productSummary?.trim() || 'Mebel';
  return postCommissionOnce({
    storeId: input.storeId,
    workerId: input.workerId,
    amount,
    transactionDate: input.occurredAt ?? new Date(),
    description: `Yetkazib berish haqi · Sotuv #${input.saleNumber} · ${product} · Delivery completed`,
    referenceType: WorkerFinancialReferenceType.SALE,
    referenceId: DELIVERY_FEE_REF(input.saleId),
    responsibility: WorkerResponsibility.DELIVERY,
    idempotencyRefs: [
      {
        referenceType: WorkerFinancialReferenceType.SALE,
        referenceId: LEGACY_DELIVERY_COST_REF(input.saleId),
      },
      {
        referenceType: WorkerFinancialReferenceType.SALE,
        referenceId: LEGACY_DELIVERY_COLON_FEE_REF(input.saleId),
      },
    ],
    createdById: input.actorId,
    client: input.client,
  });
}

/**
 * Credit purchase shopir fee once when the purchase is recorded (stock-in).
 */
export async function postPurchaseDriverFee(input: {
  storeId: string;
  purchaseId: string;
  purchaseNumber: number;
  workerId: string | null | undefined;
  driverFee: number;
  supplierName?: string | null;
  actorId: string;
  occurredAt?: Date;
  client: WorkerFinancialTxClient;
}): Promise<boolean> {
  if (!input.workerId) return false;
  if (input.driverFee <= 0) return false;

  const supplier = input.supplierName?.trim() || 'Yetkazuvchi';
  return postCommissionOnce({
    storeId: input.storeId,
    workerId: input.workerId,
    amount: input.driverFee,
    transactionDate: input.occurredAt ?? new Date(),
    description: `Kirim shopir haqqi · Kirim #${input.purchaseNumber} · ${supplier}`,
    referenceType: WorkerFinancialReferenceType.PURCHASE,
    referenceId: PURCHASE_DRIVER_FEE_REF(input.purchaseId),
    responsibility: WorkerResponsibility.DELIVERY,
    createdById: input.actorId,
    client: input.client,
  });
}

/**
 * Reverse every open COMMISSION posted from this sale (Usta / Shopir / Installer
 * fees and settled seller compensation). Idempotent — already-reversed rows skip.
 */
export async function reverseSaleOperationalFees(input: {
  storeId: string;
  saleId: string;
  saleNumber: number;
  actorId: string;
  client: WorkerFinancialTxClient;
}): Promise<void> {
  const open = await workerFinancialRepository.findOpenSaleOperationalFeeCommissions(
    input.storeId,
    input.saleId,
    input.client,
  );
  for (const row of open) {
    await reverseOpenCommission(
      input.storeId,
      row,
      input.actorId,
      `Reversal · Sotuv #${input.saleNumber} bekor qilindi — ishchi haqqi minus`,
      input.client,
    );
  }
}

export async function reversePurchaseDriverFee(input: {
  storeId: string;
  purchaseId: string;
  purchaseNumber: number;
  actorId: string;
  client: WorkerFinancialTxClient;
}): Promise<void> {
  const open = await workerFinancialRepository.findOpenPurchaseDriverFeeCommission(
    input.storeId,
    input.purchaseId,
    input.client,
  );
  if (!open) return;
  await reverseOpenCommission(
    input.storeId,
    open,
    input.actorId,
    `Reversal · Kirim #${input.purchaseNumber} bekor qilindi`,
    input.client,
  );
}
