import { ApiError } from '../utils/api-error.js';

/**
 * Payment proofs must belong to the caller's store/workspace upload folder.
 * Rejects client-supplied URLs/keys that point at another tenant or leave the prefix.
 */
export function assertScopedBillingProofKey(
  proofKey: string,
  expectedPrefix: string,
): string {
  const key = proofKey.trim().replace(/\\/g, '/');
  const prefix = expectedPrefix.trim().replace(/\/+$/, '');
  if (!prefix || key.includes('..') || key.includes('\\')) {
    throw ApiError.validation('To‘lov cheki noto‘g‘ri', [
      { field: 'proofKey', message: 'Chek kaliti noto‘g‘ri' },
    ]);
  }
  if (!key.startsWith(`${prefix}/`) || key.length <= prefix.length + 1) {
    throw ApiError.validation('To‘lov chekini qayta yuklang', [
      { field: 'proofKey', message: 'Chek bu hisobga tegishli emas' },
    ]);
  }
  return key;
}
