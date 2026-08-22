import type {
  BackupJobResponse,
  BackupJobSummary,
  BackupListResponse,
  CreateBackupRequest,
  RestoreBackupResponse,
} from '@furniture-erp/shared';

import { apiClient, apiUrl } from '@/lib/api-client';

export const backupsService = {
  async list(signal?: AbortSignal): Promise<BackupJobSummary[]> {
    const { backups } = await apiClient.get<BackupListResponse>('/backups', { signal });
    return backups;
  },

  async create(body: CreateBackupRequest = {}): Promise<BackupJobSummary> {
    const { backup } = await apiClient.post<BackupJobResponse>('/backups', { body });
    return backup;
  },

  async get(id: string, signal?: AbortSignal): Promise<BackupJobSummary> {
    const { backup } = await apiClient.get<BackupJobResponse>(`/backups/${id}`, { signal });
    return backup;
  },

  /**
   * The download is a plain authenticated link rather than a fetch: the
   * response is a gzip attachment, not the JSON envelope, and letting the
   * browser handle it keeps the file off the JS heap.
   */
  downloadUrl(id: string): string {
    return apiUrl(`/backups/${id}/download`);
  },

  async restore(file: File, confirmation: string): Promise<RestoreBackupResponse> {
    const body = new FormData();
    body.append('file', file);
    body.append('confirmation', confirmation);
    return apiClient.post<RestoreBackupResponse>('/backups/restore', { body });
  },
};
