import type { AccountDeletionListResponse, DeleteAccountRequest } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const accountService = {
  async deleteOwnAccount(body: DeleteAccountRequest): Promise<void> {
    await apiClient.delete('/me/account', { body });
  },

  async listDeletions(signal?: AbortSignal) {
    const { items } = await apiClient.get<AccountDeletionListResponse>(
      '/platform/account-deletions',
      { signal },
    );
    return items;
  },
};
