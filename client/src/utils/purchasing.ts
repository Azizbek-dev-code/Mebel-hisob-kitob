import {
  PurchasePaymentStatus,
  PurchaseStatus,
  type PurchaseListPaymentFilter,
} from '@furniture-erp/shared';

import type { BadgeTone } from '@/components/ui/Badge';

const PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  [PurchasePaymentStatus.UNPAID]: 'Kredit',
  [PurchasePaymentStatus.PARTIALLY_PAID]: 'Qisman',
  [PurchasePaymentStatus.PAID]: 'To‘langan',
};

const PAYMENT_STATUS_TONES: Record<PurchasePaymentStatus, BadgeTone> = {
  [PurchasePaymentStatus.UNPAID]: 'danger',
  [PurchasePaymentStatus.PARTIALLY_PAID]: 'warning',
  [PurchasePaymentStatus.PAID]: 'success',
};

/** List-row / detail badge including cancelled purchases. */
export function purchasePaymentStatusLabel(
  paymentStatus: PurchasePaymentStatus,
  status?: PurchaseStatus,
): string {
  if (status === PurchaseStatus.CANCELLED) return 'Bekor';
  return PAYMENT_STATUS_LABELS[paymentStatus];
}

export function purchasePaymentStatusTone(
  paymentStatus: PurchasePaymentStatus,
  status?: PurchaseStatus,
): BadgeTone {
  if (status === PurchaseStatus.CANCELLED) return 'neutral';
  return PAYMENT_STATUS_TONES[paymentStatus];
}

export function purchaseListFilterLabel(filter: PurchaseListPaymentFilter): string {
  switch (filter) {
    case 'ALL':
      return 'Hammasi';
    case 'PAID':
      return 'To‘langan';
    case 'PARTIALLY_PAID':
      return 'Qisman';
    case 'UNPAID':
      return 'Kredit';
    case 'CANCELLED':
      return 'Bekor';
    default:
      return filter;
  }
}
