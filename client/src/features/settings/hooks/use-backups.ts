import type { CreateBackupRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { backupsService } from '@/services/backups.service';

export const backupKeys = {
  all: ['backups'] as const,
  list: () => [...backupKeys.all, 'list'] as const,
};

export function useBackups(enabled = true) {
  return useQuery({
    queryKey: backupKeys.list(),
    queryFn: ({ signal }) => backupsService.list(signal),
    enabled,
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBackupRequest = {}) => backupsService.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, confirmation }: { file: File; confirmation: string }) =>
      backupsService.restore(file, confirmation),
    onSuccess: () => {
      // A restore rewrites every table, so nothing already fetched can be
      // trusted — drop the whole cache rather than pick invalidations.
      void queryClient.invalidateQueries();
    },
  });
}
