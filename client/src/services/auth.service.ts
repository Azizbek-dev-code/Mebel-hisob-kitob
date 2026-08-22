import type { CurrentUserResponse, LoginRequest, LoginResponse } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * The session token itself never appears here: it lives in an HTTP-only cookie
 * the browser attaches automatically, so there is nothing for the client to hold.
 */
export const authService = {
  login: (credentials: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', { body: credentials }),

  currentUser: () => apiClient.get<CurrentUserResponse>('/auth/me'),

  logout: () => apiClient.post<void>('/auth/logout'),
};
