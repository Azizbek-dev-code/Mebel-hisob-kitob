import type { AuthPrincipal, LoginRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api-client';
import { authService } from '@/services/auth.service';

export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
};

/**
 * The single source of truth for "who is signed in".
 *
 * TanStack Query already gives us a cache, a loading state and deduplication
 * across components, so the session needs no separate store or context.
 *
 * A 401 is resolved to `null` rather than thrown: being signed out is the normal
 * state of a visitor, not an error the interface should report.
 */
export function useCurrentUser(): UseQueryResult<AuthPrincipal | null, Error> {
  return useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: async () => {
      try {
        const { user } = await authService.currentUser();
        return user;
      } catch (error) {
        if (error instanceof ApiClientError && error.isUnauthorized) {
          return null;
        }
        throw error;
      }
    },
    // Subscription/feature keys must not stay stale after an admin approve or
    // account switch — a 5-minute cache was causing false "tarifingizda yo‘q"
    // gates while the backend already granted the paid plan.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: ({ user }) => {
      // The login response is the same principal `/auth/me` would return, so
      // seeding the cache here spares the guard an extra round trip.
      queryClient.setQueryData(authQueryKeys.currentUser, user);
      // Drop any previous Personal/Business query cache so contexts never mix.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    // Runs on failure too: if the request did not reach the server the cookie may
    // still be gone, and leaving stale business data on screen is worse than an
    // unnecessary refetch.
    onSettled: () => {
      // Written first, because this is the key the route guards watch: they have
      // to be able to redirect before the screen still on display loses its data.
      queryClient.setQueryData(authQueryKeys.currentUser, null);

      // Everything else — sales, customers, reports — belonged to the session that
      // just ended. `clear()` would be the obvious way to drop it, but it also
      // discards the session entry written above and leaves the guards' mounted
      // observers pointing at a query that no longer exists, so they keep
      // rendering the signed-in view. Removing every other key avoids that.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
}
