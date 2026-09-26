import type {
  AccountDeletionListResponse,
  AuthSessionListResponse,
  ChangePasswordRequest,
  CurrentUserResponse,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateAccountProfileRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const accountService = {
  updateProfile: (body: UpdateAccountProfileRequest) =>
    apiClient.patch<CurrentUserResponse>('/me/account', { body }),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient.post<{ ok: true; requiresReauth: true; message: string }>('/auth/change-password', {
      body,
    }),

  changePlatformAdminPassword: (body: ChangePasswordRequest) =>
    apiClient.post<{ ok: true; requiresReauth: true; message: string }>(
      '/platform/auth/change-password',
      { body },
    ),

  forgotPassword: (body: ForgotPasswordRequest) =>
    apiClient.post<{ ok: true }>('/auth/forgot-password', { body }),

  resetPassword: (body: ResetPasswordRequest) =>
    apiClient.post<{ ok: true }>('/auth/reset-password', { body }),

  listSessions: () => apiClient.get<AuthSessionListResponse>('/auth/sessions'),

  revokeSession: (id: string) => apiClient.post<void>(`/auth/sessions/${id}/revoke`),

  revokeOtherSessions: () => apiClient.post<void>('/auth/sessions/revoke-others'),

  requestEmailVerification: () => apiClient.post<{ ok: true }>('/auth/verify-email/request'),

  confirmEmailVerification: (code: string) =>
    apiClient.post<{ ok: true }>('/auth/verify-email/confirm', { body: { code } }),

  requestEmailChange: (body: { newEmail: string }) =>
    apiClient.post<{ ok: true }>('/auth/change-email/request', { body }),

  confirmEmailChange: (body: { code: string }) =>
    apiClient.post<CurrentUserResponse>('/auth/change-email/confirm', { body }),

  requestInAppPasswordReset: () => apiClient.post<{ ok: true }>('/auth/security/email-reset/request'),

  confirmInAppPasswordReset: (body: {
    code: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }) => apiClient.post<{ ok: true }>('/auth/security/email-reset/confirm', { body }),

  async deleteOwnAccount(body: DeleteAccountRequest): Promise<void> {
    await apiClient.delete('/me/account', { body });
  },

  async deleteBusinessAccount(body: {
    password: string;
    confirmation: 'DELETE MY BUSINESS';
    reasonCode: DeleteAccountRequest['reasonCode'];
    reasonDetail?: string;
  }): Promise<void> {
    await apiClient.delete('/me/business-account', { body });
  },

  async listDeletions(signal?: AbortSignal) {
    const { items } = await apiClient.get<AccountDeletionListResponse>(
      '/platform/account-deletions',
      { signal },
    );
    return items;
  },
};
