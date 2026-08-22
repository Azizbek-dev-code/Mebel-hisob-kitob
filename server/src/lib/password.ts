import bcrypt from 'bcryptjs';

/**
 * Kept in step with `prisma/seed.ts`. Twelve rounds costs a few hundred
 * milliseconds per attempt, which is unnoticeable on a login form and expensive
 * enough to make an offline attack on a leaked hash impractical.
 */
export const PASSWORD_SALT_ROUNDS = 12;

/**
 * A digest of a value no caller can ever supply.
 *
 * When an identifier matches no account there is nothing to compare against, so
 * the request would return in about a millisecond while a wrong password takes
 * a few hundred. That difference is enough to enumerate which accounts exist,
 * so the login path compares against this instead and pays the same cost.
 */
const UNMATCHABLE_HASH = bcrypt.hashSync(
  'furniture-erp::no-account-matches-this-identifier',
  PASSWORD_SALT_ROUNDS,
);

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, PASSWORD_SALT_ROUNDS);
}

export function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/** Spends the same time a real verification would, then discards the result. */
export async function equaliseVerificationCost(plainText: string): Promise<void> {
  await bcrypt.compare(plainText, UNMATCHABLE_HASH);
}
