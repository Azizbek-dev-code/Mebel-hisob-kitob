import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

describe('mutationErrorMessage', () => {
  it('uses the Uzbek network message for NETWORK_ERROR', () => {
    const error = new ApiClientError(
      0,
      'NETWORK_ERROR',
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
    expect(mutationErrorMessage(error)).toBe(
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
  });

  it('prefers the API message for 4xx errors', () => {
    const error = new ApiClientError(400, 'BAD_REQUEST', 'Insufficient stock');
    expect(mutationErrorMessage(error)).toBe('Insufficient stock');
  });

  it('falls back for unknown errors', () => {
    expect(mutationErrorMessage({})).toBe(
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
  });
});
