import {
  ASSEMBLY_STATUS_LABELS,
  AssemblyTaskStatus,
  FULFILMENT_STATUS_LABELS,
  FulfilmentStatus,
  INSTALLATION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  SalePaymentStatus,
  SaleStatus,
  type PaymentMethod,
  type PaymentType,
} from '@furniture-erp/shared';

import type { BadgeTone } from '@/components/ui/Badge';

const PAYMENT_STATUS_LABELS: Record<SalePaymentStatus, string> = {
  [SalePaymentStatus.PAID]: 'Paid',
  [SalePaymentStatus.PARTIALLY_PAID]: 'Part paid',
  [SalePaymentStatus.UNPAID]: 'Unpaid',
};

const PAYMENT_STATUS_TONES: Record<SalePaymentStatus, BadgeTone> = {
  [SalePaymentStatus.PAID]: 'success',
  [SalePaymentStatus.PARTIALLY_PAID]: 'warning',
  [SalePaymentStatus.UNPAID]: 'danger',
};

const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  [SaleStatus.DRAFT]: 'Draft',
  [SaleStatus.ACTIVE]: 'Active',
  [SaleStatus.COMPLETED]: 'Completed',
  [SaleStatus.CANCELLED]: 'Cancelled',
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
  return PAYMENT_STATUS_LABELS[status];
}

export function paymentStatusTone(status: SalePaymentStatus): BadgeTone {
  return PAYMENT_STATUS_TONES[status];
}

export function saleStatusLabel(status: SaleStatus): string {
  return SALE_STATUS_LABELS[status];
}

export function saleStatusTone(status: SaleStatus): BadgeTone {
  return SALE_STATUS_TONES[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method];
}

export function paymentTypeLabel(type: PaymentType): string {
  return PAYMENT_TYPE_LABELS[type];
}

export function assemblyStatusLabel(status: AssemblyTaskStatus | null | undefined): string {
  if (!status) return 'Not required';
  return ASSEMBLY_STATUS_LABELS[status];
}

export function assemblyStatusTone(status: AssemblyTaskStatus | null | undefined): BadgeTone {
  if (!status) return 'neutral';
  return ASSEMBLY_TONES[status];
}

export function deliveryStatusLabel(status: FulfilmentStatus): string {
  return FULFILMENT_STATUS_LABELS[status];
}

export function deliveryStatusTone(status: FulfilmentStatus): BadgeTone {
  return FULFILMENT_TONES[status];
}

export function installationStatusLabel(status: FulfilmentStatus): string {
  return INSTALLATION_STATUS_LABELS[status];
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
