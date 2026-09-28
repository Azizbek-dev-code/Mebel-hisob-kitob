import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

describe('apiClient abort handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rethrows AbortError instead of wrapping it as NETWORK_ERROR', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw abortError;
      }),
    );

    await expect(apiClient.get('/onboarding/catalog', { signal: AbortSignal.abort() })).rejects.toBe(
      abortError,
    );
  });
});
