import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  SalePaymentStatus,
  SaleStatus,
  type PaymentMethod,
  type PaymentType,
} from '@furniture-erp/shared';

import type { BadgeTone } from '@/components/ui/Badge';
import i18n from '@/i18n';

const PAYMENT_STATUS_TONES: Record<SalePaymentStatus, BadgeTone> = {
  [SalePaymentStatus.PAID]: 'success',
  [SalePaymentStatus.PARTIALLY_PAID]: 'warning',
  [SalePaymentStatus.UNPAID]: 'danger',
};

const SALE_STATUS_TONES: Record<SaleStatus, BadgeTone> = {
  [SaleStatus.DRAFT]: 'neutral',
  [SaleStatus.ACTIVE]: 'info',
  [SaleStatus.COMPLETED]: 'success',
  [SaleStatus.CANCELLED]: 'danger',
};

const ASSEMBLY_TONES: Record<AssemblyTaskStatus, BadgeTone> = {
  [AssemblyTaskStatus.PENDING]: 'warning',
  [AssemblyTaskStatus.IN_PROGRESS]: 'info',
  [AssemblyTaskStatus.COMPLETED]: 'success',
  [AssemblyTaskStatus.CANCELLED]: 'neutral',
};

const FULFILMENT_TONES: Record<FulfilmentStatus, BadgeTone> = {
  [FulfilmentStatus.NOT_REQUIRED]: 'neutral',
  [FulfilmentStatus.PENDING]: 'warning',
  [FulfilmentStatus.SCHEDULED]: 'info',
  [FulfilmentStatus.IN_TRANSIT]: 'brand',
  [FulfilmentStatus.COMPLETED]: 'success',
  [FulfilmentStatus.CANCELLED]: 'neutral',
};

export function paymentStatusLabel(status: SalePaymentStatus): string {
  return i18n.t(`status.payment.${status}`);
}

export function paymentStatusTone(status: SalePaymentStatus): BadgeTone {
  return PAYMENT_STATUS_TONES[status];
}

export function saleStatusLabel(status: SaleStatus): string {
  return i18n.t(`status.sale.${status}`);
}

export function saleStatusTone(status: SaleStatus): BadgeTone {
  return SALE_STATUS_TONES[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return i18n.t(`status.paymentMethod.${method}`);
}

export function paymentTypeLabel(type: PaymentType): string {
  return i18n.t(`status.paymentType.${type}`);
}

export function assemblyStatusLabel(status: AssemblyTaskStatus | null | undefined): string {
  if (!status) return i18n.t('status.notRequired');
  return i18n.t(`status.assembly.${status}`);
}

export function assemblyStatusTone(status: AssemblyTaskStatus | null | undefined): BadgeTone {
  if (!status) return 'neutral';
  return ASSEMBLY_TONES[status];
}

export function deliveryStatusLabel(status: FulfilmentStatus): string {
  return i18n.t(`status.fulfilment.${status}`);
}

export function deliveryStatusTone(status: FulfilmentStatus): BadgeTone {
  return FULFILMENT_TONES[status];
}

export function installationStatusLabel(status: FulfilmentStatus): string {
  return i18n.t(`status.installation.${status}`);
}

export function formatSaleNumber(saleNumber: number): string {
  return `#S-${String(saleNumber).padStart(6, '0')}`;
}

export function customerDisplayName(customer: {
  firstName: string;
  lastName: string;
}): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}
