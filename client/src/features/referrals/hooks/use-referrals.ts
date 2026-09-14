import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReferralWithdrawalStatus, RejectReferralWithdrawalBody } from '@furniture-erp/shared';

import { referralsService } from '@/services/referrals.service';
import { platformBillingQueryKeys } from '@/features/platform/hooks/use-platform-billing';

export const referralQueryKeys = {
  me: ['referrals-me'] as const,
  mine: ['referrals-withdrawals'] as const,
  overview: ['platform-referrals-overview'] as const,
  users: ['platform-referrals-users'] as const,
  withdrawals: (status?: string) => ['platform-referrals-withdrawals', status] as const,
};

export function useMyReferral(enabled = true) {
  return useQuery({
    queryKey: referralQueryKeys.me,
    queryFn: ({ signal }) => referralsService.me(signal),
    enabled,
  });
}

export function useMyReferralWithdrawals(enabled = true) {
  return useQuery({
    queryKey: referralQueryKeys.mine,
    queryFn: ({ signal }) => referralsService.listMine(signal),
    enabled,
  });
}

export function useRequestReferralWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => referralsService.withdraw(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: referralQueryKeys.me });
      void client.invalidateQueries({ queryKey: referralQueryKeys.mine });
    },
  });
}

export function useReferralAdminOverview(enabled = true) {
  return useQuery({
    queryKey: referralQueryKeys.overview,
    queryFn: ({ signal }) => referralsService.overview(signal),
    enabled,
  });
}

export function useReferralAdminUsers(enabled = true) {
  return useQuery({
    queryKey: referralQueryKeys.users,
    queryFn: ({ signal }) => referralsService.users(signal),
    enabled,
  });
}

export function useReferralAdminWithdrawals(status?: ReferralWithdrawalStatus, enabled = true) {
  return useQuery({
    queryKey: referralQueryKeys.withdrawals(status),
    queryFn: ({ signal }) => referralsService.withdrawals(status, signal),
    enabled,
  });
}

export function useApproveReferralWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referralsService.approve(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-referrals-withdrawals'] });
      void client.invalidateQueries({ queryKey: referralQueryKeys.overview });
      void client.invalidateQueries({ queryKey: platformBillingQueryKeys.dashboard() });
    },
  });
}

export function useRejectReferralWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectReferralWithdrawalBody }) =>
      referralsService.reject(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-referrals-withdrawals'] });
      void client.invalidateQueries({ queryKey: referralQueryKeys.overview });
    },
  });
}

export function usePayReferralWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referralsService.pay(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-referrals-withdrawals'] });
      void client.invalidateQueries({ queryKey: referralQueryKeys.overview });
      void client.invalidateQueries({ queryKey: platformBillingQueryKeys.dashboard() });
    },
  });
}
