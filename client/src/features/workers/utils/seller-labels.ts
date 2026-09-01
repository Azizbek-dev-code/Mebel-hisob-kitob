import {
  SELLER_COMMISSION_STATUS_LABELS,
  sellerCompensationTypeLabel,
  type SellerCommissionStatus,
} from '@furniture-erp/shared';

import type { BadgeTone } from '@/components/ui/Badge';

export const SELLER_COMMISSION_STATUS_TONE: Record<SellerCommissionStatus, BadgeTone> = {
  NONE: 'neutral',
  ESTIMATED: 'info',
  EARNED: 'brand',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  REVERSED: 'warning',
  CANCELLED: 'danger',
};

export function sellerCommissionStatusLabel(status: SellerCommissionStatus | null | undefined): string {
  if (!status) return SELLER_COMMISSION_STATUS_LABELS.NONE;
  return SELLER_COMMISSION_STATUS_LABELS[status] ?? status;
}

export function sellerCommissionStatusTone(
  status: SellerCommissionStatus | null | undefined,
): BadgeTone {
  if (!status) return 'neutral';
  return SELLER_COMMISSION_STATUS_TONE[status] ?? 'neutral';
}

export function sellerRuleTypeLabel(ruleType: string | null | undefined): string {
  if (!ruleType) return 'Qoida yo‘q';
  return sellerCompensationTypeLabel(ruleType);
}
