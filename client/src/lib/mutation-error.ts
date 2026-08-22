import { ApiClientError } from '@/lib/api-client';

const NETWORK_SAVE_FAILED = "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.";

/**
 * User-facing message for failed mutations. Prefer the API message when present;
 * network / empty 5xx fall back to a clear Uzbek save-failure string.
 */
export function mutationErrorMessage(error: unknown, fallback = NETWORK_SAVE_FAILED): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR' || error.status === 0 || error.status >= 500) {
      return error.message?.trim() || NETWORK_SAVE_FAILED;
    }
    return error.message?.trim() || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
