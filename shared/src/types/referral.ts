import type { IsoDateString, Money } from './api.js';
import type { ReferralWithdrawalStatus } from '../constants/enums.js';

export interface ReferralPublicResolve {
  valid: boolean;
  code: string;
}

export interface ReferralMeResponse {
  code: string;
  path: string;
  programActive: boolean;
  commissionPercent: number;
  minWithdrawal: Money;
  clicks: number;
  registrations: number;
  firstPayments: number;
  conversionPercent: number;
  earned: Money;
  available: Money;
  pending: Money;
  paid: Money;
  canWithdraw: boolean;
}

export interface ReferralWithdrawalDto {
  id: string;
  amount: Money;
  status: ReferralWithdrawalStatus;
  rejectionReason: string | null;
  createdAt: IsoDateString;
  reviewedAt: IsoDateString | null;
  paidAt: IsoDateString | null;
}

export interface ReferralAdminOverview {
  clicks: number;
  registrations: number;
  conversions: number;
  commissions: Money;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: Money;
  paidWithdrawals: number;
  paidWithdrawalAmount: Money;
  commissionPercent: number;
  minWithdrawal: Money;
  programActive: boolean;
}

export interface ReferralAdminUserRow {
  identityId: string;
  ownerName: string;
  code: string;
  referrals: number;
  earned: Money;
}

export interface RejectReferralWithdrawalBody {
  reason: string;
}
