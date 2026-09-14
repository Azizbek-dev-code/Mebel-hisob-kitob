import { ApiError } from '../utils/api-error.js';
import { describe, expect, it } from 'vitest';

import { assertScopedBillingProofKey } from './billing-proof.js';

describe('assertScopedBillingProofKey', () => {
  it('accepts keys under the store or workspace prefix', () => {
    expect(
      assertScopedBillingProofKey(
        'billing-proofs/store/store_a/receipt.jpg',
        'billing-proofs/store/store_a',
      ),
    ).toBe('billing-proofs/store/store_a/receipt.jpg');
  });

  it('rejects another tenant folder and path traversal', () => {
    expect(() =>
      assertScopedBillingProofKey(
        'billing-proofs/store/store_b/receipt.jpg',
        'billing-proofs/store/store_a',
      ),
    ).toThrow(ApiError);
    expect(() =>
      assertScopedBillingProofKey(
        'billing-proofs/store/store_a/../store_b/x.jpg',
        'billing-proofs/store/store_a',
      ),
    ).toThrow(ApiError);
  });
});
