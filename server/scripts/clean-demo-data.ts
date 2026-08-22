/**
 * Wipe local demo / E2E / test data so the database is a production-like empty
 * platform: PLATFORM_ADMIN only, no tenant stores, no business rows.
 *
 * Safety (always enforced):
 * - Aborts when NODE_ENV === 'production'
 * - Requires an explicit confirm: interactive "yes", `--yes`,
 *   `--i-understand-dev-only`, or ALLOW_DEMO_CLEANUP=true
 * - Aborts when DATABASE_URL looks like a hosted production DB unless
 *   FORCE_DEMO_CLEANUP=true
 *
 * Usage:
 *   npm run db:clear-demo
 *   npm run db:clean-demo -- --yes
 *   ALLOW_DEMO_CLEANUP=true npm run db:clean-demo
 *
 * Does not touch `_prisma_migrations`, SubscriptionPlan catalogue, or
 * PlatformSettings. PLATFORM_ADMIN (`platform` / env seed email) is kept.
 * A technical host Store row remains because User.storeId is required; it is
 * not a tenant shop (no store ADMIN) and is hidden from the platform directory.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient, UserRole } from '@prisma/client';
import { config as loadDotenv } from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

const CONFIRM_FLAGS = ['--yes', '--i-understand-dev-only'] as const;
const CONFIRM_PROMPT = 'THIS WILL DELETE ALL DEMO DATA. Continue? yes/no';

const REMOTE_HOST_MARKERS = [
  'render.com',
  'railway',
  'neon.tech',
  'supabase',
  'amazonaws.com',
  'azure.com',
  'digitalocean',
] as const;

/** Children-before-parents. Tenant stores and non-platform users deleted after. */
const WIPE_DELEGATES = [
  'workerActivity',
  'workerCompensationRule',
  'workerFinancialTransaction',
  'stockMovement',
  'expense',
  'expenseCategory',
  'assemblyTask',
  'payment',
  'installmentPayment',
  'installmentPlan',
  'saleWorkerCompensation',
  'saleItem',
  'sale',
  'supplierPayment',
  'purchaseItem',
  'purchase',
  'supplier',
  'customer',
  'product',
  'productCategory',
  'platformInvoice',
  'subscriptionRequest',
  'storeSubscription',
  'platformExpense',
  'backupJob',
  'auditLog',
  'storeCreationRequest',
] as const;

type CountMap = Record<string, number>;

async function collectCounts(): Promise<CountMap> {
  const [
    stores,
    tenantStores,
    users,
    platformAdmins,
    storeAdmins,
    storeCreationRequests,
    products,
    customers,
    sales,
    payments,
    expenses,
    platformInvoices,
    platformExpenses,
    auditLogs,
    backupJobs,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { users: { some: { role: UserRole.ADMIN } } } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.PLATFORM_ADMIN } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.storeCreationRequest.count(),
    prisma.product.count(),
    prisma.customer.count(),
    prisma.sale.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.platformInvoice.count(),
    prisma.platformExpense.count(),
    prisma.auditLog.count(),
    prisma.backupJob.count(),
  ]);

  return {
    stores,
    tenantStores,
    users,
    platformAdmins,
    storeAdmins,
    storeCreationRequests,
    products,
    customers,
    sales,
    payments,
    expenses,
    platformInvoices,
    platformExpenses,
    auditLogs,
    backupJobs,
  };
}

