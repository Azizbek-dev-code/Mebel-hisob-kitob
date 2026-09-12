/**
 * Idempotent backfill for operational worker fees.
 *
 * Usage:
 *   npx tsx scripts/backfill-worker-operational-fees.ts --dry-run
 *   npx tsx scripts/backfill-worker-operational-fees.ts --apply
 *
 * Never creates duplicates. Never modifies existing transactions.
 */
import { disconnectDatabase } from '../src/lib/prisma.js';
import { runOperationalFeeBackfill } from '../src/services/worker-operational-fees-backfill.service.js';

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run') || !apply;
  if (apply && argv.includes('--dry-run')) {
    throw new Error('Use either --dry-run or --apply, not both');
  }
  return { apply, dryRun };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const result = await runOperationalFeeBackfill({ apply });
  console.log(`[backfill-worker-operational-fees] mode=${result.mode}`);
  if (result.mode === 'DRY-RUN') {
    console.log(`  would backfill ${result.candidates} missing fee(s)`);
  }
  console.log(JSON.stringify(result, null, 2));
  console.log('BACKFILL_WORKER_OPERATIONAL_FEES_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
