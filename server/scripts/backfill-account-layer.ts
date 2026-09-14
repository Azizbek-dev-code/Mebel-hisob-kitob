/**
 * Idempotent Identity + Workspace backfill for existing Store/User rows.
 *
 * Usage: npx tsx scripts/backfill-account-layer.ts  (from the server package)
 */
import { backfillAccountLayer } from '../src/modules/accounts/account-layer.service.js';
import { prisma } from '../src/lib/prisma.js';

async function main(): Promise<void> {
  const result = await backfillAccountLayer(prisma);
  console.log('Account layer backfill complete', result);
}

main()
  .catch((error: unknown) => {
    console.error('Account layer backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
