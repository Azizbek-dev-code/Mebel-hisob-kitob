import type {
  PlatformSettingsDto,
  ReferralAdminOverview,
  ReferralAdminUserRow,
  ReferralMeResponse,
  ReferralPublicResolve,
  ReferralWithdrawalDto,
  ReferralWithdrawalStatus,
  RejectReferralWithdrawalBody,
  UpdatePlatformSettingsBody,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const referralsService = {
  resolve(code: string, signal?: AbortSignal) {
    return apiClient.get<ReferralPublicResolve>(`/referrals/resolve/${encodeURIComponent(code)}`, {
      signal,
    });
  },
  click(code: string) {
    return apiClient.post<{ code: string }>('/referrals/click', { body: { code } });
  },
  me(signal?: AbortSignal) {
    return apiClient.get<ReferralMeResponse>('/referrals/me', { signal });
  },
  listMine(signal?: AbortSignal) {
    return apiClient.get<{ items: ReferralWithdrawalDto[] }>('/referrals/withdrawals', { signal });
  },
  withdraw() {
    return apiClient.post<ReferralWithdrawalDto>('/referrals/withdrawals');
  },
  overview(signal?: AbortSignal) {
    return apiClient.get<ReferralAdminOverview>('/platform/referrals/overview', { signal });
  },
  users(signal?: AbortSignal) {
    return apiClient.get<{ items: ReferralAdminUserRow[] }>('/platform/referrals/users', { signal });
  },
  withdrawals(status?: ReferralWithdrawalStatus, signal?: AbortSignal) {
    const query = status ? `?status=${status}` : '';
    return apiClient.get<{ items: ReferralWithdrawalDto[] }>(
      `/platform/referrals/withdrawals${query}`,
      { signal },
    );
  },
  approve(id: string) {
    return apiClient.post<ReferralWithdrawalDto>(`/platform/referrals/withdrawals/${id}/approve`);
  },
  reject(id: string, body: RejectReferralWithdrawalBody) {
    return apiClient.post<ReferralWithdrawalDto>(`/platform/referrals/withdrawals/${id}/reject`, {
      body,
    });
  },
  pay(id: string) {
    return apiClient.post<ReferralWithdrawalDto>(`/platform/referrals/withdrawals/${id}/pay`);
  },
  updateSettings(body: UpdatePlatformSettingsBody) {
    return apiClient.patch<{ settings: PlatformSettingsDto }>('/platform/settings', { body });
  },
};
