import type {
  SendFriendRequestBody,
  UpdateGrowthSocialPrivacyRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthFriendsService } from '@/services/personal-growth-friends.service';

export const personalGrowthFriendsKeys = {
  all: ['personal', 'growth', 'friends'] as const,
  list: () => [...personalGrowthFriendsKeys.all, 'list'] as const,
  privacy: () => [...personalGrowthFriendsKeys.all, 'privacy'] as const,
  search: (q: string) => [...personalGrowthFriendsKeys.all, 'search', q] as const,
};

function invalidateFriends(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthFriendsKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'growth', 'achievements'] });
}

export function useGrowthFriends() {
  return useQuery({
    queryKey: personalGrowthFriendsKeys.list(),
    queryFn: ({ signal }) => personalGrowthFriendsService.list(signal),
  });
}

export function useGrowthFriendsPrivacy() {
  return useQuery({
    queryKey: personalGrowthFriendsKeys.privacy(),
    queryFn: async ({ signal }) => {
      const data = await personalGrowthFriendsService.privacy(signal);
      return data.privacy;
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendFriendRequestBody) => personalGrowthFriendsService.request(body),
    onSuccess: () => invalidateFriends(queryClient),
  });
}

export function useAcceptFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthFriendsService.accept(id),
    onSuccess: () => invalidateFriends(queryClient),
  });
}

export function useDeclineFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthFriendsService.decline(id),
    onSuccess: () => invalidateFriends(queryClient),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthFriendsService.remove(id),
    onSuccess: () => invalidateFriends(queryClient),
  });
}

export function useUpdateFriendsPrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGrowthSocialPrivacyRequest) =>
      personalGrowthFriendsService.updatePrivacy(body),
    onSuccess: () => invalidateFriends(queryClient),
  });
}