function printCounts(label: string, counts: CountMap): void {
  console.log(`\n${label}`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(28)} ${value}`);
  }
}

function argvHasConfirmFlag(): boolean {
  const blob = `${process.argv.join(' ')} ${process.env.npm_config_argv ?? ''}`;
  if (CONFIRM_FLAGS.some((flag) => blob.includes(flag))) return true;
  try {
    const parsed = JSON.parse(process.env.npm_config_argv ?? '{}') as { original?: string[] };
    return parsed.original?.some((arg) => (CONFIRM_FLAGS as readonly string[]).includes(arg)) ?? false;
  } catch {
    return false;
  }
}

function assertSafety(): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing: NODE_ENV=production — demo cleanup is never allowed in production.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL ?? '';
  const looksRemote = REMOTE_HOST_MARKERS.some((marker) =>
    databaseUrl.toLowerCase().includes(marker),
  );
  if (looksRemote && process.env.FORCE_DEMO_CLEANUP !== 'true') {
    console.error(
      'Refusing: DATABASE_URL looks like a remote/hosted database.\n' +
        '  Set FORCE_DEMO_CLEANUP=true only if you are certain this is a disposable environment.',
    );
    process.exit(1);
  }
}

async function confirmOrExit(): Promise<void> {
  if (process.env.ALLOW_DEMO_CLEANUP === 'true' || argvHasConfirmFlag()) return;

  if (!input.isTTY || !output.isTTY) {
    console.error(
      `Refusing: ${CONFIRM_PROMPT}\n` +
        '  Non-interactive: npm run db:clear-demo -- --yes\n' +
        '  Or: $env:ALLOW_DEMO_CLEANUP="true"; npm run db:clear-demo',
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${CONFIRM_PROMPT} `)).trim().toLowerCase();
    if (answer !== 'yes') {
      console.error('Aborted.');
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

async function wipeBackupFiles(): Promise<number> {
  const candidates = [
    path.resolve(currentDir, '../backups'),
    path.resolve(process.cwd(), 'backups'),
    path.resolve(process.cwd(), 'server/backups'),
  ];
  let removed = 0;

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const name = entry.name.toLowerCase();
      if (!name.endsWith('.json.gz') && !name.endsWith('.sql') && !name.endsWith('.gz')) continue;
      await fs.unlink(full);
      removed += 1;
    }
  }

  for (const dir of [...new Set(candidates)]) {
    await walk(dir);
  }
  return removed;
}

async function findPlatformAdmin() {
  const username = 'platform';
  const email = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform@furniture-erp.local';
  const byUsername = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN, username },
  });
  if (byUsername) return byUsername;
  return prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_ADMIN, email },
  });
}

async function deleteDemoData(): Promise<Record<string, number>> {
  const platformAdmin = await findPlatformAdmin();
  if (!platformAdmin) {
    throw new Error(
      'Refusing: no PLATFORM_ADMIN user found (expected username "platform"). Nothing was deleted.',
    );
  }

  const deleted: Record<string, number> = {};

  for (const delegate of WIPE_DELEGATES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma delegate
    const result = await (prisma as any)[delegate].deleteMany({});
    deleted[delegate] = result.count as number;
  }

  const extraPlatform = await prisma.user.deleteMany({
    where: { role: UserRole.PLATFORM_ADMIN, id: { not: platformAdmin.id } },
  });
  deleted.extraPlatformAdmins = extraPlatform.count;

  const nonPlatform = await prisma.user.findMany({
    where: { id: { not: platformAdmin.id } },
    select: { id: true },
  });
  const nonPlatformIds = nonPlatform.map((user) => user.id);
  if (nonPlatformIds.length > 0) {
    const resp = await prisma.userResponsibility.deleteMany({
      where: { userId: { in: nonPlatformIds } },
    });
    deleted.removedUserResponsibilities = resp.count;
    const users = await prisma.user.deleteMany({ where: { id: { in: nonPlatformIds } } });
    deleted.removedUsers = users.count;
  } else {
    deleted.removedUserResponsibilities = 0;
    deleted.removedUsers = 0;
  }

  const stores = await prisma.store.deleteMany({
    where: { id: { not: platformAdmin.storeId } },
  });
  deleted.removedStores = stores.count;

  await prisma.store.update({
    where: { id: platformAdmin.storeId },
    data: {
      name: 'Platform',
      phone: null,
      address: null,
      isActive: true,
      accessStatus: 'ACTIVE',
    },
  });

  const leftoverResp = await prisma.userResponsibility.deleteMany({
    where: { storeId: platformAdmin.storeId },
  });
  deleted.hostStoreResponsibilities = leftoverResp.count;

  deleted.backupFiles = await wipeBackupFiles();

  return deleted;
}

async function main(): Promise<void> {
  assertSafety();
  await confirmOrExit();

  console.log('Demo data cleanup → empty platform');
  console.log(`  NODE_ENV=${process.env.NODE_ENV ?? '(unset)'}`);

  const before = await collectCounts();
  printCounts('Before:', before);

  console.log('\nDeleting demo / test rows…');
  const deleted = await deleteDemoData();
  for (const [key, value] of Object.entries(deleted)) {
    console.log(`  ${key.padEnd(28)} deleted ${value}`);
  }

  const after = await collectCounts();
  printCounts('After:', after);

  console.log('\nPreserved:');
  console.log('  PLATFORM_ADMIN username=platform');
  console.log('  SubscriptionPlan catalogue (START / PRO / BUSINESS)');
  console.log('  PlatformSettings');
  console.log(`  technical host store (User.storeId FK; tenantStores=${after.tenantStores})`);
  console.log('\nCleanup complete.');
}

main()
  .catch((error: unknown) => {
    console.error('Cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
