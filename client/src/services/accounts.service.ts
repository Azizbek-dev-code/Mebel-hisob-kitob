import type {
  AccountListResponse,
  CreateAuthenticatedBusinessRequestBody,
  CreateStoreRequestResponse,
  LoginResponse,
  SwitchWorkspaceRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const accountsService = {
  list(signal?: AbortSignal) {
    return apiClient.get<AccountListResponse>('/accounts', { signal });
  },
  switch(body: SwitchWorkspaceRequest) {
    return apiClient.post<LoginResponse>('/accounts/switch', { body });
  },
  createBusinessRequest(body: CreateAuthenticatedBusinessRequestBody) {
    return apiClient.post<CreateStoreRequestResponse>('/accounts/business-requests', { body });
  },
};
